import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest } from "@/lib/account-auth";
import { getAccountRecordByUsername } from "@/lib/accounts-store";
import { notifyUserWithDiscordDm } from "@/lib/discord-dm";
import { getTeamForUser, getTeamManagedBy, inviteUserToTeam } from "@/lib/teams-store";

interface InvitePayload {
  username?: unknown;
}

export async function POST(request: NextRequest) {
  const account = getPosterAccountFromRequest(request);
  const managerUsername = account?.username || "";
  if (!managerUsername) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  if (account?.gameProfile?.leaderRole !== "Manager") {
    return NextResponse.json({ error: "Only managers can invite players." }, { status: 403 });
  }

  const team = await getTeamManagedBy(managerUsername);
  if (!team) {
    return NextResponse.json({ error: "Create a team first." }, { status: 400 });
  }

  const payload = (await request.json()) as InvitePayload;
  const invitedUsername = typeof payload.username === "string" ? payload.username.trim() : "";
  if (!invitedUsername) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const accountToInvite = await getAccountRecordByUsername(invitedUsername);
  if (!accountToInvite) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const existingTeamForTarget = await getTeamForUser(accountToInvite.username);
  if (existingTeamForTarget) {
    return NextResponse.json({ error: "User is already in a team or invited." }, { status: 400 });
  }

  const updatedTeam = await inviteUserToTeam(team.id, managerUsername, accountToInvite.username);
  if (!updatedTeam) {
    return NextResponse.json({ error: "Could not send invite." }, { status: 400 });
  }

  const createdInvite = updatedTeam.invites.find((invite) => invite.username.toLowerCase() === accountToInvite.username.toLowerCase());

  if (createdInvite) {
    try {
      await notifyUserWithDiscordDm({
        username: accountToInvite.username,
        dispatchKey: `${accountToInvite.username.toLowerCase()}|invite:${updatedTeam.id}:${createdInvite.createdAt}:${accountToInvite.username.toLowerCase()}`,
        content: `🎮 Team invite from ${managerUsername} to join ${updatedTeam.name}. Check your team page to respond.`,
      });
    } catch (error) {
      console.error("[team-invite] Discord DM failed:", error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ team: updatedTeam });
}
