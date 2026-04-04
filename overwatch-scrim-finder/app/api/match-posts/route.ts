import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest, getPosterUsernameFromRequest, isPosterRequest } from "@/lib/account-auth";
import { listAccountRecords } from "@/lib/accounts-store";
import { createMatchPost, readMatchPosts } from "@/lib/match-posts-store";
import { readScrimRequests } from "@/lib/scrim-requests-store";
import { getAllTeams, getTeamManagedBy } from "@/lib/teams-store";

interface IncomingMatchPostPayload {
  preferredTime?: unknown;
  notes?: unknown;
}

const sanitizeText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function GET(request: NextRequest) {
  const currentUsername = getPosterUsernameFromRequest(request);
  const [posts, teams, accounts, scrimRequests] = await Promise.all([
    readMatchPosts(),
    getAllTeams(),
    listAccountRecords(),
    readScrimRequests(),
  ]);

  const currentManagedTeam = currentUsername
    ? teams.find((team) => team.managerUsername.trim().toLowerCase() === currentUsername.trim().toLowerCase()) || null
    : null;

  const accountByUsername = new Map(
    accounts.map((account) => [account.username.trim().toLowerCase(), account] as const),
  );
  const preferredTimeByTeamId = new Map(posts.map((post) => [post.teamId, post.preferredTime] as const));

  const enrichedPosts = posts.map((post) => {
    const team = teams.find((entry) => entry.id === post.teamId);
    const incomingRequests = currentUsername && post.managerUsername.trim().toLowerCase() === currentUsername.trim().toLowerCase()
      ? scrimRequests
          .filter((scrimRequest) => scrimRequest.status === "pending" && scrimRequest.targetTeamId === post.teamId)
          .map((scrimRequest) => ({
            id: scrimRequest.id,
            requesterManagerUsername: scrimRequest.requesterManagerUsername,
            requesterTeamName: scrimRequest.requesterTeamName,
            createdAt: scrimRequest.createdAt,
          }))
      : [];

    const myRequestToThisPost = currentManagedTeam
      ? scrimRequests.find(
          (scrimRequest) =>
            scrimRequest.requesterTeamId === currentManagedTeam.id &&
            scrimRequest.targetTeamId === post.teamId,
        ) || null
      : null;

    const acceptedRequestsForTeam = scrimRequests
      .filter(
        (scrimRequest) =>
          scrimRequest.status === "accepted" &&
          (scrimRequest.requesterTeamId === post.teamId || scrimRequest.targetTeamId === post.teamId),
      )
      .sort((leftItem, rightItem) => {
        const leftTime = new Date(leftItem.respondedAt || leftItem.createdAt).getTime();
        const rightTime = new Date(rightItem.respondedAt || rightItem.createdAt).getTime();
        return rightTime - leftTime;
      });

    const latestAcceptedRequest = acceptedRequestsForTeam[0] || null;

    const roster =
      team?.members.map((member) => ({
        username: member.username,
        role: member.role,
        mainRoles: Array.isArray(member.mainRoles) ? member.mainRoles : [],
        avatarUrl:
          accountByUsername.get(member.username.trim().toLowerCase())?.accountProfile?.avatarUrl || "",
        topPicks: Array.isArray(accountByUsername.get(member.username.trim().toLowerCase())?.gameProfile?.topPicks)
          ? accountByUsername
              .get(member.username.trim().toLowerCase())
              ?.gameProfile?.topPicks?.filter((entry): entry is string => typeof entry === "string")
          : [],
      })) || [];

    return {
      ...post,
      roster,
      incomingRequests,
      outgoingRequestStatus: myRequestToThisPost?.status || null,
      acceptedMatch: latestAcceptedRequest
        ? {
            requestId: latestAcceptedRequest.id,
            requesterTeamName: latestAcceptedRequest.requesterTeamName,
            requesterManagerUsername: latestAcceptedRequest.requesterManagerUsername,
            requesterPreferredTime: preferredTimeByTeamId.get(latestAcceptedRequest.requesterTeamId) || "",
            targetTeamName: latestAcceptedRequest.targetTeamName,
            targetManagerUsername: latestAcceptedRequest.targetManagerUsername,
            targetPreferredTime: preferredTimeByTeamId.get(latestAcceptedRequest.targetTeamId) || "",
            acceptedAt: latestAcceptedRequest.respondedAt || latestAcceptedRequest.createdAt,
            scheduledTime: latestAcceptedRequest.matchDetails?.scheduledTime || "",
            lobby: latestAcceptedRequest.matchDetails?.lobby || "",
            notes: latestAcceptedRequest.matchDetails?.notes || "",
          }
        : null,
    };
  });

  return NextResponse.json(enrichedPosts, {
    headers: {
      "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      Vary: "Cookie",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isPosterRequest(request)) {
    return NextResponse.json({ error: "Please log in before posting a match request." }, { status: 401 });
  }

  const username = getPosterUsernameFromRequest(request);
  const account = getPosterAccountFromRequest(request);
  if (!username || !account) {
    return NextResponse.json({ error: "Please log in before posting a match request." }, { status: 401 });
  }

  const isManager =
    account.gameProfile?.leaderRole === "Manager" ||
    (Array.isArray(account.gameProfile?.leaderRoles) && account.gameProfile.leaderRoles.includes("Manager"));
  if (!isManager) {
    return NextResponse.json({ error: "Only managers can post in Match Finder." }, { status: 403 });
  }

  const managedTeam = await getTeamManagedBy(username);
  if (!managedTeam) {
    return NextResponse.json({ error: "You need to manage a team before posting a match request." }, { status: 400 });
  }

  let payload: IncomingMatchPostPayload;
  try {
    payload = (await request.json()) as IncomingMatchPostPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const preferredTime = sanitizeText(payload.preferredTime, 120);
  const notes = sanitizeText(payload.notes, 400);
  if (!preferredTime) {
    return NextResponse.json({ error: "Preferred time is required." }, { status: 400 });
  }

  const scrimRank = account.gameProfile?.rank?.trim() || "";
  const region = Array.isArray(account.gameProfile?.region) ? account.gameProfile.region : [];
  if (!scrimRank || region.length === 0) {
    return NextResponse.json(
      { error: "Complete your profile scrim rank and region before posting a match request." },
      { status: 400 },
    );
  }

  const existingPosts = await readMatchPosts();
  const hasExisting = existingPosts.some((post) => post.teamId === managedTeam.id);
  if (hasExisting) {
    return NextResponse.json({ error: "Your team already has an active match finder post." }, { status: 409 });
  }

  const created = await createMatchPost({
    teamId: managedTeam.id,
    teamName: managedTeam.name,
    managerUsername: username,
    avatarUrl: managedTeam.avatarUrl,
    scrimRank,
    region,
    tournaments: managedTeam.tournaments,
    preferredTime,
    notes: notes || undefined,
  });

  return NextResponse.json(created, { status: 201 });
}