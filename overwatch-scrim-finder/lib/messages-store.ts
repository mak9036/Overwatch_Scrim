import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface StoredMessage {
  id: number;
  senderUsername: string;
  recipientUsername: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

const dataDirectory = path.join(process.cwd(), "data");
const messagesFilePath = path.join(dataDirectory, "messages.json");

const normalizeUsername = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeBody = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(messagesFilePath, "utf8");
  } catch {
    await writeFile(messagesFilePath, "[]", "utf8");
  }
};

const sanitizeMessage = (value: unknown): StoredMessage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredMessage>;
  const senderUsername = normalizeUsername(candidate.senderUsername);
  const recipientUsername = normalizeUsername(candidate.recipientUsername);
  const body = normalizeBody(candidate.body).slice(0, 1000);

  if (!senderUsername || !recipientUsername || !body || typeof candidate.createdAt !== "string") {
    return null;
  }

  return {
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    senderUsername,
    recipientUsername,
    body,
    createdAt: candidate.createdAt,
    readAt: typeof candidate.readAt === "string" ? candidate.readAt : undefined,
  };
};

const readMessages = async (): Promise<StoredMessage[]> => {
  await ensureDataFile();
  const content = await readFile(messagesFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeMessage(entry))
      .filter((entry): entry is StoredMessage => entry !== null)
      .sort((leftMessage, rightMessage) => rightMessage.id - leftMessage.id);
  } catch {
    return [];
  }
};

const writeMessages = async (messages: StoredMessage[]) => {
  await writeFile(messagesFilePath, JSON.stringify(messages, null, 2), "utf8");
};

const usernameEquals = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

export const getMessagesForUser = async (username: string) => {
  const safeUsername = normalizeUsername(username);
  if (!safeUsername) {
    return { inbox: [], outbox: [], unreadCount: 0 };
  }

  const messages = await readMessages();
  const inbox = messages.filter((message) => usernameEquals(message.recipientUsername, safeUsername));
  const outbox = messages.filter((message) => usernameEquals(message.senderUsername, safeUsername));
  const unreadCount = inbox.filter((message) => !message.readAt).length;

  return { inbox, outbox, unreadCount };
};

export const sendMessage = async (senderUsername: string, recipientUsername: string, body: string) => {
  const safeSenderUsername = normalizeUsername(senderUsername);
  const safeRecipientUsername = normalizeUsername(recipientUsername);
  const safeBody = normalizeBody(body).slice(0, 1000);

  if (!safeSenderUsername || !safeRecipientUsername || !safeBody) {
    return null;
  }

  const messages = await readMessages();
  const nextMessage: StoredMessage = {
    id: Date.now(),
    senderUsername: safeSenderUsername,
    recipientUsername: safeRecipientUsername,
    body: safeBody,
    createdAt: new Date().toISOString(),
  };

  await writeMessages([nextMessage, ...messages].slice(0, 1000));
  return nextMessage;
};

export const markMessageRead = async (messageId: number, recipientUsername: string) => {
  const safeRecipientUsername = normalizeUsername(recipientUsername);
  if (!safeRecipientUsername || !Number.isFinite(messageId)) {
    return null;
  }

  const messages = await readMessages();
  const index = messages.findIndex((message) => message.id === messageId && usernameEquals(message.recipientUsername, safeRecipientUsername));
  if (index === -1) {
    return null;
  }

  const current = messages[index];
  if (current.readAt) {
    return current;
  }

  const nextMessage: StoredMessage = {
    ...current,
    readAt: new Date().toISOString(),
  };

  const nextMessages = [...messages];
  nextMessages[index] = nextMessage;
  await writeMessages(nextMessages);

  return nextMessage;
};
