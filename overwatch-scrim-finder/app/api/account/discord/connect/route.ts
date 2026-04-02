import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getStoredPosterAccountFromRequest } from "@/lib/account-auth";
import { createDiscordOAuthState, getDiscordOAuthConfig } from "@/lib/discord-oauth";

export async function GET(request: NextRequest) {
  const currentAccount = getStoredPosterAccountFromRequest(request);
  if (!currentAccount) {
    const loginUrl = new URL("/account/create", request.url);
    loginUrl.searchParams.set("next", "/account/profile");
    return NextResponse.redirect(loginUrl);
  }

  const config = getDiscordOAuthConfig();
  if (!config.clientId) {
    const profileUrl = new URL("/account/profile", request.url);
    profileUrl.searchParams.set("discord", "config-missing");
    return NextResponse.redirect(profileUrl);
  }

  const redirectUri = config.redirectUri || new URL("/api/account/discord/callback", request.url).toString();

  const state = createDiscordOAuthState(currentAccount.username);
  const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "identify");
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}