"use client";

import { useState, useEffect, ChangeEvent, ButtonHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import { formatRoleList } from "@/lib/utils";

// ── UI primitives ────────────────────────────────────────────────────────────

const Button = ({
  children,
  className,
  ...props
}: { children: ReactNode; className: string } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`px-4 py-2 rounded-xl ${className}`} {...props}>
    {children}
  </button>
);

const SelectField = ({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={`w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:border-orange-500/40 focus:border-orange-500/50 ${className || ""}`}
    {...props}
  >
    {children}
  </select>
);

const MultiSelectField = ({
  label,
  options,
  selectedValues,
  onToggle,
  className,
  placeholder,
  inlineOptions = false,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  className?: string;
  placeholder?: string;
  inlineOptions?: boolean;
}) => {
  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder || "Select"
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <details className={`relative ${className || ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:border-orange-500/40">
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <span className="ml-3 text-xs text-zinc-400">▾</span>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-full min-w-[13rem] rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
        <div className={inlineOptions ? "flex flex-wrap gap-2" : "space-y-1"}>
          {options.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md px-2 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800 ${inlineOptions ? "inline-flex items-center gap-2 border border-zinc-700 bg-zinc-800/60" : "flex items-center gap-2"}`}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className="accent-orange-500"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
};

// ── Constants ────────────────────────────────────────────────────────────────

const POST_REGION_OPTIONS = [
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "EMEA", label: "EMEA" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "APAC", label: "APAC" },
];

const LFP_ROLE_OPTIONS = [
  { value: "Tank", label: "Tank" },
  { value: "FPDS", label: "Flex DPS" },
  { value: "HS", label: "Hitscan" },
  { value: "FS", label: "Flex Support" },
  { value: "MS", label: "Main Support" },
];

const RANK_OPTIONS = [
  { value: "3000", label: "3000" },
  { value: "3500", label: "3500" },
  { value: "4000", label: "4000" },
  { value: "4500", label: "4500" },
  { value: "open", label: "OPEN" },
  { value: "adv", label: "ADV" },
  { value: "expert", label: "EXPERT" },
  { value: "master", label: "MASTER" },
  { value: "owcs", label: "OWCS" },
];

const OW_RANK_OPTIONS = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "diamond", label: "Diamond" },
  { value: "master", label: "Master" },
  { value: "grandmaster", label: "Grandmaster" },
  { value: "champion", label: "Champion" },
];

const TOURNAMENT_OPTIONS = [
  { value: "FSEL", label: "FSEL" },
  { value: "SEL", label: "SEL" },
  { value: "FIL", label: "FIL" },
];

const formatTeamRole = (role: string) => {
  const normalized = role.trim().toLowerCase();
  if (normalized === "manager") return "Manager";
  if (normalized === "coach") return "Coach";
  if (normalized === "shotcaller") return "Shotcaller";
  if (normalized === "player") return "Player";
  return role;
};

const showMainRoleForMember = (role: string) => {
  const normalized = role.trim().toLowerCase();
  return normalized !== "manager" && normalized !== "coach";
};

const getRosterCategoryLabel = (role: string, mainRoles?: string[]) => {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === "manager") return "Manager";
  if (normalizedRole === "coach") return "Coach";

  const roles = Array.isArray(mainRoles) ? mainRoles : [];
  if (roles.includes("Tank")) return "Tank";
  if (roles.some((entry) => entry === "FS" || entry === "MS")) return "Healer";
  if (roles.some((entry) => entry === "FPDS" || entry === "HS")) return "DPS";
  return formatTeamRole(role);
};

const getRosterCategoryPriority = (role: string, mainRoles?: string[]) => {
  const category = getRosterCategoryLabel(role, mainRoles);
  if (category === "Manager") return 0;
  if (category === "Coach") return 1;
  if (category === "Tank") return 2;
  if (category === "Healer") return 3;
  if (category === "DPS") return 4;
  return 5;
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function CreatePostPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const [accountName, setAccountName] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [accountLeaderRole, setAccountLeaderRole] = useState("Player");
  const [profileMainRoles, setProfileMainRoles] = useState<string[]>([]);
  const [rank, setRank] = useState("");
  const [owRank, setOwRank] = useState("");
  const [region, setRegion] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [lookingForRoles, setLookingForRoles] = useState<string[]>([]);
  const [tournamentsInterested, setTournamentsInterested] = useState<string[]>([]);
  const [currentTeam, setCurrentTeam] = useState<{
    id: number;
    name: string;
    tournaments?: string[];
    members: Array<{ username: string; role: string; mainRoles?: string[] }>;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canCreateTeamLfp = accountLeaderRole === "Manager";
  const isTeamPost = canCreateTeamLfp && Boolean(currentTeam);

  const handleLogout = async () => {
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/account/session", { cache: "no-store" });
        if (!response.ok) {
          router.replace("/account/create?next=/account/profile");
          return;
        }
        const data = (await response.json()) as {
          account?: {
            username?: string;
            accountProfile?: {
              avatarUrl?: string;
            };
            gameProfile?: {
              rank?: string;
              region?: string[];
              leaderRole?: string;
              mainRole?: string[];
            };
          };
        };
        if (!data.account?.username) {
          router.replace("/account/create?next=/account/profile");
          return;
        }
        setAccountName(data.account.username);
        setAccountAvatarUrl(typeof data.account.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "");
        if (typeof data.account.gameProfile?.rank === "string") {
          setRank(data.account.gameProfile.rank);
        }
        if (Array.isArray(data.account.gameProfile?.region)) {
          setRegion(data.account.gameProfile.region);
        }
        if (typeof data.account.gameProfile?.leaderRole === "string") {
          setAccountLeaderRole(data.account.gameProfile.leaderRole);
        }
        if (Array.isArray(data.account.gameProfile?.mainRole)) {
          setProfileMainRoles(data.account.gameProfile.mainRole.filter((entry): entry is string => typeof entry === "string"));
        }

        const teamResponse = await fetch("/api/team", { cache: "no-store" });
        if (teamResponse.ok) {
          const teamData = (await teamResponse.json()) as {
            team?: {
              id?: number;
              name?: string;
              tournaments?: string[];
              members?: Array<{ username?: string; role?: string; mainRoles?: string[] }>;
            };
          };
          if (teamData.team?.id && teamData.team?.name && Array.isArray(teamData.team.members)) {
            setCurrentTeam({
              id: teamData.team.id,
              name: teamData.team.name,
              tournaments:
                Array.isArray(teamData.team.tournaments) &&
                teamData.team.tournaments.every((entry) => typeof entry === "string")
                  ? teamData.team.tournaments
                  : [],
              members: teamData.team.members
                .filter((member) => typeof member.username === "string" && typeof member.role === "string")
                .map((member) => ({
                  username: member.username as string,
                  role: member.role as string,
                  mainRoles: Array.isArray(member.mainRoles)
                    ? member.mainRoles.filter((entry): entry is string => typeof entry === "string")
                    : undefined,
                })),
            });
            setTournamentsInterested(
              Array.isArray(teamData.team.tournaments) &&
                teamData.team.tournaments.every((entry) => typeof entry === "string")
                ? teamData.team.tournaments
                : [],
            );
          }
        }
        setCheckingSession(false);
      } catch {
        router.replace("/account/create?next=/account/profile");
      }
    };

    verifySession();
  }, [router]);

  const toggleRegion = (value: string) =>
    setRegion((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const toggleTournamentsInterested = (value: string) =>
    setTournamentsInterested((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const toggleLookingForRole = (value: string) =>
    setLookingForRoles((prev) =>
      prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value],
    );

  const submit = async () => {
    if (!accountName || !rank || region.length === 0 || (!isTeamPost && !owRank)) {
      alert("Please fill in all required fields.");
      return;
    }

    if (isTeamPost && !currentTeam) {
      alert("You must be in a team to create a Team LFP post.");
      return;
    }
    if (!lookingFor.trim()) {
      alert(`Please fill in the ${isTeamPost ? "About Us" : "About Me"} section.`);
      return;
    }
    if (isTeamPost && lookingForRoles.length === 0) {
      alert("Please select at least one role your team is looking for.");
      return;
    }
    if (tournamentsInterested.length === 0) {
      alert("Please select at least one tournament you are interested in.");
      return;
    }

    setSubmitting(true);
    const isCoachAccountPost = !isTeamPost && accountLeaderRole.trim().toLowerCase() === "coach";
    const accountPostMainRoles = isCoachAccountPost ? [] : profileMainRoles;
    const accountPostMemberRole = isCoachAccountPost ? "coach" : "player";

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: isTeamPost ? currentTeam?.name : accountName,
          postType: isTeamPost ? "team-lfp" : "account",
          eloRange: rank,
          owRank: isTeamPost ? undefined : owRank,
          region,
          leader: isTeamPost ? currentTeam?.name : accountName,
          avatarUrl: accountAvatarUrl,
          leaderRole: isTeamPost ? "Team" : isCoachAccountPost ? "Coach" : "Player",
          members: isTeamPost
            ? currentTeam?.members.map((member) => ({
                name: member.username,
                rank: "Team Member",
                role: member.role,
                mainRole: member.mainRoles || [],
              }))
            : [
                {
                  name: accountName,
                  rank: owRank,
                  role: accountPostMemberRole,
                  mainRole: accountPostMainRoles,
                },
              ],
          mainRole: accountPostMainRoles,
          lookingFor,
          lookingForRoles: isTeamPost ? lookingForRoles : [],
          tournaments: tournamentsInterested,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/account/create?next=/account/profile");
          return;
        }
        alert("Could not save post. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`Account "${accountName}" posted successfully!`);
      setTimeout(() => {
        router.push("/");
      }, 1400);
    } catch {
      alert("Could not save post. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      {checkingSession ? (
        <div className="flex min-h-screen items-center justify-center text-zinc-400">Checking account session...</div>
      ) : (
        <>
      {/* PAGE BODY */}
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-wide text-white">{isTeamPost ? "Create Team LFP Post" : "Create Player LFT Post"}</h1>
          <p className="mt-1 text-zinc-400">
            {isTeamPost
              ? "Post as your team and describe exactly what your roster is looking for."
              : "Post yourself and describe what kind of team you are looking for."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isTeamPost ? (
            <span className="self-center rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-300">
              Team LFP (Manager)
            </span>
          ) : (
            <span className="self-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-300">
              Player LFT
            </span>
          )}
          <span className="self-center text-xs text-zinc-400">
            {isTeamPost ? `Posting for ${currentTeam?.name}` : `Posting as ${accountName}`}
          </span>
        </div>

        {successMessage && (
          <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-400 font-semibold">
            {successMessage} — redirecting…
          </div>
        )}

        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{isTeamPost ? "Team Name" : "Player"}</label>
              <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white">{isTeamPost ? currentTeam?.name || "No team" : accountName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Scrim Rank <span className="text-orange-500">*</span></label>
              <SelectField
                value={rank}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setRank(e.target.value)}
              >
                <option value="">Select scrim rank</option>
                {RANK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Region <span className="text-orange-500">*</span></label>
              <MultiSelectField
                label="Region"
                options={POST_REGION_OPTIONS}
                selectedValues={region}
                onToggle={toggleRegion}
                className="w-full"
                placeholder="Select regions"
                inlineOptions={false}
              />
            </div>
            <div className="space-y-1">
              {isTeamPost ? (
                <>
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">OW Rank</label>
                  <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
                    Not required for Team LFP posts.
                  </p>
                </>
              ) : (
                <>
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">OW Rank <span className="text-orange-500">*</span></label>
                  <SelectField
                    value={owRank}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setOwRank(e.target.value)}
                  >
                    <option value="">Select OW rank</option>
                    {OW_RANK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </SelectField>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Tournaments Interested In <span className="text-orange-500">*</span></label>
              <MultiSelectField
                label="Tournaments Interested In"
                options={TOURNAMENT_OPTIONS}
                selectedValues={tournamentsInterested}
                onToggle={toggleTournamentsInterested}
                className="w-full"
                placeholder="Select tournaments"
                inlineOptions={false}
              />
            </div>
            <div className="space-y-1">
              {isTeamPost ? (
                <>
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Looking For Roles <span className="text-orange-500">*</span></label>
                  <MultiSelectField
                    label="Looking For Roles"
                    options={LFP_ROLE_OPTIONS}
                    selectedValues={lookingForRoles}
                    onToggle={toggleLookingForRole}
                    className="w-full"
                    placeholder="Select roles"
                    inlineOptions={false}
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{isTeamPost ? "About Us" : "About Me"} <span className="text-orange-500">*</span></label>
            <textarea
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              className="min-h-[90px] w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-white outline-none transition hover:border-orange-500/40 focus:border-orange-500/50"
              maxLength={400}
              placeholder={isTeamPost ? "Write a short intro about your team, schedule, and requirements..." : "Write a short intro about yourself, role, and what kind of team environment you want..."}
            />
            <p className="text-xs text-zinc-500">Shown on your post card.</p>
          </div>

          {isTeamPost && currentTeam ? (
            <div className="space-y-2 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Team Roster</p>
              <div className="space-y-2">
                {[...currentTeam.members]
                  .sort((leftMember, rightMember) => {
                    const leftPriority = getRosterCategoryPriority(leftMember.role, leftMember.mainRoles);
                    const rightPriority = getRosterCategoryPriority(rightMember.role, rightMember.mainRoles);
                    if (leftPriority !== rightPriority) {
                      return leftPriority - rightPriority;
                    }
                    return leftMember.username.localeCompare(rightMember.username);
                  })
                  .map((member) => (
                  <div key={member.username} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm">
                    <span className="font-semibold text-zinc-100">{member.username}</span>
                    <div className="text-right">
                      <p className="text-zinc-300">{getRosterCategoryLabel(member.role, member.mainRoles)}</p>
                      {showMainRoleForMember(member.role) ? (
                        <p className="text-xs text-orange-300">
                          {member.mainRoles && member.mainRoles.length > 0 ? formatRoleList(member.mainRoles) : "No main role"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Your Main Roles</p>
              <p className="text-sm text-zinc-200">{profileMainRoles.length > 0 ? formatRoleList(profileMainRoles) : "Not set on profile"}</p>
            </div>
          )}
        </div>

        {/* SUBMIT */}
        <div className="flex items-center gap-4">
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-lg font-bold px-10 disabled:opacity-60"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Creating…" : "CREATE POST"}
          </Button>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Back to listings
          </Link>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
