import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface StoredTeamMember {
  name: string;
  rank: string;
  role: string;
  mainRole?: string[];
}

export interface StoredPost {
  teamName: string;
  postType?: "account" | "team-lfp";
  eloRange: string;
  owRank?: string;
  region: string[];
  id: number;
  leader: string;
  ownerUsername?: string;
  avatarUrl?: string;
  leaderRole: string;
  mainRole: string[];
  tournaments?: string[];
  members: StoredTeamMember[];
  lookingFor?: string;
  lookingForRoles?: string[];
  topPicks?: string[];
  bgImage?: string;
}

const TOURNAMENT_OPTIONS = ["FSEL", "SEL", "FIL"] as const;
const LFP_ROLE_OPTIONS = ["Tank", "FPDS", "HS", "FS", "MS"] as const;

const sanitizeTournaments = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => TOURNAMENT_OPTIONS.includes(entry as (typeof TOURNAMENT_OPTIONS)[number])),
    ),
  ).slice(0, 3);
};

const sanitizeLfpRoles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => LFP_ROLE_OPTIONS.includes(entry as (typeof LFP_ROLE_OPTIONS)[number])),
    ),
  ).slice(0, 5);
};

const dataDirectory = path.join(process.cwd(), "data");
const postsFilePath = path.join(dataDirectory, "posts.json");

const ensureArrayOfStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => typeof entry === "string");
};

const normalizeServerAssetUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().slice(0, 256);
  if (!trimmed || trimmed.includes("..")) {
    return undefined;
  }

  if (trimmed.startsWith("/uploads/avatars/")) {
    return trimmed.replace("/uploads/avatars/", "/api/uploads/avatars/");
  }

  if (trimmed.startsWith("/uploads/teams/")) {
    return trimmed.replace("/uploads/teams/", "/api/uploads/teams/");
  }

  if (trimmed.startsWith("/api/uploads/")) {
    return trimmed;
  }

  return undefined;
};

const sanitizePost = (value: unknown): StoredPost | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredPost>;
  if (
    typeof candidate.teamName !== "string" ||
    typeof candidate.eloRange !== "string" ||
    typeof candidate.leader !== "string"
  ) {
    return null;
  }

  return {
    teamName: candidate.teamName,
    postType: candidate.postType === "team-lfp" ? "team-lfp" : "account",
    eloRange: candidate.eloRange,
    owRank: typeof candidate.owRank === "string" && candidate.owRank.trim().length > 0 ? candidate.owRank.trim() : undefined,
    region: ensureArrayOfStrings(candidate.region),
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    leader: candidate.leader,
    ownerUsername:
      typeof candidate.ownerUsername === "string" && candidate.ownerUsername.trim().length > 0
        ? candidate.ownerUsername.trim()
        : candidate.leader,
    avatarUrl: normalizeServerAssetUrl(candidate.avatarUrl),
    leaderRole: typeof candidate.leaderRole === "string" ? candidate.leaderRole : "Player",
    mainRole: ensureArrayOfStrings(candidate.mainRole),
    tournaments: sanitizeTournaments(candidate.tournaments),
    members: Array.isArray(candidate.members)
      ? candidate.members
          .filter((member): member is StoredTeamMember => {
            if (!member || typeof member !== "object") {
              return false;
            }
            const memberCandidate = member as Partial<StoredTeamMember>;
            return (
              typeof memberCandidate.name === "string" &&
              typeof memberCandidate.rank === "string" &&
              typeof memberCandidate.role === "string"
            );
          })
          .map((member) => ({
            ...member,
            mainRole: Array.isArray(member.mainRole)
              ? member.mainRole.filter((entry): entry is string => typeof entry === "string").slice(0, 5)
              : undefined,
          }))
      : [],
    lookingFor:
      typeof candidate.lookingFor === "string" && candidate.lookingFor.trim().length > 0
        ? candidate.lookingFor.trim().slice(0, 400)
        : undefined,
    lookingForRoles: sanitizeLfpRoles(candidate.lookingForRoles),
    topPicks: Array.isArray(candidate.topPicks)
      ? candidate.topPicks.filter((entry) => typeof entry === "string").slice(0, 3)
      : undefined,
    bgImage: normalizeServerAssetUrl(candidate.bgImage),
  };
};

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(postsFilePath, "utf8");
  } catch {
    await writeFile(postsFilePath, "[]", "utf8");
  }
};

export const readPosts = async (): Promise<StoredPost[]> => {
  await ensureDataFile();
  const content = await readFile(postsFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => sanitizePost(entry))
      .filter((entry): entry is StoredPost => entry !== null)
      .sort((leftPost, rightPost) => rightPost.id - leftPost.id);
  } catch {
    return [];
  }
};

export const createPost = async (post: Omit<StoredPost, "id">): Promise<StoredPost> => {
  const currentPosts = await readPosts();
  const nextPost: StoredPost = {
    ...post,
    id: Date.now(),
  };

  const updatedPosts = [nextPost, ...currentPosts];
  await writeFile(postsFilePath, JSON.stringify(updatedPosts, null, 2), "utf8");
  return nextPost;
};

export const upsertLatestTeamPostForOwner = async (
  ownerUsername: string,
  post: Omit<StoredPost, "id" | "ownerUsername" | "postType">,
): Promise<StoredPost> => {
  const normalizedOwner = ownerUsername.trim().toLowerCase();
  const currentPosts = await readPosts();

  const filteredPosts = currentPosts.filter(
    (entry) =>
      !(
        (entry.ownerUsername || entry.leader).trim().toLowerCase() === normalizedOwner &&
        (entry.postType || "account") === "team-lfp"
      ),
  );

  const nextPost: StoredPost = {
    ...post,
    id: Date.now(),
    ownerUsername,
    postType: "team-lfp",
  };

  await writeFile(postsFilePath, JSON.stringify([nextPost, ...filteredPosts], null, 2), "utf8");
  return nextPost;
};

export const updatePost = async (
  id: number,
  updates: Partial<Omit<StoredPost, "id">>,
): Promise<StoredPost | null> => {
  const currentPosts = await readPosts();
  const index = currentPosts.findIndex((post) => post.id === id);

  if (index === -1) {
    return null;
  }

  const existingPost = currentPosts[index];
  const nextPost: StoredPost = {
    ...existingPost,
    ...updates,
    id: existingPost.id,
  };

  const updatedPosts = [...currentPosts];
  updatedPosts[index] = nextPost;
  await writeFile(postsFilePath, JSON.stringify(updatedPosts, null, 2), "utf8");

  return nextPost;
};

export const deletePost = async (id: number): Promise<boolean> => {
  const currentPosts = await readPosts();
  const updatedPosts = currentPosts.filter((post) => post.id !== id);

  if (updatedPosts.length === currentPosts.length) {
    return false;
  }

  await writeFile(postsFilePath, JSON.stringify(updatedPosts, null, 2), "utf8");
  return true;
};

export const getPostById = async (id: number): Promise<StoredPost | null> => {
  const currentPosts = await readPosts();
  return currentPosts.find((post) => post.id === id) || null;
};

export const isPostOwnedByUsername = (post: StoredPost, username: string) => {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) {
    return false;
  }
  return (post.ownerUsername || post.leader).trim().toLowerCase() === normalizedUsername;
};
