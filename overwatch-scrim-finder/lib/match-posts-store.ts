import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface StoredMatchPost {
  id: number;
  teamId: number;
  teamName: string;
  managerUsername: string;
  avatarUrl?: string;
  scrimRank: string;
  region: string[];
  tournaments: string[];
  preferredTime: string;
  notes?: string;
  createdAt: string;
}

const dataDirectory = path.join(process.cwd(), "data");
const matchPostsFilePath = path.join(dataDirectory, "match-posts.json");
const ALLOWED_REGION_OPTIONS = ["NA", "SA", "EMEA", "JP", "CN", "APAC"] as const;
const ALLOWED_TOURNAMENT_OPTIONS = ["FSEL", "SEL", "FIL"] as const;

const ensureArrayOfStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

const sanitizeRegions = (value: unknown) =>
  Array.from(
    new Set(
      ensureArrayOfStrings(value)
        .map((entry) => entry.trim())
        .filter((entry) => ALLOWED_REGION_OPTIONS.includes(entry as (typeof ALLOWED_REGION_OPTIONS)[number])),
    ),
  ).slice(0, 6);

const sanitizeTournaments = (value: unknown) =>
  Array.from(
    new Set(
      ensureArrayOfStrings(value)
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => ALLOWED_TOURNAMENT_OPTIONS.includes(entry as (typeof ALLOWED_TOURNAMENT_OPTIONS)[number])),
    ),
  ).slice(0, 3);

const normalizeServerAvatarUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().slice(0, 256);
  if (!trimmed || trimmed.includes("..")) {
    return undefined;
  }

  if (trimmed.startsWith("/uploads/teams/")) {
    return trimmed.replace("/uploads/teams/", "/api/uploads/teams/");
  }

  if (trimmed.startsWith("/api/uploads/teams/")) {
    return trimmed;
  }

  return undefined;
};

const sanitizeMatchPost = (value: unknown): StoredMatchPost | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredMatchPost>;
  if (
    typeof candidate.teamId !== "number" ||
    typeof candidate.teamName !== "string" ||
    typeof candidate.managerUsername !== "string" ||
    typeof candidate.scrimRank !== "string" ||
    typeof candidate.preferredTime !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    teamId: candidate.teamId,
    teamName: candidate.teamName.trim().slice(0, 64),
    managerUsername: candidate.managerUsername.trim().slice(0, 64),
    avatarUrl: normalizeServerAvatarUrl(candidate.avatarUrl),
    scrimRank: candidate.scrimRank.trim().slice(0, 32),
    region: sanitizeRegions(candidate.region),
    tournaments: sanitizeTournaments(candidate.tournaments),
    preferredTime: candidate.preferredTime.trim().slice(0, 120),
    notes:
      typeof candidate.notes === "string" && candidate.notes.trim().length > 0
        ? candidate.notes.trim().slice(0, 400)
        : undefined,
    createdAt: candidate.createdAt,
  };
};

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(matchPostsFilePath, "utf8");
  } catch {
    await writeFile(matchPostsFilePath, "[]", "utf8");
  }
};

const writeMatchPosts = async (posts: StoredMatchPost[]) => {
  await writeFile(matchPostsFilePath, JSON.stringify(posts, null, 2), "utf8");
};

export const readMatchPosts = async (): Promise<StoredMatchPost[]> => {
  await ensureDataFile();
  const content = await readFile(matchPostsFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeMatchPost(entry))
      .filter((entry): entry is StoredMatchPost => entry !== null)
      .sort((leftPost, rightPost) => rightPost.id - leftPost.id);
  } catch {
    return [];
  }
};

export const createMatchPost = async (post: Omit<StoredMatchPost, "id" | "createdAt">): Promise<StoredMatchPost> => {
  const currentPosts = await readMatchPosts();
  const nextPost: StoredMatchPost = {
    ...post,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };

  await writeMatchPosts([nextPost, ...currentPosts]);
  return nextPost;
};

export const getMatchPostById = async (id: number): Promise<StoredMatchPost | null> => {
  const posts = await readMatchPosts();
  return posts.find((post) => post.id === id) || null;
};

export const deleteMatchPost = async (id: number): Promise<boolean> => {
  const posts = await readMatchPosts();
  const nextPosts = posts.filter((post) => post.id !== id);

  if (nextPosts.length === posts.length) {
    return false;
  }

  await writeMatchPosts(nextPosts);
  return true;
};