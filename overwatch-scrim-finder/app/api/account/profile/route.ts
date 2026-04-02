import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  POSTER_SESSION_COOKIE_NAME,
  getPosterAccountFromRequest,
  getStoredPosterAccountFromRequest,
  makePosterCookieValueFromStoredAccount,
  sanitizePosterAccountProfile,
  sanitizePosterGameProfile,
} from "@/lib/account-auth";
import { updateAccountRecordByUsername } from "@/lib/accounts-store";

interface UpdateProfilePayload {
  avatarUrl?: unknown;
  bio?: unknown;
  battleTag?: unknown;
  country?: unknown;
  discordTag?: unknown;
  discordDmNotifications?: unknown;
  twitterUrl?: unknown;
  faceitUrl?: unknown;
  proMatches?: unknown;
  rank?: unknown;
  eloRange?: unknown;
  leaderRole?: unknown;
  leaderRoles?: unknown;
  mainRole?: unknown;
  topPicks?: unknown;
}

export async function GET(request: NextRequest) {
  const account = getPosterAccountFromRequest(request);
  if (!account) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, account });
}

export async function PATCH(request: NextRequest) {
  const currentStoredAccount = getStoredPosterAccountFromRequest(request);
  const currentAccount = getPosterAccountFromRequest(request);
  if (!currentStoredAccount || !currentAccount) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as UpdateProfilePayload;

  const gameProfile = sanitizePosterGameProfile({
    ...(currentStoredAccount.gameProfile || {}),
    ...payload,
  });
  const accountProfile = sanitizePosterAccountProfile({
    ...(currentStoredAccount.accountProfile || {}),
    ...payload,
  });

  const cookieValue = makePosterCookieValueFromStoredAccount({
    ...currentStoredAccount,
    gameProfile,
    accountProfile,
  });
  if (!cookieValue) {
    return NextResponse.json({ error: "Could not update profile." }, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    account: {
      username: currentAccount.username,
      gameProfile,
      accountProfile,
    },
  });
  response.cookies.set({
    name: POSTER_SESSION_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await updateAccountRecordByUsername(currentAccount.username, {
    gameProfile,
    accountProfile,
  });

  return response;
}
