import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest, getPosterUsernameFromRequest } from "@/lib/account-auth";
import {
  createTeam,
  getTeamForUser,
  getTeamManagedBy,
  removeTeamMember,
  updateTeamAvatar,
  updateTeamMemberRole,
  updateTeamTournaments,
} from "@/lib/teams-store";
import { getAccountRecordByUsername } from "@/lib/accounts-store";
import { notifyUserWithDiscordDm } from "@/lib/discord-dm";

interface CreateTeamPayload {
  name?: unknown;
  invites?: unknown;
  tournaments?: unknown;
}

interface UpdateTeamPayload {
  avatarUrl?: unknown;
  tournaments?: unknown;
  memberUsername?: unknown;
  memberRole?: unknown;
  removeMemberUsername?: unknown;
}

const enrichTeamMembersFromProfiles = async <TTeam extends { members: Array<{ username: string; role: string; mainRoles?: string[] }> }>(team: TTeam | null) => {
  if (!team) {
    return null;
  }

  const managerAccount = await getAccountRecordByUsername(team.managerUsername);

  const members = await Promise.all(
    team.members.map(async (member) => {
      const account = await getAccountRecordByUsername(member.username);
      const profileMainRoles = account?.gameProfile?.mainRole;
      return {
        ...member,
        mainRoles:
          Array.isArray(profileMainRoles) && profileMainRoles.length > 0
            ? profileMainRoles
            : member.mainRoles,
      };
    }),
  );

  return {
    ...team,
    managerBattleTag:
      typeof managerAccount?.accountProfile?.battleTag === "string"
        ? managerAccount.accountProfile.battleTag
        : "",
    managerDiscordTag:
      typeof managerAccount?.accountProfile?.discordTag === "string"
        ? managerAccount.accountProfile.discordTag
        : typeof managerAccount?.accountProfile?.discordUsername === "string"
          ? managerAccount.accountProfile.discordUsername
          : "",
    members,
  };
};

export async function GET(request: NextRequest) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const team = await getTeamForUser(username);
  const enrichedTeam = await enrichTeamMembersFromProfiles(team);
  return NextResponse.json({ team: enrichedTeam });
}

export async function POST(request: NextRequest) {
  const account = getPosterAccountFromRequest(request);
  const username = account?.username || "";
  if (!username) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  if (account?.gameProfile?.leaderRole !== "Manager") {
    return NextResponse.json({ error: "Only managers can create teams." }, { status: 403 });
  }

  const existingTeam = await getTeamForUser(username);
  if (existingTeam) {
    return NextResponse.json({ error: "You are already in a team or have a pending invite." }, { status: 400 });
  }

  const payload = (await request.json()) as CreateTeamPayload;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const invites =
    Array.isArray(payload.invites) && payload.invites.every((entry) => typeof entry === "string")
      ? payload.invites
      : [];
  const tournaments =
    Array.isArray(payload.tournaments) && payload.tournaments.every((entry) => typeof entry === "string")
      ? payload.tournaments
      : [];

  if (!name) {
    return NextResponse.json({ error: "Team name is required." }, { status: 400 });
  }

  const validInvites: string[] = [];
  for (const invite of invites.slice(0, 20)) {
    const targetAccount = await getAccountRecordByUsername(invite);
    if (!targetAccount) {
      continue;
    }

    const targetTeam = await getTeamForUser(targetAccount.username);
    if (targetTeam) {
      continue;
    }

    validInvites.push(targetAccount.username);
  }

  const team = await createTeam({
    name,
    managerUsername: username,
    invitedUsernames: validInvites,
    tournaments,
  });

  if (!team) {
    const alreadyManager = await getTeamManagedBy(username);
    if (alreadyManager) {
      return NextResponse.json({ error: "You already manage a team." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create team." }, { status: 400 });
  }

  await Promise.all(
    team.invites.map(async (invite) => {
      try {
        await notifyUserWithDiscordDm({
          username: invite.username,
          dispatchKey: `${invite.username.toLowerCase()}|invite:${team.id}:${invite.createdAt}:${invite.username.toLowerCase()}`,
          content: `🎮 Team invite from ${username} to join ${team.name}. Check your team page to respond.`,
        });
      } catch (error) {
        console.error("[team-create] Discord DM failed:", error instanceof Error ? error.message : error);
      }
    }),
  );

  const enrichedTeam = await enrichTeamMembersFromProfiles(team);
  return NextResponse.json({ team: enrichedTeam }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const account = getPosterAccountFromRequest(request);
  const username = account?.username || "";
  if (!username) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const managedTeam = await getTeamManagedBy(username);
  if (!managedTeam) {
    return NextResponse.json({ error: "Only the team manager can update team settings." }, { status: 403 });
  }

  const payload = (await request.json()) as UpdateTeamPayload;
  const avatarUrl = typeof payload.avatarUrl === "string" ? payload.avatarUrl : undefined;
  const tournaments =
    Array.isArray(payload.tournaments) && payload.tournaments.every((entry) => typeof entry === "string")
      ? payload.tournaments
      : undefined;
  const memberUsername = typeof payload.memberUsername === "string" ? payload.memberUsername.trim() : "";
  const memberRole = typeof payload.memberRole === "string" ? payload.memberRole.trim().toLowerCase() : "";
  const removeMemberUsername =
    typeof payload.removeMemberUsername === "string" ? payload.removeMemberUsername.trim() : "";

  let team = managedTeam;

  if (avatarUrl !== undefined) {
    const updatedTeam = await updateTeamAvatar(managedTeam.id, username, avatarUrl);
    if (!updatedTeam) {
      return NextResponse.json({ error: "Could not update team." }, { status: 400 });
    }
    team = updatedTeam;
  }

  if (tournaments !== undefined) {
    const updatedTeam = await updateTeamTournaments(managedTeam.id, username, tournaments);
    if (!updatedTeam) {
      return NextResponse.json({ error: "Could not update team tournaments." }, { status: 400 });
    }
    team = updatedTeam;
  }

  if (memberUsername || memberRole) {
    if (!memberUsername || !memberRole) {
      return NextResponse.json({ error: "Both member username and role are required." }, { status: 400 });
    }

    const updatedTeam = await updateTeamMemberRole(managedTeam.id, username, memberUsername, memberRole);
    if (!updatedTeam) {
      return NextResponse.json({ error: "Could not update member role." }, { status: 400 });
    }
    team = updatedTeam;
  }

  if (removeMemberUsername) {
    const updatedTeam = await removeTeamMember(managedTeam.id, username, removeMemberUsername);
    if (!updatedTeam) {
      return NextResponse.json({ error: "Could not remove member." }, { status: 400 });
    }
    team = updatedTeam;
  }

  if (avatarUrl === undefined && tournaments === undefined && !memberUsername && !memberRole && !removeMemberUsername) {
    return NextResponse.json({ error: "No team updates provided." }, { status: 400 });
  }

  const enrichedTeam = await enrichTeamMembersFromProfiles(team);
  return NextResponse.json({ team: enrichedTeam });
}
