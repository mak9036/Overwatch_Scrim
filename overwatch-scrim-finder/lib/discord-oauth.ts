import { createHmac, timingSafeEqual } from "crypto";

const DISCORD_API_BASE = "https://discord.com/api";

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production.");
  }
  return secret ?? "dev-only-insecure-secret-change-in-production";
};

export const getDiscordOAuthConfig = () => {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim() || "";
  const redirectUri = process.env.DISCORD_REDIRECT_URI?.trim() || "";
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() || "";

  return {
    clientId,
    clientSecret,
    redirectUri,
    botToken,
    apiBase: DISCORD_API_BASE,
  };
};

interface DiscordStatePayload {
  username: string;
  exp: number;
}

export const createDiscordOAuthState = (username: string, maxAgeSeconds = 10 * 60) => {
  const payload: DiscordStatePayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(data).digest("base64url");

  return `${data}.${signature}`;
};

export const verifyDiscordOAuthState = (state: string): DiscordStatePayload | null => {
  const separatorIndex = state.lastIndexOf(".");
  if (separatorIndex === -1) {
    return null;
  }

  const data = state.slice(0, separatorIndex);
  const receivedSignature = state.slice(separatorIndex + 1);
  const expectedSignature = createHmac("sha256", getSessionSecret()).update(data).digest("base64url");

  if (receivedSignature.length !== expectedSignature.length) {
    return null;
  }

  try {
    if (!timingSafeEqual(Buffer.from(receivedSignature, "utf8"), Buffer.from(expectedSignature, "utf8"))) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Partial<DiscordStatePayload>;
    if (typeof parsed.username !== "string" || typeof parsed.exp !== "number") {
      return null;
    }

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      username: parsed.username,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
};