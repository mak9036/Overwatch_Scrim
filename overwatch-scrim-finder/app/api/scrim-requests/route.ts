import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest, getPosterUsernameFromRequest, isPosterRequest } from "@/lib/account-auth";
import { getMatchPostById } from "@/lib/match-posts-store";
import { createScrimRequest } from "@/lib/scrim-requests-store";
import { sendMessage } from "@/lib/messages-store";
import { getTeamManagedBy } from "@/lib/teams-store";

interface IncomingPayload {
  targetPostId?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isPosterRequest(request)) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const username = getPosterUsernameFromRequest(request);
  const account = getPosterAccountFromRequest(request);
  if (!username || !account) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const isManager =
    account.gameProfile?.leaderRole === "Manager" ||
    (Array.isArray(account.gameProfile?.leaderRoles) && account.gameProfile.leaderRoles.includes("Manager"));
  if (!isManager) {
    return NextResponse.json({ error: "Only managers can send scrim requests." }, { status: 403 });
  }

  let payload: IncomingPayload;
  try {
    payload = (await request.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const targetPostId = Number(payload.targetPostId);
  if (!Number.isFinite(targetPostId)) {
    return NextResponse.json({ error: "targetPostId is required." }, { status: 400 });
  }

  const [requesterTeam, targetPost] = await Promise.all([getTeamManagedBy(username), getMatchPostById(targetPostId)]);
  if (!requesterTeam) {
    return NextResponse.json({ error: "You need to manage a team before sending requests." }, { status: 400 });
  }

  if (!targetPost) {
    return NextResponse.json({ error: "Target match post not found." }, { status: 404 });
  }

  if (requesterTeam.id === targetPost.teamId) {
    return NextResponse.json({ error: "You cannot request your own post." }, { status: 400 });
  }

  const { created, error } = await createScrimRequest({
    requesterManagerUsername: username,
    requesterTeamId: requesterTeam.id,
    requesterTeamName: requesterTeam.name,
    targetManagerUsername: targetPost.managerUsername,
    targetTeamId: targetPost.teamId,
    targetTeamName: targetPost.teamName,
  });

  if (error === "duplicate-pending") {
    return NextResponse.json({ error: "You already have a pending request to this team." }, { status: 409 });
  }

  if (!created) {
    return NextResponse.json({ error: "Could not create scrim request." }, { status: 400 });
  }

  await sendMessage(
    username,
    targetPost.managerUsername,
    `Scrim request: ${requesterTeam.name} wants to scrim vs ${targetPost.teamName}. Accept or decline from Match Finder.`,
  );

  return NextResponse.json({ request: created }, { status: 201 });
}
