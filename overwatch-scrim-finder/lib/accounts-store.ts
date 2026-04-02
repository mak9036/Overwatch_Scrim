import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  hashPosterPassword,
  verifyPosterPassword,
  sanitizePosterAccountProfile,
  sanitizePosterGameProfile,
  sanitizePosterUsername,
  type PosterAccountProfile,
  type PosterGameProfile,
  type StoredAccountPayload,
} from "@/lib/account-auth";

const dataDirectory = path.join(process.cwd(), "data");
const accountsFilePath = path.join(dataDirectory, "accounts.json");

const sanitizeStoredAccount = (value: unknown): StoredAccountPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredAccountPayload>;
  if (
    typeof candidate.username !== "string" ||
    typeof candidate.passwordHash !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const username = sanitizePosterUsername(candidate.username);
  if (!username) {
    return null;
  }

  return {
    username,
    passwordHash: candidate.passwordHash,
    createdAt: candidate.createdAt,
    gameProfile: sanitizePosterGameProfile(candidate.gameProfile),
    accountProfile: sanitizePosterAccountProfile(candidate.accountProfile),
  };
};

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(accountsFilePath, "utf8");
  } catch {
    await writeFile(accountsFilePath, "[]", "utf8");
  }
};

const readAccounts = async (): Promise<StoredAccountPayload[]> => {
  await ensureDataFile();
  const content = await readFile(accountsFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => sanitizeStoredAccount(entry))
      .filter((entry): entry is StoredAccountPayload => entry !== null);
  } catch {
    return [];
  }
};

const writeAccounts = async (accounts: StoredAccountPayload[]) => {
  await writeFile(accountsFilePath, JSON.stringify(accounts, null, 2), "utf8");
};

const usernameEquals = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

export const createAccountRecord = async (username: string, password: string) => {
  const safeUsername = sanitizePosterUsername(username);
  if (!safeUsername) {
    return null;
  }

  const accounts = await readAccounts();
  if (accounts.some((account) => usernameEquals(account.username, safeUsername))) {
    return null;
  }

  const nextAccount: StoredAccountPayload = {
    username: safeUsername,
    passwordHash: await hashPosterPassword(password),
    createdAt: new Date().toISOString(),
    gameProfile: sanitizePosterGameProfile(undefined),
    accountProfile: sanitizePosterAccountProfile(undefined),
  };

  await writeAccounts([...accounts, nextAccount]);
  return nextAccount;
};

export const getAccountRecordByCredentials = async (username: string, password: string) => {
  const safeUsername = sanitizePosterUsername(username);
  if (!safeUsername) {
    return null;
  }

  const accounts = await readAccounts();
  const account = accounts.find((entry) => usernameEquals(entry.username, safeUsername));
  if (!account) {
    return null;
  }

  if (!(await verifyPosterPassword(account.passwordHash, password))) {
    return null;
  }

  return account;
};

export const getAccountRecordByUsername = async (username: string) => {
  const safeUsername = sanitizePosterUsername(username);
  if (!safeUsername) {
    return null;
  }

  const accounts = await readAccounts();
  return accounts.find((entry) => usernameEquals(entry.username, safeUsername)) || null;
};

export const getAccountRecordByDiscordUserId = async (discordUserId: string) => {
  const safeDiscordUserId = typeof discordUserId === "string" ? discordUserId.trim() : "";
  if (!safeDiscordUserId) {
    return null;
  }

  const accounts = await readAccounts();
  return (
    accounts.find(
      (entry) =>
        typeof entry.accountProfile?.discordUserId === "string" &&
        entry.accountProfile.discordUserId.trim() === safeDiscordUserId,
    ) || null
  );
};

export const listAccountRecords = async () => {
  return readAccounts();
};

export const isAccountPasswordMatch = async (account: StoredAccountPayload, password: string): Promise<boolean> => {
  return verifyPosterPassword(account.passwordHash, password);
};

export const updateAccountRecordByUsername = async (
  username: string,
  updates: {
    gameProfile?: PosterGameProfile;
    accountProfile?: PosterAccountProfile;
  },
) => {
  const safeUsername = sanitizePosterUsername(username);
  if (!safeUsername) {
    return null;
  }

  const accounts = await readAccounts();
  const index = accounts.findIndex((entry) => usernameEquals(entry.username, safeUsername));
  if (index === -1) {
    return null;
  }

  const current = accounts[index];
  const next: StoredAccountPayload = {
    ...current,
    gameProfile:
      updates.gameProfile !== undefined
        ? sanitizePosterGameProfile(updates.gameProfile)
        : sanitizePosterGameProfile(current.gameProfile),
    accountProfile:
      updates.accountProfile !== undefined
        ? sanitizePosterAccountProfile(updates.accountProfile)
        : sanitizePosterAccountProfile(current.accountProfile),
  };

  const nextAccounts = [...accounts];
  nextAccounts[index] = next;
  await writeAccounts(nextAccounts);

  return next;
};
