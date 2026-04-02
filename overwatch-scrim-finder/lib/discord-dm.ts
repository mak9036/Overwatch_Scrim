import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getAccountRecordByUsername } from "@/lib/accounts-store";

const dataDirectory = path.join(process.cwd(), "data");
const dispatchLogPath = path.join(dataDirectory, "discord-dispatch-log.json");

const ensureDispatchLogFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(dispatchLogPath, "utf8");
  } catch {
    await writeFile(dispatchLogPath, "{}", "utf8");
  }
};

const readDispatchLog = async (): Promise<Record<string, string>> => {
  await ensureDispatchLogFile();
  const raw = await readFile(dispatchLogPath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
};

const writeDispatchLog = async (log: Record<string, string>) => {
  await writeFile(dispatchLogPath, JSON.stringify(log, null, 2), "utf8");
};

const createDmChannel = async (botToken: string, discordUserId: string) => {
  const response = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordUserId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not create DM channel (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("Discord DM channel response missing id.");
  }

  return payload.id;
};

const sendDiscordDm = async (botToken: string, discordUserId: string, content: string) => {
  const channelId = await createDmChannel(botToken, discordUserId);
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: content.slice(0, 1800) }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not send DM (${response.status}): ${body}`);
  }
};

const getDmConfigForUsername = async (username: string) => {
  const account = await getAccountRecordByUsername(username);
  const profile = account?.accountProfile;
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() || "";
  const discordUserId = typeof profile?.discordUserId === "string" ? profile.discordUserId.trim() : "";
  const dmEnabled = typeof profile?.discordDmNotifications === "boolean" ? profile.discordDmNotifications : true;

  if (!botToken || !discordUserId || !dmEnabled) {
    return null;
  }

  return { botToken, discordUserId };
};

export const notifyUserWithDiscordDm = async (input: {
  username: string;
  dispatchKey: string;
  content: string;
}) => {
  const safeUsername = input.username.trim();
  const safeDispatchKey = input.dispatchKey.trim();
  const safeContent = input.content.trim();

  if (!safeUsername || !safeDispatchKey || !safeContent) {
    return false;
  }

  const dmConfig = await getDmConfigForUsername(safeUsername);
  if (!dmConfig) {
    return false;
  }

  const dispatchLog = await readDispatchLog();
  if (dispatchLog[safeDispatchKey]) {
    return false;
  }

  await sendDiscordDm(dmConfig.botToken, dmConfig.discordUserId, safeContent);
  dispatchLog[safeDispatchKey] = new Date().toISOString();
  await writeDispatchLog(dispatchLog);
  return true;
};
