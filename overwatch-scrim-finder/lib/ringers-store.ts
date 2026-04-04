import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import moment from "moment-timezone";

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
  durationHours?: 12 | 24;
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

const isQuarterHourTime = (value: string) => /^([01]\d|2[0-3]):(00|15|30|45)$/.test(value);

const computeExpiryFromAvailability = (
  availableFrom: string | undefined,
  availableUntil: string | undefined,
  preferredTimeZone: string | undefined,
  createdAt: number,
) => {
  if (!availableFrom || !availableUntil || !preferredTimeZone || !moment.tz.zone(preferredTimeZone)) {
    return null;
  }

  const now = moment.tz(createdAt, preferredTimeZone);
  const candidateBaseDates = [
    now.clone().subtract(1, "day"),
    now.clone(),
    now.clone().add(1, "day"),
  ];

  const candidateEnds = candidateBaseDates
    .map((baseDate) => {
      const [fromHour, fromMinute] = availableFrom.split(":").map(Number);
      const [untilHour, untilMinute] = availableUntil.split(":").map(Number);

      const start = baseDate.clone().hour(fromHour).minute(fromMinute).second(0).millisecond(0);
      const end = baseDate.clone().hour(untilHour).minute(untilMinute).second(0).millisecond(0);
      if (!start.isValid() || !end.isValid()) {
        return null;
      }

      if (!end.isAfter(start)) {
        end.add(1, "day");
      }

      return end;
    })
    .filter((entry): entry is moment.Moment => entry !== null)
    .filter((entry) => entry.valueOf() > createdAt)
    .sort((left, right) => left.valueOf() - right.valueOf());

  return candidateEnds[0]?.valueOf() ?? null;
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

  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const availableFrom =
    typeof candidate.availableFrom === "string" && isQuarterHourTime(candidate.availableFrom.trim())
      ? candidate.availableFrom.trim()
      : undefined;
  const availableUntil =
    typeof candidate.availableUntil === "string" && isQuarterHourTime(candidate.availableUntil.trim())
      ? candidate.availableUntil.trim()
      : undefined;
  const preferredTimeZone =
    typeof candidate.preferredTimeZone === "string" && candidate.preferredTimeZone.trim().length > 0
      ? candidate.preferredTimeZone.trim().slice(0, 64)
      : undefined;
  const durationHours = sanitizeDuration(candidate.durationHours);
  const computedExpiry = computeExpiryFromAvailability(availableFrom, availableUntil, preferredTimeZone, createdAt);
  const expiresAt =
    typeof candidate.expiresAt === "number"
      ? candidate.expiresAt
      : computedExpiry ?? createdAt + durationHours * 60 * 60 * 1000;

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
    availableFrom,
    availableUntil,
    preferredTimeZone,
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
  const expiresAt =
    computeExpiryFromAvailability(payload.availableFrom, payload.availableUntil, payload.preferredTimeZone, createdAt) ??
    createdAt + 24 * 60 * 60 * 1000;

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