const fs = require("fs/promises");
const path = require("path");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const ACCOUNTS_PATH = path.join(DATA_DIR, "accounts.json");
const MESSAGES_PATH = path.join(DATA_DIR, "messages.json");
const TEAMS_PATH = path.join(DATA_DIR, "teams.json");
const DISPATCH_LOG_PATH = path.join(DATA_DIR, "discord-dispatch-log.json");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const POLL_INTERVAL_MS = Number(process.env.DISCORD_NOTIFICATION_POLL_MS || 15000);

const usernameEquals = (left, right) => String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

const ensureFile = async (filePath, defaultContent = "[]") => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, defaultContent, "utf8");
  }
};

const readJsonArray = async (filePath) => {
  await ensureFile(filePath, "[]");
  const raw = await fs.readFile(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readDispatchLog = async () => {
  await ensureFile(DISPATCH_LOG_PATH, "{}");
  const raw = await fs.readFile(DISPATCH_LOG_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
};

const writeDispatchLog = async (log) => {
  await fs.writeFile(DISPATCH_LOG_PATH, JSON.stringify(log, null, 2), "utf8");
};

const createDmChannel = async (discordUserId) => {
  const response = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordUserId }),
  });

  if (!response.ok) {
    throw new Error(`Could not create DM channel (${response.status})`);
  }

  const payload = await response.json();
  if (!payload || typeof payload.id !== "string") {
    throw new Error("Discord DM channel response missing id.");
  }

  return payload.id;
};

const sendDiscordDm = async (discordUserId, content) => {
  const channelId = await createDmChannel(discordUserId);
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: String(content).slice(0, 1800) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not send DM (${response.status}): ${body}`);
  }
};

const buildNotificationsForUser = (username, messages, teams) => {
  const unreadMessages = messages
    .filter((message) => usernameEquals(message.recipientUsername, username) && !message.readAt)
    .slice(0, 20)
    .map((message) => ({
      dedupeKey: `message:${message.id}`,
      content: `📩 New message from ${message.senderUsername}: ${String(message.body || "").slice(0, 300)}`,
    }));

  const inviteNotifications = [];
  for (const team of teams) {
    const invites = Array.isArray(team.invites) ? team.invites : [];
    for (const invite of invites) {
      if (!usernameEquals(invite.username, username)) {
        continue;
      }

      inviteNotifications.push({
        dedupeKey: `invite:${team.id}:${invite.createdAt}:${String(invite.username || "").toLowerCase()}`,
        content: `🎮 Team invite from ${invite.invitedBy} to join ${team.name}. Check your team page to respond.`,
      });
    }
  }

  return [...inviteNotifications, ...unreadMessages];
};

const runOnce = async () => {
  const [accounts, messages, teams, dispatchLog] = await Promise.all([
    readJsonArray(ACCOUNTS_PATH),
    readJsonArray(MESSAGES_PATH),
    readJsonArray(TEAMS_PATH),
    readDispatchLog(),
  ]);

  let dirty = false;

  for (const account of accounts) {
    const username = typeof account?.username === "string" ? account.username : "";
    const profile = account?.accountProfile && typeof account.accountProfile === "object" ? account.accountProfile : {};
    const discordUserId = typeof profile.discordUserId === "string" ? profile.discordUserId.trim() : "";
    const dmEnabled = typeof profile.discordDmNotifications === "boolean" ? profile.discordDmNotifications : true;

    if (!username || !discordUserId || !dmEnabled) {
      continue;
    }

    const notifications = buildNotificationsForUser(username, messages, teams);

    for (const notification of notifications) {
      const dispatchKey = `${username.toLowerCase()}|${notification.dedupeKey}`;
      if (dispatchLog[dispatchKey]) {
        continue;
      }

      try {
        await sendDiscordDm(discordUserId, notification.content);
        dispatchLog[dispatchKey] = new Date().toISOString();
        dirty = true;
        console.log(`[discord-worker] Sent DM -> ${username}: ${notification.dedupeKey}`);
      } catch (error) {
        console.error(`[discord-worker] Failed DM -> ${username}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  if (dirty) {
    await writeDispatchLog(dispatchLog);
  }
};

const start = async () => {
  if (!BOT_TOKEN) {
    console.error("[discord-worker] Missing DISCORD_BOT_TOKEN in environment.");
    process.exit(1);
  }

  console.log(`[discord-worker] Started. Poll interval: ${POLL_INTERVAL_MS}ms`);

  await runOnce();
  setInterval(() => {
    runOnce().catch((error) => {
      console.error("[discord-worker] Poll cycle failed:", error instanceof Error ? error.message : error);
    });
  }, POLL_INTERVAL_MS);
};

start().catch((error) => {
  console.error("[discord-worker] Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});