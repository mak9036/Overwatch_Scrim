import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type ScrimRequestStatus = "pending" | "accepted" | "declined";

export interface StoredScrimRequest {
  id: number;
  requesterManagerUsername: string;
  requesterTeamId: number;
  requesterTeamName: string;
  targetManagerUsername: string;
  targetTeamId: number;
  targetTeamName: string;
  status: ScrimRequestStatus;
  createdAt: string;
  respondedAt?: string;
}

const dataDirectory = path.join(process.cwd(), "data");
const requestsFilePath = path.join(dataDirectory, "scrim-requests.json");

const normalizeUsername = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeTeamName = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 64) : "");

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(requestsFilePath, "utf8");
  } catch {
    await writeFile(requestsFilePath, "[]", "utf8");
  }
};

const sanitizeScrimRequest = (value: unknown): StoredScrimRequest | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredScrimRequest>;
  const requesterManagerUsername = normalizeUsername(candidate.requesterManagerUsername);
  const targetManagerUsername = normalizeUsername(candidate.targetManagerUsername);
  const requesterTeamName = normalizeTeamName(candidate.requesterTeamName);
  const targetTeamName = normalizeTeamName(candidate.targetTeamName);

  if (
    typeof candidate.requesterTeamId !== "number" ||
    typeof candidate.targetTeamId !== "number" ||
    !requesterManagerUsername ||
    !targetManagerUsername ||
    !requesterTeamName ||
    !targetTeamName ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const status =
    candidate.status === "accepted" || candidate.status === "declined" || candidate.status === "pending"
      ? candidate.status
      : "pending";

  return {
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    requesterManagerUsername,
    requesterTeamId: candidate.requesterTeamId,
    requesterTeamName,
    targetManagerUsername,
    targetTeamId: candidate.targetTeamId,
    targetTeamName,
    status,
    createdAt: candidate.createdAt,
    respondedAt: typeof candidate.respondedAt === "string" ? candidate.respondedAt : undefined,
  };
};

const readRequestsUnsafe = async (): Promise<StoredScrimRequest[]> => {
  await ensureDataFile();
  const content = await readFile(requestsFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeScrimRequest(entry))
      .filter((entry): entry is StoredScrimRequest => entry !== null)
      .sort((leftItem, rightItem) => rightItem.id - leftItem.id);
  } catch {
    return [];
  }
};

const writeRequestsUnsafe = async (requests: StoredScrimRequest[]) => {
  await writeFile(requestsFilePath, JSON.stringify(requests, null, 2), "utf8");
};

const usernameEquals = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

export const readScrimRequests = async (): Promise<StoredScrimRequest[]> => {
  return readRequestsUnsafe();
};

export const createScrimRequest = async (input: {
  requesterManagerUsername: string;
  requesterTeamId: number;
  requesterTeamName: string;
  targetManagerUsername: string;
  targetTeamId: number;
  targetTeamName: string;
}): Promise<{ created?: StoredScrimRequest; error?: "duplicate-pending" | "invalid" }> => {
  const requesterManagerUsername = normalizeUsername(input.requesterManagerUsername);
  const targetManagerUsername = normalizeUsername(input.targetManagerUsername);
  const requesterTeamName = normalizeTeamName(input.requesterTeamName);
  const targetTeamName = normalizeTeamName(input.targetTeamName);

  if (
    !requesterManagerUsername ||
    !targetManagerUsername ||
    !requesterTeamName ||
    !targetTeamName ||
    !Number.isFinite(input.requesterTeamId) ||
    !Number.isFinite(input.targetTeamId)
  ) {
    return { error: "invalid" };
  }

  const requests = await readRequestsUnsafe();
  const hasPending = requests.some(
    (request) =>
      request.status === "pending" &&
      request.requesterTeamId === input.requesterTeamId &&
      request.targetTeamId === input.targetTeamId,
  );
  if (hasPending) {
    return { error: "duplicate-pending" };
  }

  const created: StoredScrimRequest = {
    id: Date.now(),
    requesterManagerUsername,
    requesterTeamId: input.requesterTeamId,
    requesterTeamName,
    targetManagerUsername,
    targetTeamId: input.targetTeamId,
    targetTeamName,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await writeRequestsUnsafe([created, ...requests].slice(0, 2000));
  return { created };
};

export const respondToScrimRequest = async (
  requestId: number,
  targetManagerUsername: string,
  action: "accept" | "decline",
): Promise<StoredScrimRequest | null> => {
  if (!Number.isFinite(requestId)) {
    return null;
  }

  const safeTargetManager = normalizeUsername(targetManagerUsername);
  if (!safeTargetManager) {
    return null;
  }

  const requests = await readRequestsUnsafe();
  const index = requests.findIndex((request) => request.id === requestId);
  if (index === -1) {
    return null;
  }

  const current = requests[index];
  if (!usernameEquals(current.targetManagerUsername, safeTargetManager)) {
    return null;
  }

  if (current.status !== "pending") {
    return current;
  }

  const updated: StoredScrimRequest = {
    ...current,
    status: action === "accept" ? "accepted" : "declined",
    respondedAt: new Date().toISOString(),
  };

  const nextRequests = [...requests];
  nextRequests[index] = updated;
  await writeRequestsUnsafe(nextRequests);

  return updated;
};
