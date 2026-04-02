import { NextResponse } from "next/server";
import {
  POSTER_SESSION_COOKIE_NAME,
  makePosterCookieValueFromStoredAccount,
  sanitizePosterPassword,
  sanitizePosterUsername,
} from "@/lib/account-auth";
import { getAccountRecordByUsername, isAccountPasswordMatch } from "@/lib/accounts-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface LoginPayload {
  username?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const username = sanitizePosterUsername(payload.username);
  const password = sanitizePosterPassword(payload.password);

  if (!username) {
    return NextResponse.json(
      { error: "Enter a valid account name (2-24 characters)." },
      { status: 400 },
    );
  }

  if (!password) {
    return NextResponse.json(
      { error: "Enter a valid password (6-64 characters)." },
      { status: 400 },
    );
  }

  const accountRecord = await getAccountRecordByUsername(username);
  if (!accountRecord) {
    return NextResponse.json({ error: "No account found with that username." }, { status: 404 });
  }

  if (!(await isAccountPasswordMatch(accountRecord, password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const cookieValue = makePosterCookieValueFromStoredAccount(accountRecord);

  const response = NextResponse.json({ ok: true, account: { username: accountRecord.username } });
  response.cookies.set({
    name: POSTER_SESSION_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
