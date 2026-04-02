import type { NextRequest } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production.");
  }
  return secret ?? "dev-only-insecure-secret-change-in-production";
};

export const POSTER_SESSION_COOKIE_NAME = "poster_session";

const LEADER_ROLE_OPTIONS = ["Player", "Manager", "Coach"] as const;
const MAIN_ROLE_OPTIONS = ["Tank", "Hitscan", "Flex DPS", "Flex Support", "Main Support"] as const;
const REGION_OPTIONS = ["NA", "SA", "EMEA", "JP", "CN", "APAC"] as const;
const RANK_OPTIONS = ["3000", "3500", "4000", "4500", "open", "adv", "expert", "master", "owcs"] as const;

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export interface PosterGameProfile {
  rank: string;
  eloRange: string;
  region: string[];
  leaderRole: string;
  leaderRoles: string[];
  mainRole: string[];
  topPicks: string[];
}

export interface PosterAccountProfile {
  avatarUrl: string;
  bio: string;
  battleTag: string;
  country: string;
  discordTag: string;
  discordUserId: string;
  discordUsername: string;
  discordLinkedAt: string;
  discordDmNotifications: boolean;
  twitterUrl: string;
  faceitUrl: string;
  proMatches: string[];
}

const DEFAULT_GAME_PROFILE: PosterGameProfile = {
  rank: "",
  eloRange: "",
  region: [],
  leaderRole: "Player",
  leaderRoles: ["Player"],
  mainRole: [],
  topPicks: [],
};

const DEFAULT_ACCOUNT_PROFILE: PosterAccountProfile = {
  avatarUrl: "",
  bio: "",
  battleTag: "",
  country: "",
  discordTag: "",
  discordUserId: "",
  discordUsername: "",
  discordLinkedAt: "",
  discordDmNotifications: true,
  twitterUrl: "",
  faceitUrl: "",
  proMatches: [],
};

export interface StoredAccountPayload {
  username: string;
  passwordHash: string;
  createdAt: string;
  gameProfile?: PosterGameProfile;
  accountProfile?: PosterAccountProfile;
}

export interface PosterAccount {
  username: string;
  createdAt: string;
  gameProfile: PosterGameProfile;
  accountProfile: PosterAccountProfile;
}

const normalizeUsername = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizePassword = (value: unknown) =>
  typeof value === "string" ? value : "";

export const hashPosterPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

// Verifies a plaintext password against a stored hash.
// Supports legacy SHA-256 hashes (64-char hex) to allow seamless migration.
export const verifyPosterPassword = async (storedHash: string, plaintext: string): Promise<boolean> => {
  if (/^[0-9a-f]{64}$/.test(storedHash)) {
    // Legacy SHA-256 path — timing-safe
    const legacyHash = createHash("sha256").update(plaintext).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(storedHash, "utf8"), Buffer.from(legacyHash, "utf8"));
    } catch {
      return false;
    }
  }
  return bcrypt.compare(plaintext, storedHash);
};

const sanitizeMainRoles = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizeMainRole = (entry: string) => {
    if (entry === "FPDS") {
      return "Flex DPS";
    }
    if (entry === "HS") {
      return "Hitscan";
    }
    if (entry === "FS") {
      return "Flex Support";
    }
    if (entry === "MS") {
      return "Main Support";
    }
    return entry;
  };

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => normalizeMainRole(entry.trim()))
        .filter((entry) => MAIN_ROLE_OPTIONS.includes(entry as (typeof MAIN_ROLE_OPTIONS)[number])),
    ),
  ).slice(0, 5);
};

const sanitizeRegions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizeRegion = (entry: string) => {
    if (entry === "KR" || entry === "AS") {
      return "APAC";
    }
    if (entry === "BR") {
      return "SA";
    }
    return entry;
  };

  return Array.from(
    new Set(
      value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .map((entry) => normalizeRegion(entry))
    .filter((entry) => REGION_OPTIONS.includes(entry as (typeof REGION_OPTIONS)[number]))
    ),
  ).slice(0, 6);
};

const sanitizeTopPicks = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 3);
};

const sanitizeLeaderRoles = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => LEADER_ROLE_OPTIONS.includes(entry as (typeof LEADER_ROLE_OPTIONS)[number])),
    ),
  ).slice(0, 3);
};

const getPrimaryLeaderRole = (roles: string[]) => {
  if (roles.includes("Manager")) {
    return "Manager";
  }
  if (roles.includes("Coach")) {
    return "Coach";
  }
  if (roles.includes("Player")) {
    return "Player";
  }
  return DEFAULT_GAME_PROFILE.leaderRole;
};

const isSafeExternalUrl = (raw: string): boolean => {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const PRO_MATCH_ALLOWED_HOSTS = ["liquipedia.net"] as const;

const isAllowedProMatchUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return PRO_MATCH_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
};

const sanitizeProMatchEntry = (entry: string): string => {
  const trimmed = entry.trim().slice(0, 120);
  if (!trimmed) return "";
  const match = trimmed.match(/https?:\/\/\S+/i);
  if (!match) return trimmed;
  const rawUrl = match[0];
  if (isAllowedProMatchUrl(rawUrl)) {
    return trimmed;
  }
  return trimmed.replace(rawUrl, "").replace(/\s{2,}/g, " ").trim();
};

export const sanitizePosterGameProfile = (value: unknown): PosterGameProfile => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_GAME_PROFILE };
  }

  const candidate = value as Record<string, unknown>;
  const rankRaw = normalizeString(candidate.rank);
  const rank = RANK_OPTIONS.includes(rankRaw as (typeof RANK_OPTIONS)[number]) ? rankRaw : "";
  const eloRange = normalizeString(candidate.eloRange).slice(0, 32);
  const leaderRoleRaw = normalizeString(candidate.leaderRole);
  const legacyLeaderRole = LEADER_ROLE_OPTIONS.includes(leaderRoleRaw as (typeof LEADER_ROLE_OPTIONS)[number])
    ? leaderRoleRaw
    : "";
  const leaderRoles = sanitizeLeaderRoles(candidate.leaderRoles);
  const normalizedLeaderRoles = leaderRoles.length > 0
    ? leaderRoles
    : legacyLeaderRole
      ? [legacyLeaderRole]
      : [...DEFAULT_GAME_PROFILE.leaderRoles];
  const leaderRole = getPrimaryLeaderRole(normalizedLeaderRoles);

  return {
    rank,
    eloRange,
    region: sanitizeRegions(candidate.region),
    leaderRole,
    leaderRoles: normalizedLeaderRoles,
    mainRole: sanitizeMainRoles(candidate.mainRole),
    topPicks: sanitizeTopPicks(candidate.topPicks),
  };
};

export const sanitizePosterAccountProfile = (value: unknown): PosterAccountProfile => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_ACCOUNT_PROFILE };
  }

  const candidate = value as Record<string, unknown>;
  const rawAvatarUrl = normalizeString(candidate.avatarUrl).slice(0, 256);
  // Only allow server-controlled upload paths; reject javascript:, data:, etc.
  const avatarUrl = rawAvatarUrl.startsWith("/uploads/") && !rawAvatarUrl.includes("..") ? rawAvatarUrl : "";
  const bio = normalizeString(candidate.bio).slice(0, 280);
  const battleTag = normalizeString(candidate.battleTag).slice(0, 48);
  const countryRaw = normalizeString(candidate.country).toUpperCase();
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : "";
  const discordTag = normalizeString(candidate.discordTag).slice(0, 48);
  const discordUserId = normalizeString(candidate.discordUserId).slice(0, 64);
  const discordUsername = normalizeString(candidate.discordUsername).slice(0, 64);
  const discordLinkedAt = normalizeString(candidate.discordLinkedAt).slice(0, 64);
  const discordDmNotifications = typeof candidate.discordDmNotifications === "boolean"
    ? candidate.discordDmNotifications
    : DEFAULT_ACCOUNT_PROFILE.discordDmNotifications;
  const twitterRaw = normalizeString(candidate.twitterUrl).slice(0, 256);
  const twitterUrl = isSafeExternalUrl(twitterRaw) ? twitterRaw : "";
  const faceitRaw = normalizeString(candidate.faceitUrl).slice(0, 256);
  const faceitUrl = isSafeExternalUrl(faceitRaw) ? faceitRaw : "";
  const proMatches = Array.isArray(candidate.proMatches)
    ? candidate.proMatches
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => sanitizeProMatchEntry(entry))
        .filter((entry) => entry.length > 0)
        .slice(0, 20)
    : [];

  return {
    avatarUrl,
    bio,
    battleTag,
    country,
    discordTag,
    discordUserId,
    discordUsername,
    discordLinkedAt,
    discordDmNotifications,
    twitterUrl,
    faceitUrl,
    proMatches,
  };
};

const encodeAccount = (payload: StoredAccountPayload): string => {
  const data = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
};

const decodeAccount = (value: string) => {
  try {
    // Verify HMAC signature before decoding payload (prevents cookie forgery).
    const lastDot = value.lastIndexOf(".");
    if (lastDot === -1) return null;
    const data = value.slice(0, lastDot);
    const receivedSig = value.slice(lastDot + 1);
    const expectedSig = createHmac("sha256", getSessionSecret()).update(data).digest("base64url");
    if (receivedSig.length !== expectedSig.length) return null;
    if (!timingSafeEqual(Buffer.from(receivedSig, "utf8"), Buffer.from(expectedSig, "utf8"))) return null;

    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as {
      username?: unknown;
      passwordHash?: unknown;
      createdAt?: unknown;
      gameProfile?: unknown;
      accountProfile?: unknown;
    };

    const username = sanitizePosterUsername(parsed.username);
    const passwordHash = typeof parsed.passwordHash === "string" ? parsed.passwordHash : "";
    const createdAt = typeof parsed.createdAt === "string" ? parsed.createdAt : "";
    if (!username || !passwordHash || !createdAt) {
      return null;
    }

    return {
      username,
      passwordHash,
      createdAt,
      gameProfile: sanitizePosterGameProfile(parsed.gameProfile),
      accountProfile: sanitizePosterAccountProfile(parsed.accountProfile),
    } satisfies StoredAccountPayload;
  } catch {
    return null;
  }
};

export const sanitizePosterUsername = (value: unknown) => {
  const normalized = normalizeUsername(value);
  if (normalized.length < 2 || normalized.length > 24) {
    return "";
  }
  return normalized;
};

export const sanitizePosterPassword = (value: unknown) => {
  const normalized = normalizePassword(value);
  if (normalized.length < 6 || normalized.length > 64) {
    return "";
  }
  return normalized;
};

export const makePosterAccountCookieValue = async (
  username: string,
  password: string,
  gameProfile?: PosterGameProfile,
  accountProfile?: PosterAccountProfile,
  createdAt?: string,
): Promise<string> => {
  const normalized = sanitizePosterUsername(username);
  const normalizedPassword = sanitizePosterPassword(password);
  if (!normalized || !normalizedPassword) {
    return "";
  }

  return encodeAccount({
    username: normalized,
    passwordHash: await hashPosterPassword(normalizedPassword),
    createdAt: createdAt || new Date().toISOString(),
    gameProfile: sanitizePosterGameProfile(gameProfile),
    accountProfile: sanitizePosterAccountProfile(accountProfile),
  });
};

export const getStoredPosterAccountFromRequest = (request: NextRequest) => {
  const rawValue = request.cookies.get(POSTER_SESSION_COOKIE_NAME)?.value;
  if (!rawValue) {
    return null;
  }
  return decodeAccount(rawValue);
};

export const getPosterAccountFromRequest = (request: NextRequest) => {
  const stored = getStoredPosterAccountFromRequest(request);
  if (!stored) {
    return null;
  }

  return {
    username: stored.username,
    createdAt: stored.createdAt,
    gameProfile: stored.gameProfile || { ...DEFAULT_GAME_PROFILE },
    accountProfile: stored.accountProfile || { ...DEFAULT_ACCOUNT_PROFILE },
  } satisfies PosterAccount;
};

export const makePosterCookieValueFromStoredAccount = (account: StoredAccountPayload) => {
  return encodeAccount({
    username: account.username,
    passwordHash: account.passwordHash,
    createdAt: account.createdAt,
    gameProfile: sanitizePosterGameProfile(account.gameProfile),
    accountProfile: sanitizePosterAccountProfile(account.accountProfile),
  });
};

export const getPosterUsernameFromRequest = (request: NextRequest) => {
  return getPosterAccountFromRequest(request)?.username || "";
};

export const isPosterRequest = (request: NextRequest) => {
  return Boolean(getPosterUsernameFromRequest(request));
};
