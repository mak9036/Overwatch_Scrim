import { NextResponse } from "next/server";
import {
  POSTER_SESSION_COOKIE_NAME,
  makePosterCookieValueFromStoredAccount,
  sanitizePosterPassword,
  sanitizePosterUsername,
} from "@/lib/account-auth";
import { createAccountRecord } from "@/lib/accounts-store";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface CreatePayload {
  username?: unknown;
  password?: unknown;
  acceptedLegal?: unknown;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`create:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many account creation attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let payload: CreatePayload;
  try {
    payload = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const username = sanitizePosterUsername(payload.username);
  const password = sanitizePosterPassword(payload.password);
  const acceptedLegal = payload.acceptedLegal === true;

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

  if (!acceptedLegal) {
    return NextResponse.json(
      { error: "You must accept the Terms and Privacy Policy." },
      { status: 400 },
    );
  }

  try {
    const accountRecord = await createAccountRecord(username, password);
    if (!accountRecord) {
      return NextResponse.json(
        { error: "Account already exists or could not be created." },
        { status: 409 },
      );
    }

    const cookieValue = makePosterCookieValueFromStoredAccount(accountRecord);

    const response = NextResponse.json({ ok: true, account: { username } });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Server configuration error: SESSION_SECRET is missing in production." },
        { status: 500 },
      );
    }
    if (message.includes("EROFS") || message.includes("EACCES") || message.includes("EPERM")) {
      return NextResponse.json(
        { error: "Server storage is not writable in this environment." },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Internal server error while creating account." }, { status: 500 });
  }
}
