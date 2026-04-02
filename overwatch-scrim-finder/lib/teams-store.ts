import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface TeamInvite {
  username: string;
  invitedBy: string;
  createdAt: string;
}

export interface StoredTeamMember {
  username: string;
  role: "manager" | "player" | "shotcaller" | "coach";
  mainRoles?: string[];
}

export interface StoredTeam {
  id: number;
  name: string;
  avatarUrl?: string;
  bio?: string;
  managerUsername: string;
  tournaments: string[];
  members: StoredTeamMember[];
  invites: TeamInvite[];
  createdAt: string;
}

const ALLOWED_TOURNAMENT_OPTIONS = ["FSEL", "SEL", "FIL"] as const;
const ALLOWED_MEMBER_ROLES = ["player", "shotcaller", "coach"] as const;
const ALLOWED_MAIN_ROLES = ["Tank", "Hitscan", "Flex DPS", "Flex Support", "Main Support"] as const;

const sanitizeTournaments = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => ALLOWED_TOURNAMENT_OPTIONS.includes(entry as (typeof ALLOWED_TOURNAMENT_OPTIONS)[number])),
    ),
  ).slice(0, 3);
};

const dataDirectory = path.join(process.cwd(), "data");
const teamsFilePath = path.join(dataDirectory, "teams.json");

const normalizeUsername = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const usernameEquals = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

const sanitizeTeamMember = (value: unknown): StoredTeamMember | null => {
  if (typeof value === "string") {
    const username = normalizeUsername(value);
    if (!username) {
      return null;
    }

    return {
      username,
      role: "player",
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { username?: unknown; name?: unknown; role?: unknown; mainRoles?: unknown };
  const username = normalizeUsername(candidate.username ?? candidate.name);
  if (!username) {
    return null;
  }

  const roleCandidate = typeof candidate.role === "string" ? candidate.role.trim().toLowerCase() : "";
  const role = ALLOWED_MEMBER_ROLES.includes(roleCandidate as (typeof ALLOWED_MEMBER_ROLES)[number])
    ? (roleCandidate as (typeof ALLOWED_MEMBER_ROLES)[number])
    : "player";

  const mainRoles = Array.isArray(candidate.mainRoles)
    ? candidate.mainRoles
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry) => ALLOWED_MAIN_ROLES.includes(entry as (typeof ALLOWED_MAIN_ROLES)[number]))
      .slice(0, 5)
    : undefined;

  return {
    username,
    role,
    ...(mainRoles && mainRoles.length > 0 ? { mainRoles } : {}),
  };
};

const normalizeTeamMembers = (members: unknown[], managerUsername: string): StoredTeamMember[] => {
  const nextMembers: StoredTeamMember[] = [];

  for (const entry of members) {
    const sanitizedMember = sanitizeTeamMember(entry);
    if (!sanitizedMember) {
      continue;
    }

    if (nextMembers.some((existingMember) => usernameEquals(existingMember.username, sanitizedMember.username))) {
      continue;
    }

    if (usernameEquals(sanitizedMember.username, managerUsername)) {
      continue;
    }

    nextMembers.push(sanitizedMember);
  }

  return [{ username: managerUsername, role: "manager" }, ...nextMembers];
};

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(teamsFilePath, "utf8");
  } catch {
    await writeFile(teamsFilePath, "[]", "utf8");
  }
};

const sanitizeTeamInvite = (value: unknown): TeamInvite | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<TeamInvite>;
  if (
    typeof candidate.username !== "string" ||
    typeof candidate.invitedBy !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const username = normalizeUsername(candidate.username);
  const invitedBy = normalizeUsername(candidate.invitedBy);
  if (!username || !invitedBy) {
    return null;
  }

  return {
    username,
    invitedBy,
    createdAt: candidate.createdAt,
  };
};

const sanitizeTeam = (value: unknown): StoredTeam | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredTeam>;
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.managerUsername !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const members = Array.isArray(candidate.members) ? candidate.members : [];

  const invites = Array.isArray(candidate.invites)
    ? candidate.invites
        .map((entry) => sanitizeTeamInvite(entry))
        .filter((entry): entry is TeamInvite => entry !== null)
    : [];

  const managerUsername = normalizeUsername(candidate.managerUsername);
  if (!managerUsername) {
    return null;
  }

  const rawAvatarUrl = typeof candidate.avatarUrl === "string" ? candidate.avatarUrl.trim() : "";
  const normalizedAvatarUrl = rawAvatarUrl.startsWith("/uploads/teams/")
    ? rawAvatarUrl.replace("/uploads/teams/", "/api/uploads/teams/")
    : rawAvatarUrl;

  return {
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    name: candidate.name.trim().slice(0, 64),
    avatarUrl: normalizedAvatarUrl.length > 0 ? normalizedAvatarUrl.slice(0, 256) : undefined,
    bio:
      typeof candidate.bio === "string" && candidate.bio.trim().length > 0
        ? candidate.bio.trim().slice(0, 280)
        : undefined,
    managerUsername,
    tournaments: sanitizeTournaments(candidate.tournaments),
    members: normalizeTeamMembers(members, managerUsername),
    invites,
    createdAt: candidate.createdAt,
  };
};

const readTeams = async (): Promise<StoredTeam[]> => {
  await ensureDataFile();
  const content = await readFile(teamsFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeTeam(entry))
      .filter((entry): entry is StoredTeam => entry !== null)
      .sort((leftTeam, rightTeam) => rightTeam.id - leftTeam.id);
  } catch {
    return [];
  }
};

const writeTeams = async (teams: StoredTeam[]) => {
  await writeFile(teamsFilePath, JSON.stringify(teams, null, 2), "utf8");
};

export const getAllTeams = async () => {
  return readTeams();
};

export const getTeamManagedBy = async (username: string) => {
  const safeUsername = normalizeUsername(username);
  if (!safeUsername) {
    return null;
  }

  const teams = await readTeams();
  return teams.find((team) => usernameEquals(team.managerUsername, safeUsername)) || null;
};

export const getTeamForUser = async (username: string) => {
  const safeUsername = normalizeUsername(username);
  if (!safeUsername) {
    return null;
  }

  const teams = await readTeams();
  return (
    teams.find(
      (team) =>
        team.members.some((member) => usernameEquals(member.username, safeUsername)) ||
        team.invites.some((invite) => usernameEquals(invite.username, safeUsername)),
    ) || null
  );
};

export const getCurrentTeamForUser = async (username: string) => {
  const safeUsername = normalizeUsername(username);
  if (!safeUsername) {
    return null;
  }

  const teams = await readTeams();
  return teams.find((team) => team.members.some((member) => usernameEquals(member.username, safeUsername))) || null;
};

export const createTeam = async (input: {
  name: string;
  managerUsername: string;
  invitedUsernames?: string[];
  tournaments?: string[];
}) => {
  const teamName = input.name.trim().slice(0, 64);
  const managerUsername = normalizeUsername(input.managerUsername);
  if (!teamName || !managerUsername) {
    return null;
  }

  const teams = await readTeams();
  const managerAlreadyHasTeam = teams.some((team) => usernameEquals(team.managerUsername, managerUsername));
  if (managerAlreadyHasTeam) {
    return null;
  }

  const normalizedInvites = Array.isArray(input.invitedUsernames)
    ? input.invitedUsernames
        .map((username) => normalizeUsername(username))
        .filter((username) => username.length > 0 && !usernameEquals(username, managerUsername))
    : [];

  const uniqueInvites = Array.from(new Set(normalizedInvites.map((username) => username.toLowerCase())))
    .map((lowerUsername) => normalizedInvites.find((username) => username.toLowerCase() === lowerUsername) || "")
    .filter((username) => username.length > 0)
    .slice(0, 20);

  const nextTeam: StoredTeam = {
    id: Date.now(),
    name: teamName,
    avatarUrl: "",
    managerUsername,
    tournaments: sanitizeTournaments(input.tournaments),
    members: [{ username: managerUsername, role: "manager" }],
    invites: uniqueInvites.map((username) => ({
      username,
      invitedBy: managerUsername,
      createdAt: new Date().toISOString(),
    })),
    createdAt: new Date().toISOString(),
  };

  await writeTeams([nextTeam, ...teams]);
  return nextTeam;
};

export const inviteUserToTeam = async (teamId: number, managerUsername: string, invitedUsername: string) => {
  const safeManagerUsername = normalizeUsername(managerUsername);
  const safeInvitedUsername = normalizeUsername(invitedUsername);
  if (!safeManagerUsername || !safeInvitedUsername) {
    return null;
  }

  const teams = await readTeams();
  const index = teams.findIndex((team) => team.id === teamId);
  if (index === -1) {
    return null;
  }

  const team = teams[index];
  if (!usernameEquals(team.managerUsername, safeManagerUsername)) {
    return null;
  }

  if (
    team.members.some((member) => usernameEquals(member.username, safeInvitedUsername)) ||
    team.invites.some((invite) => usernameEquals(invite.username, safeInvitedUsername))
  ) {
    return team;
  }

  const nextTeam: StoredTeam = {
    ...team,
    invites: [
      ...team.invites,
      {
        username: safeInvitedUsername,
        invitedBy: safeManagerUsername,
        createdAt: new Date().toISOString(),
      },
    ].slice(-20),
  };

  const nextTeams = [...teams];
  nextTeams[index] = nextTeam;
  await writeTeams(nextTeams);

  return nextTeam;
};

export const respondToInvite = async (
  teamId: number,
  username: string,
  action: "accept" | "decline",
  initialRole?: "player" | "shotcaller" | "coach",
  initialMainRoles?: string[],
) => {
  const safeUsername = normalizeUsername(username);
  if (!safeUsername) {
    return null;
  }

  const teams = await readTeams();
  const index = teams.findIndex((team) => team.id === teamId);
  if (index === -1) {
    return null;
  }

  const team = teams[index];
  const hasInvite = team.invites.some((invite) => usernameEquals(invite.username, safeUsername));
  if (!hasInvite) {
    return null;
  }

  const nextInvites = team.invites.filter((invite) => !usernameEquals(invite.username, safeUsername));
  const nextMembers =
    action === "accept" && !team.members.some((member) => usernameEquals(member.username, safeUsername))
      ? [
          ...team.members,
          {
            username: safeUsername,
            role: (initialRole ?? "player") as StoredTeamMember["role"],
            ...(initialMainRoles && initialMainRoles.length > 0 ? { mainRoles: initialMainRoles } : {}),
          },
        ]
      : team.members;

  const nextTeam: StoredTeam = {
    ...team,
    invites: nextInvites,
    members: nextMembers,
  };

  const nextTeams = [...teams];
  nextTeams[index] = nextTeam;
  await writeTeams(nextTeams);

  return nextTeam;
};

export const updateTeamAvatar = async (teamId: number, managerUsername: string, avatarUrl: string) => {
  const safeManagerUsername = normalizeUsername(managerUsername);
  const safeAvatarUrl = typeof avatarUrl === "string" ? avatarUrl.trim().slice(0, 256) : "";
  if (!safeManagerUsername) {
    return null;
  }

  const teams = await readTeams();
  const index = teams.findIndex((team) => team.id === teamId);
  if (index === -1) {
    return null;
  }

  const team = teams[index];
  if (!usernameEquals(team.managerUsername, safeManagerUsername)) {
    return null;
  }

  const nextTeam: StoredTeam = {
    ...team,
    avatarUrl: safeAvatarUrl || undefined,
  };

  const nextTeams = [...teams];
  nextTeams[index] = nextTeam;
  await writeTeams(nextTeams);

  return nextTeam;
};

export const updateTeamTournaments = async (teamId: number, managerUsername: string, tournaments: string[]) => {
  const safeManagerUsername = normalizeUsername(managerUsername);
  if (!safeManagerUsername) {
    return null;
  }

  const teams = await readTeams();
  const index = teams.findIndex((team) => team.id === teamId);
  if (index === -1) {
    return null;
  }

  const team = teams[index];
  if (!usernameEquals(team.managerUsername, safeManagerUsername)) {
    return null;
  }

  const nextTeam: StoredTeam = {
    ...team,
    tournaments: sanitizeTournaments(tournaments),
  };

  const nextTeams = [...teams];
  nextTeams[index] = nextTeam;
  await writeTeams(nextTeams);

  return nextTeam;
};

export const updateTeamMemberRole = async (
  teamId: number,
  managerUsername: string,
  memberUsername: string,
  role: string,
) => {
  const safeManagerUsername = normalizeUsername(managerUsername);
  const safeMemberUsername = normalizeUsername(memberUsername);
  const safeRole = role.trim().toLowerCase();
  if (!safeManagerUsername || !safeMemberUsername) {
    return null;
  }

  if (!ALLOWED_MEMBER_ROLES.includes(safeRole as (typeof ALLOWED_MEMBER_ROLES)[number])) {
    return null;
  }

  const teams = await readTeams();
  const index = teams.findIndex((team) => team.id === teamId);
  if (index === -1) {
    return null;
  }

  const team = teams[index];
  if (!usernameEquals(team.managerUsername, safeManagerUsername)) {
    return null;
  }

  if (usernameEquals(safeMemberUsername, team.managerUsername)) {
    return null;
  }

  const memberExists = team.members.some((member) => usernameEquals(member.username, safeMemberUsername));
  if (!memberExists) {
    return null;
  }

  const nextTeam: StoredTeam = {
    ...team,
    members: team.members.map((member) =>
      usernameEquals(member.username, safeMemberUsername)
        ? {
            ...member,
            role: safeRole as (typeof ALLOWED_MEMBER_ROLES)[number],
          }
        : member,
    ),
  };

  const nextTeams = [...teams];
  nextTeams[index] = nextTeam;
  await writeTeams(nextTeams);

  return nextTeam;
};

export const removeTeamMember = async (teamId: number, managerUsername: string, memberUsername: string) => {
  const safeManagerUsername = normalizeUsername(managerUsername);
  const safeMemberUsername = normalizeUsername(memberUsername);
  if (!safeManagerUsername || !safeMemberUsername) {
    return null;
  }

  const teams = await readTeams();
  const index = teams.findIndex((team) => team.id === teamId);
  if (index === -1) {
    return null;
  }

  const team = teams[index];
  if (!usernameEquals(team.managerUsername, safeManagerUsername)) {
    return null;
  }

  if (usernameEquals(safeMemberUsername, team.managerUsername)) {
    return null;
  }

  if (!team.members.some((member) => usernameEquals(member.username, safeMemberUsername))) {
    return null;
  }

  const nextTeam: StoredTeam = {
    ...team,
    members: team.members.filter((member) => !usernameEquals(member.username, safeMemberUsername)),
  };

  const nextTeams = [...teams];
  nextTeams[index] = nextTeam;
  await writeTeams(nextTeams);

  return nextTeam;
};
