import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface StoredRingerPost {
  id: number;
  ownerUsername: string;
  mainRole: string[];
  scrimRank: string;
  owRank: string;
  preferredTime?: string;
  availableFrom?: string;
  availableUntil?: string;
  preferredTimeZone?: string;
  durationHours: 12 | 24;
  createdAt: number;
  expiresAt: number;
}

const dataDirectory = path.join(process.cwd(), "data");
const ringersFilePath = path.join(dataDirectory, "ringers.json");

const ensureArrayOfStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
};

const sanitizeDuration = (value: unknown): 12 | 24 => {
  if (value === 12 || value === "12") {
    return 12;
  }
  return 24;
};

const sanitizeRingerPost = (value: unknown): StoredRingerPost | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredRingerPost>;
  if (
    typeof candidate.ownerUsername !== "string" ||
    typeof candidate.scrimRank !== "string" ||
    typeof candidate.owRank !== "string"
  ) {
    return null;
  }

  const durationHours = sanitizeDuration(candidate.durationHours);
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const expiresAt =
    typeof candidate.expiresAt === "number"
      ? candidate.expiresAt
      : createdAt + durationHours * 60 * 60 * 1000;

  return {
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    ownerUsername: candidate.ownerUsername.trim(),
    mainRole: ensureArrayOfStrings(candidate.mainRole).slice(0, 5),
    scrimRank: candidate.scrimRank.trim().slice(0, 32),
    owRank: candidate.owRank.trim().slice(0, 32),
    preferredTime:
      typeof candidate.preferredTime === "string" && candidate.preferredTime.trim().length > 0
        ? candidate.preferredTime.trim().slice(0, 120)
        : undefined,
    availableFrom:
      typeof candidate.availableFrom === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.availableFrom.trim())
        ? candidate.availableFrom.trim()
        : undefined,
    availableUntil:
      typeof candidate.availableUntil === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.availableUntil.trim())
        ? candidate.availableUntil.trim()
        : undefined,
    preferredTimeZone:
      typeof candidate.preferredTimeZone === "string" && candidate.preferredTimeZone.trim().length > 0
        ? candidate.preferredTimeZone.trim().slice(0, 64)
        : undefined,
    durationHours,
    createdAt,
    expiresAt,
  };
};

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(ringersFilePath, "utf8");
  } catch {
    await writeFile(ringersFilePath, "[]", "utf8");
  }
};

const writeRingers = async (ringers: StoredRingerPost[]) => {
  await writeFile(ringersFilePath, JSON.stringify(ringers, null, 2), "utf8");
};

const removeExpiredRingers = async (ringers: StoredRingerPost[]): Promise<StoredRingerPost[]> => {
  const now = Date.now();
  const active = ringers.filter((ringer) => ringer.expiresAt > now);
  if (active.length !== ringers.length) {
    await writeRingers(active);
  }
  return active;
};

export const readRingers = async (): Promise<StoredRingerPost[]> => {
  await ensureDataFile();
  const content = await readFile(ringersFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed
      .map((entry) => sanitizeRingerPost(entry))
      .filter((entry): entry is StoredRingerPost => entry !== null)
      .sort((leftRinger, rightRinger) => rightRinger.createdAt - leftRinger.createdAt);

    return removeExpiredRingers(sanitized);
  } catch {
    return [];
  }
};

export const createRingerPost = async (
  payload: Omit<StoredRingerPost, "id" | "createdAt" | "expiresAt">,
): Promise<StoredRingerPost> => {
  const currentRingers = await readRingers();
  const createdAt = Date.now();
  const expiresAt = createdAt + payload.durationHours * 60 * 60 * 1000;

  const nextRinger: StoredRingerPost = {
    ...payload,
    id: createdAt,
    createdAt,
    expiresAt,
  };

  const updated = [nextRinger, ...currentRingers];
  await writeRingers(updated);
  return nextRinger;
};

export const deleteRingerPost = async (id: number): Promise<boolean> => {
  const currentRingers = await readRingers();
  const updated = currentRingers.filter((ringer) => ringer.id !== id);

  if (updated.length === currentRingers.length) {
    return false;
  }

  await writeRingers(updated);
  return true;
};

export const getRingerPostById = async (id: number): Promise<StoredRingerPost | null> => {
  const ringers = await readRingers();
  return ringers.find((ringer) => ringer.id === id) || null;
};