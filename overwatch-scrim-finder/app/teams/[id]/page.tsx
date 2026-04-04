import Link from "next/link";
import { notFound } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import { getAccountRecordByUsername } from "@/lib/accounts-store";
import { getAllTeams } from "@/lib/teams-store";
import { formatRoleList } from "@/lib/utils";

interface TeamPageProps {
  params: Promise<{ id: string }>;
}

const getRoleLabel = (role: string, mainRoles?: string[]) => {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === "manager") return "Manager";
  if (normalizedRole === "coach") return "Coach";
  if (normalizedRole === "shotcaller") return "Shotcaller";
  return formatRoleList(Array.isArray(mainRoles) ? mainRoles : []) || "Player";
};

export default async function TeamDetailsPage({ params }: TeamPageProps) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    notFound();
  }

  const teams = await getAllTeams();
  const team = teams.find((entry) => entry.id === teamId);
  if (!team) {
    notFound();
  }

  const managerAccount = await getAccountRecordByUsername(team.managerUsername);
  const members = await Promise.all(
    team.members.map(async (member) => {
      const account = await getAccountRecordByUsername(member.username);
      return {
        ...member,
        avatarUrl: account?.accountProfile?.avatarUrl || "",
        mainRoles:
          Array.isArray(account?.gameProfile?.mainRole) && account.gameProfile.mainRole.length > 0
            ? account.gameProfile.mainRole
            : (member.mainRoles ?? []),
      };
    }),
  );

  const scrimRank = managerAccount?.gameProfile?.rank?.trim() || managerAccount?.gameProfile?.eloRange?.trim() || "—";
  const region = Array.isArray(managerAccount?.gameProfile?.region) ? managerAccount.gameProfile.region : [];
  const managerDiscord = managerAccount?.accountProfile?.discordTag || managerAccount?.accountProfile?.discordUsername || "";
  const orderedMembers = [...members].sort((left, right) => {
    if (left.role === right.role) {
      return left.username.localeCompare(right.username);
    }

    const roleOrder: Record<string, number> = { manager: 0, coach: 1, shotcaller: 2, player: 3 };
    return (roleOrder[left.role] ?? 9) - (roleOrder[right.role] ?? 9);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/teams" className="text-sm font-semibold text-zinc-400 hover:text-zinc-200">
            ← Back to teams
          </Link>
          <NotificationCenter />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              {team.avatarUrl ? (
                <img src={team.avatarUrl} alt={`${team.name} avatar`} className="h-24 w-24 rounded-2xl border border-zinc-700 object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-4xl font-black text-orange-400">
                  {team.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-black text-white">{team.name}</h1>
                <p className="mt-1 text-sm text-zinc-400">Managed by {team.managerUsername}</p>
                {team.bio ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{team.bio}</p> : null}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Manager Contact</p>
              <p className="mt-2 font-semibold text-zinc-100">{team.managerUsername}</p>
              {managerDiscord ? <p className="mt-1 text-indigo-300">Discord: {managerDiscord}</p> : null}
              <Link
                href={`/messages?to=${encodeURIComponent(team.managerUsername)}`}
                className="mt-3 inline-flex rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200 transition hover:bg-orange-500/20"
              >
                Message Manager
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Scrim Rank</p>
              <p className="mt-1 text-lg font-bold text-orange-300">{scrimRank}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Region</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{region.length > 0 ? region.join(" • ") : "—"}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Players</p>
              <p className="mt-1 text-lg font-bold text-zinc-100">
                {members.filter((member) => member.role === "player" || member.role === "shotcaller").length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tournaments</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{team.tournaments.length > 0 ? team.tournaments.join(", ") : "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <h2 className="text-xl font-black text-white">Roster</h2>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              {orderedMembers.length} members
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orderedMembers.map((member) => (
              <div key={member.username} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center gap-3">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.username} className="h-12 w-12 rounded-full border border-zinc-700 object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-black text-orange-300">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-100">{member.username}</p>
                    <p className="text-sm text-zinc-400">{getRoleLabel(member.role, member.mainRoles)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}