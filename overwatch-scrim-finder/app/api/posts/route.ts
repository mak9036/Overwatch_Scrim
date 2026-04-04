import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPost, readPosts } from "@/lib/posts-store";
import { getPosterAccountFromRequest, getPosterUsernameFromRequest, isPosterRequest } from "@/lib/account-auth";
import { getAllTeams, getTeamForUser } from "@/lib/teams-store";
import { getAccountRecordByUsername } from "@/lib/accounts-store";

const MAX_POSTS_PER_USER = 5;

interface IncomingPostPayload {
  teamName?: unknown;
  postType?: unknown;
  eloRange?: unknown;
  owRank?: unknown;
  region?: unknown;
  leader?: unknown;
  avatarUrl?: unknown;
  leaderRole?: unknown;
  leaderRoles?: unknown;
  mainRole?: unknown;
  tournaments?: unknown;
  members?: unknown;
  lookingFor?: unknown;
  lookingForRoles?: unknown;
  topPicks?: unknown;
  bgImage?: unknown;
}

const ALLOWED_REGION_OPTIONS = ["NA", "SA", "EMEA", "JP", "CN", "APAC"] as const;
const LFP_ROLE_OPTIONS = ["Tank", "FPDS", "HS", "FS", "MS"] as const;
const LEADER_STATUS_OPTIONS = ["Player", "Manager", "Coach", "Team"] as const;

const normalizeServerAssetUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().slice(0, 256);
  if (!trimmed || trimmed.includes("..")) {
    return undefined;
  }

  if (trimmed.startsWith("/uploads/avatars/")) {
    return trimmed.replace("/uploads/avatars/", "/api/uploads/avatars/");
  }

  if (trimmed.startsWith("/uploads/teams/")) {
    return trimmed.replace("/uploads/teams/", "/api/uploads/teams/");
  }

  if (trimmed.startsWith("/api/uploads/")) {
    return trimmed;
  }

  return undefined;
};

const normalizeRegion = (entry: string) => {
  if (entry === "KR" || entry === "AS") {
    return "APAC";
  }
  if (entry === "BR") {
    return "SA";
  }
  return entry;
};

const sanitizeRegions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => normalizeRegion(entry.trim()))
        .filter((entry) => ALLOWED_REGION_OPTIONS.includes(entry as (typeof ALLOWED_REGION_OPTIONS)[number])),
    ),
  ).slice(0, 6);
};

const sanitizeLfpRoles = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => LFP_ROLE_OPTIONS.includes(entry as (typeof LFP_ROLE_OPTIONS)[number])),
    ),
  ).slice(0, 5);
};

const sanitizeLeaderStatuses = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => LEADER_STATUS_OPTIONS.includes(entry as (typeof LEADER_STATUS_OPTIONS)[number])),
    ),
  ).slice(0, 4);
};

export async function GET() {
  const posts = await readPosts();
  const teams = await getAllTeams();

  const postsWithTeams = posts.map((post) => {
    const username = (post.ownerUsername || post.leader).trim().toLowerCase();
    const joinedTeam = teams.find((team) => team.members.some((member) => member.username.trim().toLowerCase() === username));

    return {
      ...post,
      joinedTeamName: joinedTeam?.name,
    };
  });

  return NextResponse.json(postsWithTeams, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isPosterRequest(request)) {
    return NextResponse.json({ error: "Please log in before creating a post." }, { status: 401 });
  }

  const account = getPosterAccountFromRequest(request);

  const ownerUsername = getPosterUsernameFromRequest(request);
  if (!ownerUsername) {
    return NextResponse.json({ error: "Please log in before creating a post." }, { status: 401 });
  }

  let payload: IncomingPostPayload;
  try {
    payload = (await request.json()) as IncomingPostPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Enforce per-user post limit to prevent spam/disk exhaustion
  const existingPosts = await readPosts();
  const userPostCount = existingPosts.filter(
    (p) => (p.ownerUsername || p.leader).trim().toLowerCase() === ownerUsername.toLowerCase(),
  ).length;
  if (userPostCount >= MAX_POSTS_PER_USER) {
    return NextResponse.json(
      { error: `You may have at most ${MAX_POSTS_PER_USER} active posts.` },
      { status: 429 },
    );
  }

  const teamName = typeof payload.teamName === "string" ? payload.teamName.trim() : "";
  const postType = payload.postType === "team-lfp" ? "team-lfp" : "account";
  const isTeamPost = postType === "team-lfp";

  const accountLeaderRoles = Array.isArray(account?.gameProfile?.leaderRoles)
    ? account.gameProfile.leaderRoles
    : [];
  const managerDetected =
    account?.gameProfile?.leaderRole === "Manager" || accountLeaderRoles.includes("Manager");

  if (postType === "team-lfp" && !managerDetected) {
    return NextResponse.json({ error: "Only managers can create Team LFP posts." }, { status: 403 });
  }

  const eloRange = typeof payload.eloRange === "string" ? payload.eloRange.trim() : "";
  const owRank = typeof payload.owRank === "string" ? payload.owRank.trim() : "";
  const leader = typeof payload.leader === "string" ? payload.leader.trim() : "";
  const leaderRole =
    typeof payload.leaderRole === "string" && payload.leaderRole.trim().length > 0
      ? payload.leaderRole.trim()
      : postType === "team-lfp"
        ? "Team"
        : "Player";
  const incomingLeaderRoles = sanitizeLeaderStatuses(payload.leaderRoles);
  const leaderRoles = incomingLeaderRoles.length > 0 ? incomingLeaderRoles : [leaderRole];
  const region = sanitizeRegions(payload.region);
  const mainRole =
    Array.isArray(payload.mainRole) && payload.mainRole.every((entry) => typeof entry === "string")
      ? payload.mainRole
      : [];
  // Sanitize members: enforce count cap and per-field length limits
  const members = Array.isArray(payload.members)
    ? payload.members
        .filter((member): member is Record<string, unknown> => {
          if (!member || typeof member !== "object") return false;
          const m = member as Record<string, unknown>;
          return (
            typeof m.name === "string" &&
            typeof m.rank === "string" &&
            typeof m.role === "string" &&
            (m.mainRole === undefined || Array.isArray(m.mainRole))
          );
        })
        .slice(0, 30)
        .map((member) => ({
          name: String(member.name).trim().slice(0, 64),
          rank: String(member.rank).trim().slice(0, 32),
          role: String(member.role).trim().slice(0, 32),
          mainRole: Array.isArray(member.mainRole)
            ? member.mainRole
                .filter((entry): entry is string => typeof entry === "string")
                .map((entry) => entry.trim().slice(0, 32))
                .filter((entry) => entry.length > 0)
                .slice(0, 5)
            : undefined,
        }))
    : [];
  const lookingFor = typeof payload.lookingFor === "string" ? payload.lookingFor.trim().slice(0, 400) : "";
  const lookingForRoles = sanitizeLfpRoles(payload.lookingForRoles);
  const tournaments =
    Array.isArray(payload.tournaments) && payload.tournaments.every((entry) => typeof entry === "string")
      ? (payload.tournaments as string[]).map((entry) => entry.trim().toUpperCase()).slice(0, 3)
      : [];

  if (!teamName || !eloRange || !leader || region.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  if (!isTeamPost && !owRank) {
    return NextResponse.json(
      { error: "OW Rank is required for player posts." },
      { status: 400 },
    );
  }

  if (postType === "team-lfp" && !lookingFor) {
    return NextResponse.json({ error: "Team LFP posts require a Looking For section." }, { status: 400 });
  }
  if (postType === "team-lfp" && lookingForRoles.length === 0) {
    return NextResponse.json({ error: "Team LFP posts require at least one role in Looking For Roles." }, { status: 400 });
  }
  if (tournaments.length === 0) {
    return NextResponse.json({ error: "Please select at least one tournament you are interested in." }, { status: 400 });
  }

  let finalTeamName = teamName;
  let finalLeader = leader;
  let finalMembers = members;
  let finalTournaments = tournaments;

  if (postType === "team-lfp") {
    const team = await getTeamForUser(ownerUsername);
    if (!team) {
      return NextResponse.json({ error: "You must be in a team to create a Team LFP post." }, { status: 400 });
    }

    finalTeamName = team.name;
    finalLeader = team.name;
    finalTournaments = team.tournaments;
    finalMembers = await Promise.all(
      team.members.map(async (member) => {
        const accountRecord = await getAccountRecordByUsername(member.username);
        return {
          name: member.username,
          rank: "Team Member",
          role: member.role,
          mainRole:
            Array.isArray(accountRecord?.gameProfile?.mainRole) && accountRecord.gameProfile.mainRole.length > 0
              ? accountRecord.gameProfile.mainRole
              : member.mainRoles,
        };
      }),
    );
  }

  const post = await createPost({
    teamName: finalTeamName,
    postType,
    eloRange,
    owRank: !isTeamPost ? owRank : undefined,
    region,
    leader: finalLeader,
    ownerUsername,
    avatarUrl: normalizeServerAssetUrl(payload.avatarUrl),
    leaderRole,
    leaderRoles,
    mainRole,
    tournaments: finalTournaments,
    members: finalMembers,
    lookingFor: lookingFor || undefined,
    lookingForRoles,
    topPicks:
      Array.isArray(payload.topPicks) && payload.topPicks.every((entry) => typeof entry === "string")
        ? (payload.topPicks as string[]).slice(0, 3).map((e) => e.trim().slice(0, 32))
        : undefined,
    bgImage: normalizeServerAssetUrl(payload.bgImage),
  });

  return NextResponse.json(post, { status: 201 });
}
