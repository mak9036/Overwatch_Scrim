import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

const getAdminPassword = () => process.env.ADMIN_PANEL_PASSWORD || "";
const getSessionSecret = () => process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-in-production";

const passwordFingerprint = (password: string) => createHmac("sha256", getSessionSecret()).update(password).digest("hex");

const sign = (data: string) => createHmac("sha256", getSessionSecret()).update(data).digest("base64url");

const makeSessionToken = (password: string) => {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
    fp: passwordFingerprint(password),
  };
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(data);
  return `${data}.${sig}`;
};

export const isAdminPasswordValid = (password: string) => {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(password, "utf8"), Buffer.from(configuredPassword, "utf8"));
  } catch {
    return false;
  }
};

export const getAdminSessionToken = () => {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return "";
  }
  return makeSessionToken(configuredPassword);
};

export const isAdminSessionTokenValid = (token: string | undefined) => {
  if (!token) {
    return false;
  }
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return false;
  }

  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return false;

    const data = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expectedSig = sign(data);
    if (sig.length !== expectedSig.length) return false;
    if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expectedSig, "utf8"))) return false;

    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as {
      exp?: unknown;
      fp?: unknown;
    };

    if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) return false;
    if (typeof parsed.fp !== "string") return false;

    const expectedFp = passwordFingerprint(configuredPassword);
    if (parsed.fp.length !== expectedFp.length) return false;
    return timingSafeEqual(Buffer.from(parsed.fp, "utf8"), Buffer.from(expectedFp, "utf8"));
  } catch {
    return false;
  }
};

export const isAdminRequest = (request: NextRequest) => {
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return isAdminSessionTokenValid(sessionToken);
};
