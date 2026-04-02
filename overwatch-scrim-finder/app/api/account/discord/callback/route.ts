import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  POSTER_SESSION_COOKIE_NAME,
  getPosterAccountFromRequest,
  getStoredPosterAccountFromRequest,
  makePosterCookieValueFromStoredAccount,
  sanitizePosterAccountProfile,
} from "@/lib/account-auth";
import { updateAccountRecordByUsername } from "@/lib/accounts-store";
import { getDiscordOAuthConfig, verifyDiscordOAuthState } from "@/lib/discord-oauth";

interface DiscordTokenResponse {
  access_token?: string;
}

interface DiscordUserResponse {
  id?: string;
  username?: string;
  discriminator?: string;
  global_name?: string;
}

const profileRedirectWithStatus = (request: NextRequest, status: string) => {
  const profileUrl = new URL("/account/profile", request.url);
  profileUrl.searchParams.set("discord", status);
  return NextResponse.redirect(profileUrl);
};

export async function GET(request: NextRequest) {
  const currentStoredAccount = getStoredPosterAccountFromRequest(request);
  const currentAccount = getPosterAccountFromRequest(request);
  if (!currentStoredAccount || !currentAccount) {
    return profileRedirectWithStatus(request, "not-logged-in");
  }

  const state = request.nextUrl.searchParams.get("state") || "";
  const code = request.nextUrl.searchParams.get("code") || "";
  const oauthError = request.nextUrl.searchParams.get("error") || "";

  if (oauthError) {
    return profileRedirectWithStatus(request, "cancelled");
  }

  const parsedState = verifyDiscordOAuthState(state);
  if (!parsedState || parsedState.username.toLowerCase() !== currentAccount.username.toLowerCase()) {
    return profileRedirectWithStatus(request, "invalid-state");
  }

  if (!code) {
    return profileRedirectWithStatus(request, "missing-code");
  }

  const config = getDiscordOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    return profileRedirectWithStatus(request, "config-missing");
  }

  const redirectUri = config.redirectUri || new URL("/api/account/discord/callback", request.url).toString();

  const tokenResponse = await fetch(`${config.apiBase}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return profileRedirectWithStatus(request, "token-failed");
  }

  const tokenPayload = (await tokenResponse.json()) as DiscordTokenResponse;
  if (!tokenPayload.access_token) {
    return profileRedirectWithStatus(request, "token-missing");
  }

  const userResponse = await fetch(`${config.apiBase}/users/@me`, {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
    cache: "no-store",
  });

  if (!userResponse.ok) {
    return profileRedirectWithStatus(request, "user-fetch-failed");
  }

  const discordUser = (await userResponse.json()) as DiscordUserResponse;
  const discordUserId = typeof discordUser.id === "string" ? discordUser.id : "";
  if (!discordUserId) {
    return profileRedirectWithStatus(request, "user-id-missing");
  }

  const accountUsername = typeof discordUser.username === "string"
    ? discordUser.username.trim()
    : "";
  const discriminator = typeof discordUser.discriminator === "string" ? discordUser.discriminator.trim() : "";
  const normalizedDiscordTag = accountUsername
    ? discriminator && discriminator !== "0"
      ? `${accountUsername}#${discriminator}`
      : accountUsername
    : "";

  const accountProfile = sanitizePosterAccountProfile({
    ...currentStoredAccount.accountProfile,
    discordTag: normalizedDiscordTag,
    discordUserId,
    discordUsername: normalizedDiscordTag,
    discordLinkedAt: new Date().toISOString(),
    discordDmNotifications: true,
  });

  await updateAccountRecordByUsername(currentAccount.username, {
    gameProfile: currentStoredAccount.gameProfile,
    accountProfile,
  });

  const cookieValue = makePosterCookieValueFromStoredAccount({
    ...currentStoredAccount,
    accountProfile,
  });

  const response = profileRedirectWithStatus(request, "connected");
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