import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { getAccountRecordByUsername } from "@/lib/accounts-store";
import { getTeamForUser, respondToInvite } from "@/lib/teams-store";

const mapProfileToTeamRole = (leaderRole: string): "player" | "coach" => {
  if (leaderRole.toLowerCase() === "coach") {
    return "coach";
  }
  return "player";
};

interface RespondInvitePayload {
  action?: unknown;
}

export async function POST(request: NextRequest) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const team = await getTeamForUser(username);
  if (!team) {
    return NextResponse.json({ error: "No team invite found." }, { status: 404 });
  }

  const hasInvite = team.invites.some((invite) => invite.username.toLowerCase() === username.toLowerCase());
  if (!hasInvite) {
    return NextResponse.json({ error: "No pending invite found." }, { status: 404 });
  }

  const payload = (await request.json()) as RespondInvitePayload;
  const action = payload.action === "decline" ? "decline" : payload.action === "accept" ? "accept" : "";
  if (!action) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  let initialRole: "player" | "coach" = "player";
  let initialMainRoles: string[] | undefined;
  if (action === "accept") {
    const accountRecord = await getAccountRecordByUsername(username);
    const leaderRole = accountRecord?.gameProfile?.leaderRole ?? "Player";
    initialRole = mapProfileToTeamRole(leaderRole);
    const profileMainRoles = accountRecord?.gameProfile?.mainRole;
    if (Array.isArray(profileMainRoles) && profileMainRoles.length > 0) {
      initialMainRoles = profileMainRoles.filter((r): r is string => typeof r === "string");
    }
  }

  const updatedTeam = await respondToInvite(team.id, username, action, initialRole, initialMainRoles);
  if (!updatedTeam) {
    return NextResponse.json({ error: "Could not update invite." }, { status: 400 });
  }

  return NextResponse.json({ team: updatedTeam });
}
