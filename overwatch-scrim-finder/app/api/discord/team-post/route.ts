import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAccountRecordByDiscordUserId, getAccountRecordByUsername } from "@/lib/accounts-store";
import { getTeamManagedBy } from "@/lib/teams-store";
import { upsertLatestTeamPostForOwner } from "@/lib/posts-store";

const BOT_SECRET_HEADER = "x-discord-bot-secret";

interface IncomingPayload {
  discordUserId?: unknown;
}

const isAuthorizedBotRequest = (request: NextRequest) => {
  const configuredSecret = process.env.DISCORD_POST_BOT_SECRET?.trim() || "";
  if (!configuredSecret) {
    return false;
  }

  const providedSecret = request.headers.get(BOT_SECRET_HEADER)?.trim() || "";
  return providedSecret.length > 0 && providedSecret === configuredSecret;
};

export async function POST(request: NextRequest) {
  if (!isAuthorizedBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized bot request." }, { status: 401 });
  }

  let payload: IncomingPayload;
  try {
    payload = (await request.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const discordUserId = typeof payload.discordUserId === "string" ? payload.discordUserId.trim() : "";
  if (!discordUserId) {
    return NextResponse.json({ error: "discordUserId is required." }, { status: 400 });
  }

  const account = await getAccountRecordByDiscordUserId(discordUserId);
  if (!account) {
    return NextResponse.json(
      {
        error: "No website account is linked to this Discord user. Link your Discord in account settings first.",
      },
      { status: 404 },
    );
  }

  if (account.gameProfile?.leaderRole !== "Manager") {
    return NextResponse.json({ error: "Only managers can post a team from Discord." }, { status: 403 });
  }

  const ownerUsername = account.username;
  const team = await getTeamManagedBy(ownerUsername);
  if (!team) {
    return NextResponse.json({ error: "No team managed by this account was found." }, { status: 404 });
  }

  const members = await Promise.all(
    team.members.map(async (member) => {
      const memberAccount = await getAccountRecordByUsername(member.username);
      return {
        name: member.username,
        rank: "Team Member",
        role: member.role,
        mainRole:
          Array.isArray(memberAccount?.gameProfile?.mainRole) && memberAccount.gameProfile.mainRole.length > 0
            ? memberAccount.gameProfile.mainRole
            : member.mainRoles,
      };
    }),
  );

  const managerRegion = Array.isArray(account.gameProfile?.region) ? account.gameProfile.region : [];
  const managerEloRange = typeof account.gameProfile?.eloRange === "string" ? account.gameProfile.eloRange.trim() : "";

  if (!managerEloRange || managerRegion.length === 0) {
    return NextResponse.json(
      {
        error: "Set your scrim rank and region in website profile before posting from Discord.",
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(team.tournaments) || team.tournaments.length === 0) {
    return NextResponse.json(
      {
        error: "Your team must select at least one tournament before posting from Discord.",
      },
      { status: 400 },
    );
  }

  const post = await upsertLatestTeamPostForOwner(ownerUsername, {
    teamName: team.name,
    eloRange: managerEloRange,
    region: managerRegion,
    leader: team.name,
    avatarUrl: team.avatarUrl || account.accountProfile?.avatarUrl || undefined,
    leaderRole: "Team",
    mainRole: Array.isArray(account.gameProfile?.mainRole) ? account.gameProfile.mainRole : [],
    tournaments: team.tournaments,
    members,
    lookingFor: team.bio?.trim() || "Recruiting for upcoming scrims and tournaments.",
    lookingForRoles: [],
    topPicks: Array.isArray(account.gameProfile?.topPicks) ? account.gameProfile.topPicks : [],
    bgImage: undefined,
  });

  return NextResponse.json({
    ok: true,
    message: "Team post saved from Discord.",
    postId: post.id,
    teamName: post.teamName,
  });
}