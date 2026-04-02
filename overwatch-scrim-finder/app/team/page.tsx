"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import NotificationCenter from "@/components/notification-center";

interface TeamInvite {
  username: string;
  invitedBy: string;
  createdAt: string;
}

interface TeamMember {
  username: string;
  role: "manager" | "player" | "shotcaller" | "coach";
  mainRoles?: string[];
}

interface Team {
  id: number;
  name: string;
  avatarUrl?: string;
  managerUsername: string;
  tournaments: string[];
  members: TeamMember[];
  invites: TeamInvite[];
  createdAt: string;
}

const TEAM_TOURNAMENT_OPTIONS = [
  { value: "FSEL", label: "FSEL Female Saudi Esports League" },
  { value: "SEL", label: "SEL Saudi Esports League" },
  { value: "FIL", label: "FIL Faceit League" },
];

const TEAM_MEMBER_ROLE_OPTIONS = [
  { value: "player", label: "Player" },
  { value: "shotcaller", label: "Shotcaller" },
  { value: "coach", label: "Coach" },
] as const;

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [leaderRole, setLeaderRole] = useState("");
  const [battleTag, setBattleTag] = useState("");
  const [discordTag, setDiscordTag] = useState("");
  const [rank, setRank] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteUsernames, setInviteUsernames] = useState("");
  const [teamTournaments, setTeamTournaments] = useState<string[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [responding, setResponding] = useState(false);
  const [uploadingTeamAvatar, setUploadingTeamAvatar] = useState(false);
  const [savingTournaments, setSavingTournaments] = useState(false);
  const [updatingMemberUsername, setUpdatingMemberUsername] = useState("");
  const [kickingMemberUsername, setKickingMemberUsername] = useState("");

  const refreshData = async () => {
    const [sessionResponse, teamResponse] = await Promise.all([
      fetch("/api/account/session?soft=1", { cache: "no-store" }),
      fetch("/api/team", { cache: "no-store" }),
    ]);

    if (!sessionResponse.ok) {
      setAccountName("");
      setLeaderRole("");
      setTeam(null);
      setLoading(false);
      return;
    }

    const sessionData = (await sessionResponse.json()) as {
      account?: {
        username?: string;
        accountProfile?: {
          battleTag?: string;
          discordTag?: string;
        };
        gameProfile?: {
          leaderRole?: string;
          rank?: string;
          eloRange?: string;
        };
      };
    };

    setAccountName(typeof sessionData.account?.username === "string" ? sessionData.account.username : "");
    setLeaderRole(typeof sessionData.account?.gameProfile?.leaderRole === "string" ? sessionData.account.gameProfile.leaderRole : "");
    setBattleTag(typeof sessionData.account?.accountProfile?.battleTag === "string" ? sessionData.account.accountProfile.battleTag : "");
    setDiscordTag(typeof sessionData.account?.accountProfile?.discordTag === "string" ? sessionData.account.accountProfile.discordTag : "");
    setRank(typeof sessionData.account?.gameProfile?.rank === "string" ? sessionData.account.gameProfile.rank : "");

    if (teamResponse.ok) {
      const teamData = (await teamResponse.json()) as { team?: Team | null };
      setTeam(teamData.team || null);
    } else {
      setTeam(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshData().catch(() => {
      setLoading(false);
      setError("Could not load team data.");
    });
  }, []);

  useEffect(() => {
    setTeamTournaments(Array.isArray(team?.tournaments) ? team.tournaments : []);
  }, [team?.id, team?.tournaments]);

  const createTeam = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setCreating(true);
    try {
      const inviteList = inviteUsernames
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          invites: inviteList,
        }),
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not create team.");
        setCreating(false);
        return;
      }

      setTeam(data.team || null);
      setInfo("Team created.");
      setTeamName("");
      setInviteUsernames("");
      setCreating(false);
    } catch {
      setError("Could not create team.");
      setCreating(false);
    }
  };

  const inviteToTeam = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!inviteUsername.trim()) {
      setError("Enter a username to invite.");
      return;
    }

    setInviting(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inviteUsername }),
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not send invite.");
        setInviting(false);
        return;
      }

      setTeam(data.team || null);
      setInfo("Invite sent.");
      setInviteUsername("");
      setInviting(false);
    } catch {
      setError("Could not send invite.");
      setInviting(false);
    }
  };

  const respondInvite = async (action: "accept" | "decline") => {
    setError("");
    setInfo("");
    setResponding(true);

    try {
      const response = await fetch("/api/team/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not update invite.");
        setResponding(false);
        return;
      }

      setTeam(data.team || null);
      setInfo(action === "accept" ? "Invite accepted." : "Invite declined.");
      setResponding(false);
    } catch {
      setError("Could not update invite.");
      setResponding(false);
    }
  };

  const uploadTeamAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setInfo("");
    setUploadingTeamAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/team/avatar", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not upload team picture.");
        setUploadingTeamAvatar(false);
        return;
      }

      setTeam(data.team || null);
      setInfo("Team picture updated.");
      setUploadingTeamAvatar(false);
    } catch {
      setError("Could not upload team picture.");
      setUploadingTeamAvatar(false);
    } finally {
      event.target.value = "";
    }
  };

  const saveTeamTournaments = async () => {
    if (!team) {
      return;
    }

    setError("");
    setInfo("");
    setSavingTournaments(true);

    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournaments: teamTournaments }),
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not update tournaments.");
        setSavingTournaments(false);
        return;
      }

      setTeam(data.team || null);
      setInfo("Team tournaments updated.");
      setSavingTournaments(false);
    } catch {
      setError("Could not update tournaments.");
      setSavingTournaments(false);
    }
  };

  const updateMemberRole = async (memberUsername: string, role: "player" | "shotcaller" | "coach") => {
    if (!team) {
      return;
    }

    setError("");
    setInfo("");
    setUpdatingMemberUsername(memberUsername);

    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberUsername,
          memberRole: role,
        }),
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not update member role.");
        setUpdatingMemberUsername("");
        return;
      }

      setTeam(data.team || null);
      setInfo(`${memberUsername} is now ${role}.`);
      setUpdatingMemberUsername("");
    } catch {
      setError("Could not update member role.");
      setUpdatingMemberUsername("");
    }
  };

  const kickMember = async (memberUsername: string) => {
    if (!team) {
      return;
    }

    setError("");
    setInfo("");
    setKickingMemberUsername(memberUsername);

    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeMemberUsername: memberUsername }),
      });

      const data = (await response.json()) as { error?: string; team?: Team };
      if (!response.ok) {
        setError(data.error || "Could not remove member.");
        setKickingMemberUsername("");
        return;
      }

      setTeam(data.team || null);
      setInfo(`${memberUsername} removed from team.`);
      setKickingMemberUsername("");
    } catch {
      setError("Could not remove member.");
      setKickingMemberUsername("");
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Loading team...</div>;
  }

  if (!accountName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-300">
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
          <p>Please log in to manage teams.</p>
          <Link href="/account/login?next=/team" className="inline-block rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black hover:bg-orange-600">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const isManager = leaderRole === "Manager";
  const isTeamManager = team && team.managerUsername.toLowerCase() === accountName.toLowerCase();
  const hasPendingInvite = team && team.invites.some((invite) => invite.username.toLowerCase() === accountName.toLowerCase());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,#060606_0%,#111114_45%,#09090b_100%)] text-white">
      <div className="mx-auto min-h-screen max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">Team Control</p>
            <h1 className="mt-2 text-5xl font-black tracking-wide">My Team</h1>
            <p className="mt-2 text-sm text-zinc-400">Create your roster, invite players, and manage membership from one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <Link href="/" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white">← Back to Feed</Link>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        {info ? <p className="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{info}</p> : null}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6 rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
            <div className="rounded-[1.75rem] border border-zinc-800 bg-[linear-gradient(180deg,rgba(249,115,22,0.12),rgba(20,20,24,0.95))] p-6 text-center">
              {team?.avatarUrl ? (
                <img src={team.avatarUrl} alt={`${team.name} avatar`} className="mx-auto h-36 w-36 rounded-full border-2 border-zinc-700 object-cover shadow-[0_0_35px_rgba(249,115,22,0.15)]" />
              ) : (
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-6xl">🛡️</div>
              )}
                <p className="mt-5 font-heading text-3xl font-black">{team?.name || "No Team Yet"}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">{team ? "Team Profile" : "Team Not Created"}</p>
              <p className="mt-3 text-sm text-zinc-300">Manager: <span className="font-semibold text-white">{team?.managerUsername || accountName}</span></p>
              {battleTag ? <p className="mt-4 text-sm font-semibold text-zinc-200">{battleTag}</p> : null}
              {discordTag ? <p className="mt-1 text-xs text-zinc-400">Discord: {discordTag}</p> : null}
              {isTeamManager && team ? (
                <label className="mt-5 inline-block cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800">
                  {uploadingTeamAvatar ? "Uploading..." : "Upload Team Picture"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={uploadTeamAvatar}
                    className="hidden"
                    disabled={uploadingTeamAvatar}
                  />
                </label>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Scrim Rank</p>
                <p className="mt-2 font-mono text-lg font-bold text-white">{rank ? rank.toUpperCase() : "—"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Manager Access</p>
              {isManager ? (
                <p className="mt-3 text-zinc-200">Your profile role is <span className="font-semibold text-orange-300">Manager</span>, so you can create a team and invite players.</p>
              ) : (
                <p className="mt-3 text-zinc-400">Set your profile position to <span className="font-semibold text-orange-300">Manager</span> if you want team creation and invite permissions.</p>
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {!isManager ? (
              <div className="rounded-[2rem] border border-orange-500/30 bg-orange-500/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Manager Required</p>
                <h2 className="mt-2 text-2xl font-black text-white">You have to be a manager to create a team.</h2>
                <p className="mt-2 text-sm text-zinc-300">Open your profile and change your position to <span className="font-semibold text-orange-300">Manager</span> if you want team creation and invite permissions.</p>
              </div>
            ) : null}

            {!team && isManager ? (
              <form onSubmit={createTeam} className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Create</p>
                    <h2 className="mt-2 text-3xl font-black">Build Your Team</h2>
                    <p className="mt-2 text-sm text-zinc-400">Start a team under your manager account and optionally send initial invites right away.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block space-y-2 text-sm">
                    <span className="font-semibold text-zinc-300">Team Name</span>
                    <input
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none transition hover:border-orange-500/40 focus:border-orange-500/60"
                      maxLength={64}
                      placeholder="Your team name"
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span className="font-semibold text-zinc-300">Initial Invites</span>
                    <input
                      value={inviteUsernames}
                      onChange={(event) => setInviteUsernames(event.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none transition hover:border-orange-500/40 focus:border-orange-500/60"
                      placeholder="user1, user2"
                    />
                  </label>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black transition hover:bg-orange-600 disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Create Team"}
                  </button>
                  <span className="text-sm text-zinc-500">Only managers can create a team.</span>
                </div>
              </form>
            ) : null}

            {team ? (
              <div className="space-y-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
                <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Active Team</p>
                    <h2 className="mt-2 text-4xl font-black">{team.name}</h2>
                    <p className="mt-2 text-sm text-zinc-400">Managed by <span className="font-semibold text-zinc-200">{team.managerUsername}</span></p>
                    <p className="mt-2 text-sm text-zinc-400">Tournaments: <span className="font-semibold text-zinc-200">{team.tournaments.length > 0 ? team.tournaments.join(", ") : "None"}</span></p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Members</p>
                      <p className="mt-2 font-heading text-2xl font-black">{team.members.length}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Invites</p>
                      <p className="mt-2 font-heading text-2xl font-black">{team.invites.length}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center sm:col-span-1 col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Role</p>
                      <p className="mt-2 text-base font-bold text-orange-300">{isTeamManager ? "Manager" : hasPendingInvite ? "Invited" : "Member"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Roster</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {team.members.map((member) => {
                          const isMemberManager = member.username.toLowerCase() === team.managerUsername.toLowerCase();
                          const canManageMember = isTeamManager && !isMemberManager;
                          const roleLabel = isMemberManager
                            ? "Manager"
                            : TEAM_MEMBER_ROLE_OPTIONS.find((option) => option.value === member.role)?.label || "Player";

                          return (
                            <div key={member.username} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-white">{member.username}</p>
                                  {member.mainRoles && member.mainRoles.length > 0 ? (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {member.mainRoles.map((mainRole) => (
                                        <span key={mainRole} className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300">
                                          {mainRole}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">
                                  {roleLabel}
                                </span>
                              </div>

                              {canManageMember ? (
                                <div className="mt-4 space-y-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Manage Member</p>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <select
                                      value={member.role}
                                      onChange={(event) => {
                                        const nextRole = event.target.value as "player" | "shotcaller" | "coach";
                                        updateMemberRole(member.username, nextRole).catch(() => {
                                          setError("Could not update member role.");
                                        });
                                      }}
                                      disabled={updatingMemberUsername === member.username || kickingMemberUsername === member.username}
                                      className="min-w-0 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 outline-none transition hover:border-orange-500/40 focus:border-orange-500/60 sm:flex-1"
                                    >
                                      {TEAM_MEMBER_ROLE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        kickMember(member.username).catch(() => {
                                          setError("Could not remove member.");
                                        });
                                      }}
                                      disabled={kickingMemberUsername === member.username || updatingMemberUsername === member.username}
                                      className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-300 transition hover:bg-red-500/20 disabled:opacity-60 sm:w-auto"
                                    >
                                      {kickingMemberUsername === member.username ? "Removing..." : "Kick"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Pending Invites</p>
                      {team.invites.length > 0 ? (
                        <div className="space-y-3">
                          {team.invites.map((invite) => (
                            <div key={invite.username} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                              <div>
                                <p className="font-semibold text-white">{invite.username}</p>
                                <p className="mt-1 text-xs text-zinc-500">Invited by {invite.invitedBy}</p>
                              </div>
                              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-300">Pending</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">No pending invites.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {isTeamManager ? (
                      <form onSubmit={inviteToTeam} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Invite Player</p>
                        <p className="mt-2 text-sm text-zinc-400">Invite a player by account username.</p>
                        <div className="mt-4 space-y-3">
                          <input
                            value={inviteUsername}
                            onChange={(event) => setInviteUsername(event.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none transition hover:border-orange-500/40 focus:border-orange-500/60"
                            placeholder="Username"
                          />
                          <button
                            type="submit"
                            disabled={inviting}
                            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-600 disabled:opacity-60"
                          >
                            {inviting ? "Inviting..." : "Send Invite"}
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {isTeamManager ? (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Tournaments</p>
                        <p className="mt-2 text-sm text-zinc-400">Choose the tournaments your team is competing in.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {TEAM_TOURNAMENT_OPTIONS.map((option) => {
                            const selected = teamTournaments.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  if (selected) {
                                    setTeamTournaments((prev) => prev.filter((entry) => entry !== option.value));
                                  } else {
                                    setTeamTournaments((prev) => [...prev, option.value]);
                                  }
                                }}
                                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={saveTeamTournaments}
                          disabled={savingTournaments}
                          className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-600 disabled:opacity-60"
                        >
                          {savingTournaments ? "Saving..." : "Save Tournaments"}
                        </button>
                      </div>
                    ) : null}

                    {hasPendingInvite ? (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Team Invite</p>
                        <p className="mt-2 text-sm text-zinc-400">You have a pending invite to join <span className="font-semibold text-white">{team.name}</span>.</p>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => respondInvite("accept")}
                            disabled={responding}
                            className="rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-green-600 disabled:opacity-60"
                          >
                            Accept Invite
                          </button>
                          <button
                            type="button"
                            onClick={() => respondInvite("decline")}
                            disabled={responding}
                            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!isManager && !team ? (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 text-sm text-zinc-400">
                        <p className="font-semibold text-zinc-200">No team linked yet.</p>
                        <p className="mt-2">If a manager invites you, it will appear here. If you want to create your own team, switch your profile role to <span className="font-semibold text-orange-300">Manager</span>.</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
