"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMemberEnriched {
  username: string;
  role: "manager" | "player" | "shotcaller" | "coach";
  mainRoles?: string[];
  avatarUrl?: string;
  region?: string[];
}

interface TeamEnriched {
  id: number;
  name: string;
  avatarUrl?: string;
  bio?: string;
  scrimRank?: string;
  managerUsername: string;
  tournaments: string[];
  members: TeamMemberEnriched[];
  region: string[];
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRoleLabel = (member: TeamMemberEnriched): string => {
  const r = member.role.toLowerCase();
  if (r === "manager") return "Manager";
  if (r === "coach") return "Coach";
  if (r === "shotcaller") return "Shotcaller";
  const main = member.mainRoles?.[0] ?? "";
  if (main === "Tank") return "Tank";
  if (main === "Hitscan") return "Hitscan";
  if (main === "Flex DPS") return "Flex DPS";
  if (main === "Main Support") return "Main Sup";
  if (main === "Flex Support") return "Flex Sup";
  return "Player";
};

const getRoleSortKey = (member: TeamMemberEnriched): number => {
  const label = getRoleLabel(member);
  const order: Record<string, number> = {
    Manager: 0, Coach: 1, Tank: 2, Hitscan: 3, "Flex DPS": 4,
    "Main Sup": 5, "Flex Sup": 6, Shotcaller: 7, Player: 8,
  };
  return order[label] ?? 9;
};

const sortedMembers = (members: TeamMemberEnriched[]) =>
  [...members].sort((a, b) => getRoleSortKey(a) - getRoleSortKey(b));

const ROLE_BADGE_STYLES: Record<string, string> = {
  Manager:    "bg-zinc-700/80 text-zinc-200 border border-zinc-600",
  Coach:      "bg-indigo-900/70 text-indigo-300 border border-indigo-700/50",
  Tank:       "bg-orange-900/70 text-orange-300 border border-orange-700/50",
  Hitscan:    "bg-red-900/70 text-red-300 border border-red-700/50",
  "Flex DPS": "bg-rose-900/70 text-rose-300 border border-rose-700/50",
  "Main Sup": "bg-green-900/70 text-green-300 border border-green-700/50",
  "Flex Sup": "bg-emerald-900/70 text-emerald-300 border border-emerald-700/50",
  Shotcaller: "bg-yellow-900/70 text-yellow-300 border border-yellow-700/50",
  Player:     "bg-zinc-800/80 text-zinc-300 border border-zinc-700",
};

const AVATAR_COLORS = [
  "bg-orange-500", "bg-blue-500", "bg-purple-500",
  "bg-green-500", "bg-pink-500", "bg-yellow-500",
  "bg-teal-500", "bg-red-500", "bg-indigo-500", "bg-cyan-500",
];

const getAvatarColor = (username: string) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ─── Member Avatar ─────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = "md" }: { member: TeamMemberEnriched; size?: "sm" | "md" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base";

  if (member.avatarUrl && !imgError) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.username}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover ring-2 ring-zinc-700 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-zinc-700 ${getAvatarColor(member.username)}`}
    >
      {member.username.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team }: { team: TeamEnriched }) {
  const [teamImgError, setTeamImgError] = useState(false);
  const ordered = sortedMembers(team.members);
  const playerCount = team.members.filter((m) => m.role === "player" || m.role === "shotcaller").length;
  const regionLabel = team.region.length > 0 ? team.region.join(" • ") : "—";
  const scrimRankLabel = team.scrimRank && team.scrimRank.trim().length > 0 ? team.scrimRank : "—";
  const teamHref = `/teams/${team.id}`;
  const rosterPreview = ordered.slice(0, 8);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[linear-gradient(160deg,rgba(30,24,26,0.98),rgba(18,15,18,1))] p-4 transition-all duration-200 hover:border-orange-500/50 hover:shadow-[0_0_24px_rgba(249,115,22,0.08)]">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-zinc-700 bg-zinc-800 flex items-center justify-center">
          {team.avatarUrl && !teamImgError ? (
            <img
              src={team.avatarUrl}
              alt={team.name}
              onError={() => setTeamImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-black text-orange-400 select-none">
              {team.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-white truncate leading-tight">{team.name}</h3>
          <p className="text-sm text-zinc-500 mt-0.5 truncate">
            Manager: <span className="text-zinc-300">{team.managerUsername}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Region</p>
          <p className="text-sm font-bold text-zinc-100 truncate px-1">{regionLabel}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Scrim Rank</p>
          <p className="text-sm font-bold text-orange-300 truncate px-1">{scrimRankLabel}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Players</p>
          <p className="text-sm font-bold text-zinc-100">{playerCount}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Total</p>
          <p className="text-sm font-bold text-zinc-100">{team.members.length}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Interested Tournaments</p>
        <div className="flex flex-wrap gap-1.5">
          {team.tournaments.length > 0 ? (
            team.tournaments.map((t) => (
              <span
                key={t}
                className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-orange-300"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-sm text-zinc-600">No tournaments</span>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2.5">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Roster Preview</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rosterPreview.map((member) => {
            const label = getRoleLabel(member);
            const badgeStyle = ROLE_BADGE_STYLES[label] ?? ROLE_BADGE_STYLES.Player;

            return (
              <div key={member.username} className="min-w-0 rounded-md border border-zinc-800/80 bg-zinc-900/70 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <MemberAvatar member={member} size="sm" />
                  <p className="truncate text-xs font-semibold text-zinc-100">{member.username}</p>
                </div>
                <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none ${badgeStyle}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {team.bio ? <p className="mt-3 text-sm text-zinc-300 leading-relaxed line-clamp-3">{team.bio}</p> : null}

      <div className="mt-4">
        <Link
          href={teamHref}
          className="inline-flex w-full items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/12 px-4 py-2.5 text-sm font-black uppercase tracking-[0.14em] text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/20 hover:text-white"
        >
          View Team
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [accountName, setAccountName] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [gridColumns, setGridColumns] = useState<1 | 2 | 4>(4);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        if (!res.ok) { setTeams([]); return; }
        const data = (await res.json()) as TeamEnriched[];
        setTeams(Array.isArray(data) ? data : []);
      } catch {
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    const loadAccount = async () => {
      try {
        const res = await fetch("/api/account/session?soft=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          account?: { username?: string; accountProfile?: { avatarUrl?: string } };
        };
        setAccountName(typeof data.account?.username === "string" ? data.account.username : "");
        setAccountAvatarUrl(typeof data.account?.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "");
      } catch { /* guest */ }
    };

    loadTeams();
    loadAccount();
  }, []);

  const handleLogout = async () => {
    try { await fetch("/api/account/logout", { method: "POST" }); } finally {
      setAccountName("");
      setAccountAvatarUrl("");
      router.refresh();
    }
  };

  const filtered = teams
    .filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "za") return b.name.localeCompare(a.name);
      return b.id - a.id;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div>
        <div className="space-y-6 p-4 sm:p-6">

          {/* Banner */}
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-orange-500/20 bg-zinc-900/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div>
              <h2 className="text-xl font-bold">All Teams</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Browse registered teams and quickly preview the roster.
              </p>
            </div>
            <span className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-300">
              {filtered.length} {filtered.length === 1 ? "team" : "teams"}
            </span>
          </div>

          {/* Layout Selector */}
          <div className="ml-auto flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              type="button"
              onClick={() => setGridColumns(1)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${gridColumns === 1 ? "bg-orange-500 text-black" : "text-zinc-300 hover:text-white"}`}
              title="1 column"
            >
              <span className="sr-only">1 column</span>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
                <rect x="4" y="4" width="12" height="12" rx="2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setGridColumns(2)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${gridColumns === 2 ? "bg-orange-500 text-black" : "text-zinc-300 hover:text-white"}`}
              title="2 columns"
            >
              <span className="sr-only">2 columns</span>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
                <rect x="2" y="4" width="7" height="12" rx="1.5" />
                <rect x="11" y="4" width="7" height="12" rx="1.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setGridColumns(4)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${gridColumns === 4 ? "bg-orange-500 text-black" : "text-zinc-300 hover:text-white"}`}
              title="4 columns"
            >
              <span className="sr-only">4 columns</span>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
                <rect x="2" y="2" width="7" height="7" rx="1.5" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" />
              </svg>
            </button>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className={`${gridColumns === 1 ? "space-y-4" : gridColumns === 2 ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"}`}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="min-h-[360px] rounded-2xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-500 text-sm">No teams found.</p>
          ) : (
            <div className={`${gridColumns === 1 ? "space-y-4" : gridColumns === 2 ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"}`}>
              {filtered.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

