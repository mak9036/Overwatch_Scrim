import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest, getPosterUsernameFromRequest, isPosterRequest } from "@/lib/account-auth";
import { sendMessage } from "@/lib/messages-store";
import { readScrimRequests, respondToScrimRequest } from "@/lib/scrim-requests-store";
import { getAllTeams } from "@/lib/teams-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface IncomingPayload {
  action?: unknown;
  matchDetails?: unknown;
}

interface IncomingMatchDetails {
  scheduledTime?: unknown;
  lobby?: unknown;
  notes?: unknown;
}

const sanitizeText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    return NextResponse.json({ error: "Only managers can respond to scrim requests." }, { status: 403 });
  }

  const { id } = await context.params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  let payload: IncomingPayload;
  try {
    payload = (await request.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = payload.action === "accept" || payload.action === "decline" ? payload.action : null;
  if (!action) {
    return NextResponse.json({ error: "Action must be accept or decline." }, { status: 400 });
  }

  const rawMatchDetails = payload.matchDetails as IncomingMatchDetails | undefined;
  const scheduledTime = sanitizeText(rawMatchDetails?.scheduledTime, 120);
  const lobby = sanitizeText(rawMatchDetails?.lobby, 120);
  const notes = sanitizeText(rawMatchDetails?.notes, 300);

  if (action === "accept" && !scheduledTime) {
    return NextResponse.json({ error: "Scheduled time is required when accepting a scrim request." }, { status: 400 });
  }

  const current = (await readScrimRequests()).find((entry) => entry.id === requestId);
  if (!current) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const updated = await respondToScrimRequest(requestId, username, action, {
    scheduledTime,
    lobby: lobby || undefined,
    notes: notes || undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not update request." }, { status: 404 });
  }

  if (updated.status !== "pending") {
    if (action === "accept") {
      await sendMessage(
        username,
        updated.requesterManagerUsername,
        `Scrim accepted: ${updated.targetTeamName} accepted your request from ${updated.requesterTeamName}. Time: ${updated.matchDetails?.scheduledTime || "TBD"}.`,
      );

      const teams = await getAllTeams();
      const acceptedTeam = teams.find((team) => team.id === updated.targetTeamId);
      if (acceptedTeam) {
        const recipients = Array.from(new Set(acceptedTeam.members.map((member) => member.username.trim()).filter(Boolean)));
        await Promise.all(
          recipients.map((recipientUsername) =>
            sendMessage(
              "ScrimBot",
              recipientUsername,
              `Your manager accepted a scrim request. Upcoming scrim: ${updated.targetTeamName} vs ${updated.requesterTeamName}. Time: ${updated.matchDetails?.scheduledTime || "TBD"}. Check Match Finder/messages for details.`,
            ),
          ),
        );
      }
    }

    if (action === "decline") {
      await sendMessage(
        username,
        updated.requesterManagerUsername,
        `Scrim declined: ${updated.targetTeamName} declined your request from ${updated.requesterTeamName}.`,
      );
    }
  }

  return NextResponse.json({ request: updated });
}
