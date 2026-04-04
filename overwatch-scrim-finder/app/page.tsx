"use client";
import { useState, useEffect, useMemo, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes } from "react";
import { useI18n } from "@/lib/i18n";

// 🔧 SIMPLE UI COMPONENTS
const Button = ({
  children,
  className,
  ...props
}: { children: ReactNode; className: string } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`px-4 py-2 rounded-xl ${className}`} {...props}>
    {children}
  </button>
);

const MultiSelectField = ({
  label,
  options,
  selectedValues,
  onToggle,
  onClear,
  className,
  placeholder,
  showLabel = true,
  showClearButton = true,
  compactSummary = false,
  inlineOptions = false,
  allLabel,
  clearLabel,
  selectedCountLabel,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  className?: string;
  placeholder?: string;
  showLabel?: boolean;
  showClearButton?: boolean;
  compactSummary?: boolean;
  inlineOptions?: boolean;
  allLabel?: string;
  clearLabel?: string;
  selectedCountLabel?: (count: number) => string;
}) => {
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);
  const emptyLabel = placeholder || allLabel || "All";
  const selectedSummary = compactSummary
    ? selectedLabels.length === 0
      ? emptyLabel
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : selectedCountLabel
          ? selectedCountLabel(selectedLabels.length)
          : `${selectedLabels.length} selected`
    : selectedLabels.length === 0
      ? emptyLabel
      : selectedLabels.join(", ");
  const summaryText = showLabel ? `${label}: ${selectedSummary}` : selectedSummary;

  return (
    <details className={`relative ${className || ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:border-orange-500/40">
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{summaryText}</span>
        <span className="ml-3 text-xs text-zinc-400">▾</span>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
        {showClearButton && (
          <button
            type="button"
            onClick={onClear}
            className="mb-2 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-orange-300 transition hover:border-orange-500/40 hover:text-orange-200"
          >
            {clearLabel || "Clear filters"}
          </button>
        )}
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

const SingleSelectMenu = ({
  label,
  options,
  selectedValue,
  onSelect,
  className,
  placeholder,
  showLabel = true,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  className?: string;
  placeholder?: string;
  showLabel?: boolean;
}) => {
  const selectedOption = options.find((option) => option.value === selectedValue);
  const fallbackLabel = placeholder || options[0]?.label || "All";
  const selectedLabel = selectedOption ? selectedOption.label : fallbackLabel;
  const summaryText = showLabel ? `${label}: ${selectedLabel}` : selectedLabel;

  return (
    <details className={`relative ${className || ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:border-orange-500/40">
        <span className="truncate">{summaryText}</span>
        <span className="ml-3 text-xs text-zinc-400">▾</span>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
        <div className="space-y-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(event) => {
                onSelect(option.value);
                const detailsElement = event.currentTarget.closest("details");
                if (detailsElement) {
                  detailsElement.open = false;
                }
              }}
              className={`w-full rounded-md px-2 py-1 text-left text-sm transition hover:bg-zinc-800 ${selectedValue === option.value ? "bg-zinc-800 text-orange-300" : "text-zinc-200"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
};

const REGION_FILTER_OPTIONS = [
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "EMEA", label: "EMEA" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "APAC", label: "APAC" },
];

const MAIN_ROLE_FILTER_OPTIONS = [
  { value: "Tank", label: "Tank" },
  { value: "FPDS", label: "Flex DPS" },
  { value: "HS", label: "Hitscan" },
  { value: "FS", label: "Flex Support" },
  { value: "MS", label: "Main Support" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "team-az", label: "Team A-Z" },
  { value: "team-za", label: "Team Z-A" },
];

const SEEKING_OPTIONS = [
  { value: "Player", label: "Player" },
  { value: "Manager", label: "Manager" },
  { value: "Coach", label: "Coach" },
  { value: "team-posts", label: "Team posts" },
];

const SCRIM_RANK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "3000", label: "3000" },
  { value: "3500", label: "3500" },
  { value: "4000", label: "4000" },
  { value: "4500", label: "4500+" },
  { value: "open", label: "Open" },
  { value: "adv", label: "Advanced" },
  { value: "expert", label: "Expert" },
  { value: "master", label: "Master" },
  { value: "owcs", label: "OWCS" },
];

const RANK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "diamond", label: "Diamond" },
  { value: "master", label: "Master" },
  { value: "grandmaster", label: "Grandmaster" },
  { value: "champion", label: "Champion" },
];

const REGION_LABEL_KEYS = {
  NA: "options.regions.NA",
  SA: "options.regions.SA",
  EMEA: "options.regions.EMEA",
  JP: "options.regions.JP",
  CN: "options.regions.CN",
  APAC: "options.regions.APAC",
} as const;

const SORT_LABEL_KEYS = {
  newest: "options.sort.newest",
  oldest: "options.sort.oldest",
  "team-az": "options.sort.teamAz",
  "team-za": "options.sort.teamZa",
} as const;

interface TeamMember {
  name: string;
  rank: string;
  role: string;
  mainRole?: string[];
}

interface Post {
  teamName: string;
  postType?: "account" | "team-lfp";
  eloRange: string;
  owRank?: string;
  region: string[];
  id: number;
  leader: string;
  ownerUsername?: string;
  avatarUrl?: string;
  joinedTeamName?: string;
  leaderRole: string;
  leaderRoles?: string[];
  mainRole: string[];
  tournaments?: string[];
  members: TeamMember[];
  lookingFor?: string;
  lookingForRoles?: string[];
  topPicks?: string[];
  bgImage?: string;
}

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

const sortRosterMembers = (members: TeamMember[]) =>
  [...members].sort((leftMember, rightMember) => {
    const leftPriority = getRosterCategoryPriority(leftMember.role, leftMember.mainRole);
    const rightPriority = getRosterCategoryPriority(rightMember.role, rightMember.mainRole);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return leftMember.name.localeCompare(rightMember.name);
  });

const formatOwRank = (rank?: string) => {
  if (!rank) {
    return "—";
  }
  return rank.charAt(0).toUpperCase() + rank.slice(1);
};

const getPostStatuses = (post: Post) => {
  if (Array.isArray(post.leaderRoles) && post.leaderRoles.length > 0) {
    return post.leaderRoles;
  }
  return [post.leaderRole || "Player"];
};

export default function ScrimFinderApp() {
  const router = useRouter();
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [mainRoleFilters, setMainRoleFilters] = useState<string[]>([]);
  const [seekingFilters, setSeekingFilters] = useState<string[]>([]);
  const [scrimRankFilter, setScrimRankFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [gridColumns, setGridColumns] = useState<1 | 2 | 4>(1);
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [accountLeaderRole, setAccountLeaderRole] = useState("");
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  const isManager = accountLeaderRole === "Manager";

  const translateRegion = (region: string) => {
    const key = REGION_LABEL_KEYS[region as keyof typeof REGION_LABEL_KEYS];
    return key ? t(key) : region;
  };

  const translateRole = (role: string) => {
    return role;
  };

  const translateSort = (value: string) => {
    const key = SORT_LABEL_KEYS[value as keyof typeof SORT_LABEL_KEYS];
    return key ? t(key) : value;
  };

  const translateScrimRank = (value: string) => {
    const normalized = value.toLowerCase();
    const matched = SCRIM_RANK_OPTIONS.find((option) => option.value === normalized);
    return matched ? matched.label : value.toUpperCase();
  };

  const translateRank = (value: string) => {
    const normalized = value.toLowerCase();
    const matched = RANK_OPTIONS.find((option) => option.value === normalized);
    return matched ? matched.label : formatOwRank(value);
  };

  const formatLocalizedRoleList = (roles: string[]) => roles.map((role) => translateRole(role)).join(", ");

  const formatLocalizedOwRank = (rank?: string) => {
    if (!rank) {
      return t("common.noDataDash");
    }

    return translateRank(rank.toLowerCase());
  };

  const localizedRegionOptions = useMemo(
    () =>
      REGION_FILTER_OPTIONS.map((option) => ({
        ...option,
        label: translateRegion(option.value),
      })),
    [t],
  );

  const localizedMainRoleOptions = useMemo(
    () =>
      MAIN_ROLE_FILTER_OPTIONS.map((option) => ({
        ...option,
      })),
    [],
  );

  const localizedSortOptions = useMemo(
    () =>
      SORT_OPTIONS.map((option) => ({
        ...option,
        label: translateSort(option.value),
      })),
    [t],
  );

  const localizedSeekingOptions = useMemo(
    () =>
      SEEKING_OPTIONS.map((option) => ({
        ...option,
      })),
    [],
  );

  const localizedScrimRankOptions = useMemo(
    () =>
      SCRIM_RANK_OPTIONS.map((option) => ({
        ...option,
      })),
    [],
  );

  const localizedRankOptions = useMemo(
    () =>
      RANK_OPTIONS.map((option) => ({
        ...option,
      })),
    [],
  );

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetch("/api/posts");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as Post[];
        setPosts(Array.isArray(data) ? data : []);
      } catch {
        setPosts([]);
      }
    };

    loadPosts();

    const loadAccount = async () => {
      try {
        const response = await fetch("/api/account/session?soft=1", { cache: "no-store" });
        if (!response.ok) {
          setAccountName("");
          setAccountAvatarUrl("");
          return;
        }

        const data = (await response.json()) as {
          account?: {
            username?: string;
            accountProfile?: { avatarUrl?: string };
            gameProfile?: { leaderRole?: string };
          };
        };
        setAccountName(typeof data.account?.username === "string" ? data.account.username : "");
        setAccountAvatarUrl(typeof data.account?.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "");
        setAccountLeaderRole(typeof data.account?.gameProfile?.leaderRole === "string" ? data.account.gameProfile.leaderRole : "");
      } catch {
        setAccountName("");
        setAccountAvatarUrl("");
        setAccountLeaderRole("");
      }
    };

    loadAccount();
  }, []);

  const openPostMenu = async () => {
    setCheckingAccount(true);
    try {
      const response = await fetch("/api/account/session?soft=1", { cache: "no-store" });
      if (!response.ok) {
        setAccountName("");
        setAccountAvatarUrl("");
        setAccountLeaderRole("");
      } else {
        const data = (await response.json()) as {
          account?: {
            username?: string;
            accountProfile?: { avatarUrl?: string };
            gameProfile?: { leaderRole?: string };
          };
        };
        setAccountName(typeof data.account?.username === "string" ? data.account.username : "");
        setAccountAvatarUrl(typeof data.account?.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "");
        setAccountLeaderRole(typeof data.account?.gameProfile?.leaderRole === "string" ? data.account.gameProfile.leaderRole : "");
      }
    } catch {
      setAccountName("");
      setAccountAvatarUrl("");
      setAccountLeaderRole("");
    } finally {
      setCheckingAccount(false);
      setIsPostMenuOpen(true);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    try {
      const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        alert(data?.error || "Could not delete post.");
        return;
      }

      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
    } finally {
      setDeletingPostId(null);
    }
  };

  const toggleArrayFilter = (
    currentValues: string[],
    nextValue: string,
    setValues: (values: string[]) => void,
  ) => {
    setValues(
      currentValues.includes(nextValue)
        ? currentValues.filter((value) => value !== nextValue)
        : [...currentValues, nextValue],
    );
  };

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        const nameMatch = post.teamName.toLowerCase().includes(searchTerm.toLowerCase());
        const regionMatch = regionFilters.length === 0 || post.region.some((value) => regionFilters.includes(value));
        const mainRoleMatch = mainRoleFilters.length === 0 || post.mainRole.some((value) => mainRoleFilters.includes(value));
        const postStatuses = getPostStatuses(post).map((status) => status.toLowerCase());
        const seekingMatch =
          seekingFilters.length === 0 ||
          seekingFilters.some((value) => {
            if (value === "team-posts") {
              return post.postType === "team-lfp";
            }
            return postStatuses.includes(value.toLowerCase());
          });
        const scrimRankMatch =
          scrimRankFilter === "all" || post.eloRange.toLowerCase() === scrimRankFilter.toLowerCase();
        const memberRanks = post.members.map((member) => member.rank.toLowerCase()).join(" ");
        const rankMatch = rankFilter === "all" || memberRanks.includes(rankFilter.toLowerCase());

        return nameMatch && regionMatch && mainRoleMatch && seekingMatch && scrimRankMatch && rankMatch;
      })
      .sort((leftPost, rightPost) => {
        if (sortBy === "oldest") {
          return leftPost.id - rightPost.id;
        }
        if (sortBy === "team-az") {
          return leftPost.teamName.localeCompare(rightPost.teamName);
        }
        if (sortBy === "team-za") {
          return rightPost.teamName.localeCompare(leftPost.teamName);
        }
        return rightPost.id - leftPost.id;
      });
  }, [
    posts,
    searchTerm,
    regionFilters,
    mainRoleFilters,
    seekingFilters,
    scrimRankFilter,
    rankFilter,
    sortBy,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      {/* MAIN CONTENT */}
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 space-y-6 p-4 sm:p-6">
          {/* CTA BANNER */}
          <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-zinc-900/60 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">{isManager ? t("home.cta.managerTitle") : t("home.cta.playerTitle")}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {isManager
                  ? t("home.cta.managerDescription")
                  : t("home.cta.playerDescription")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/profiles"
                className="rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
              >
                Search Profiles
              </Link>

              <div className="relative">
              <button
                type="button"
                onClick={openPostMenu}
                className="w-full rounded-xl bg-orange-500 px-6 py-2 font-bold text-black hover:bg-orange-600 sm:w-auto"
              >
                {isManager ? t("home.cta.postTeam") : t("home.cta.postAccount")}
              </button>

              {isPostMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("home.cta.accountInfo")}</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {checkingAccount
                      ? t("common.checkingAccount")
                      : accountName
                        ? t("common.signedInAs", { name: accountName })
                        : t("common.notSignedIn")}
                  </p>
                  {accountName ? (
                    <p className="mt-1 text-xs text-zinc-500">{t("common.roleWithName", { role: translateRole(accountLeaderRole || "Player") })}</p>
                  ) : null}
                  {accountAvatarUrl ? (
                    <img src={accountAvatarUrl} alt="Avatar" className="mt-3 h-12 w-12 rounded-full border border-zinc-700 object-cover" />
                  ) : null}

                  <div className="mt-4 flex items-center justify-end gap-2">
                    {accountName ? (
                      <Link
                        href="/account/profile"
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        {t("common.profile")}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsPostMenuOpen(false)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      {t("common.cancel")}
                    </button>
                    {accountName ? (
                      isManager ? (
                        <Link
                          href="/create"
                          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-orange-600"
                        >
                          {t("home.cta.postTeam")}
                        </Link>
                      ) : (
                        <Link
                          href="/create"
                          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-orange-600"
                        >
                          {t("home.cta.postAccount")}
                        </Link>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push("/account/create?next=/account/profile")}
                        className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-orange-600"
                      >
                        {t("common.signInToPost")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* TEAMS LIST */}
          <div>
            <div className="mb-4 overflow-visible rounded-[1.6rem] border border-zinc-800 bg-[linear-gradient(180deg,rgba(35,28,31,0.95),rgba(20,17,21,0.98))] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
              <div className="flex flex-col gap-3 border-b border-zinc-800/80 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-end gap-4">
                  <h3 className="text-4xl font-black tracking-wide text-white">{t("home.results.title")}</h3>
                  <span className="pb-1 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {t("home.results.count", { count: filteredPosts.length })}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-6">
                <SingleSelectMenu
                  label={t("home.filters.sort")}
                  options={localizedSortOptions}
                  selectedValue={sortBy}
                  onSelect={setSortBy}
                  placeholder={t("common.all")}
                  className="w-full"
                />
                <MultiSelectField
                  label={t("home.filters.region")}
                  options={localizedRegionOptions}
                  selectedValues={regionFilters}
                  onToggle={(value) => toggleArrayFilter(regionFilters, value, setRegionFilters)}
                  onClear={() => setRegionFilters([])}
                  allLabel={t("common.all")}
                  clearLabel={t("common.clearFilters")}
                  selectedCountLabel={(count) => t("common.selectedCount", { count })}
                  className="w-full"
                />
                <MultiSelectField
                  label={t("home.filters.role")}
                  options={localizedMainRoleOptions}
                  selectedValues={mainRoleFilters}
                  onToggle={(value) => toggleArrayFilter(mainRoleFilters, value, setMainRoleFilters)}
                  onClear={() => setMainRoleFilters([])}
                  allLabel={t("common.all")}
                  clearLabel={t("common.clearFilters")}
                  selectedCountLabel={(count) => t("common.selectedCount", { count })}
                  className="w-full"
                />
                <MultiSelectField
                  label={t("home.filters.seeking")}
                  options={localizedSeekingOptions}
                  selectedValues={seekingFilters}
                  onToggle={(value) => toggleArrayFilter(seekingFilters, value, setSeekingFilters)}
                  onClear={() => setSeekingFilters([])}
                  allLabel={t("common.all")}
                  clearLabel={t("common.clearFilters")}
                  selectedCountLabel={(count) => t("common.selectedCount", { count })}
                  className="w-full"
                />
                <SingleSelectMenu
                  label={t("home.filters.scrimRank")}
                  options={localizedScrimRankOptions}
                  selectedValue={scrimRankFilter}
                  onSelect={setScrimRankFilter}
                  placeholder={t("common.all")}
                  className="w-full"
                />
                <SingleSelectMenu
                  label={t("home.filters.rank")}
                  options={localizedRankOptions}
                  selectedValue={rankFilter}
                  onSelect={setRankFilter}
                  placeholder={t("common.all")}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
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
            </div>
            <div
              className={`${gridColumns === 1 ? "space-y-4" : gridColumns === 2 ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"}`}
            >
              {filteredPosts.length === 0 ? (
                <p className="text-zinc-500">{t("home.results.empty")}</p>
              ) : (
                filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-orange-500/40"
                  >
                    <div className="flex">
                      <div className="flex-1 px-5 py-4 space-y-4">
                        <div className="-mx-5 -mt-4 flex items-start justify-between gap-4 border-b border-zinc-800/80 bg-gradient-to-r from-orange-500/10 via-zinc-900 to-zinc-900 px-5 pb-4 pt-4">
                          <div className="flex items-center gap-3">
                            {post.avatarUrl ? (
                              <img
                                src={post.avatarUrl}
                                alt={`${post.leader} avatar`}
                                className="h-14 w-14 shrink-0 rounded-full border border-zinc-700 object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xl">
                                👤
                              </div>
                            )}
                            <div>
                              <p className="font-mono text-base font-bold text-white">{post.leader}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {getPostStatuses(post).map((status) => (
                                  <span
                                    key={`${post.id}-${status}`}
                                    className="rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300"
                                  >
                                    {translateRole(status)}
                                  </span>
                                ))}
                              </div>
                              {post.joinedTeamName ? (
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
                                  {t("common.teamWithName", { name: post.joinedTeamName })}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="shrink-0 rounded-md border border-orange-500/40 bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">
                              {post.region.map((region) => translateRegion(region)).join(" • ")}
                            </span>
                            {accountName && (post.ownerUsername || post.leader) === accountName ? (
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                disabled={deletingPostId === post.id}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingPostId === post.id ? t("home.card.deleting") : t("home.card.deletePost")}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* ── SECTION 3: Stat box — Team posts vs Player posts ── */}
                        <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/70 p-3">
                          {post.postType === "team-lfp" ? (
                            <div className="grid grid-cols-3 divide-x divide-zinc-700/50 text-center text-xs">
                              <div className="px-3 py-1">
                                <p className="mb-1 uppercase tracking-wide text-zinc-500">{t("home.card.scrimRank")}</p>
                                <p className="font-mono font-bold text-zinc-100">{translateScrimRank(post.eloRange.toLowerCase())}</p>
                              </div>
                              <div className="px-3 py-1">
                                <p className="mb-1 uppercase tracking-wide text-zinc-500">{t("home.card.members")}</p>
                                <p className="font-mono font-bold text-zinc-100">{post.members.length}</p>
                              </div>
                              <div className="px-3 py-1">
                                <p className="mb-1 uppercase tracking-wide text-zinc-500">{t("home.card.tournaments")}</p>
                                <p className="font-mono text-zinc-300">{post.tournaments && post.tournaments.length > 0 ? post.tournaments.join(", ") : t("common.noDataDash")}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 divide-x divide-zinc-700/50 text-center text-xs">
                              <div className="px-3 py-1">
                                <p className="mb-1 uppercase tracking-wide text-zinc-500">{t("home.card.scrimRank")}</p>
                                <p className="font-mono font-bold text-zinc-100">{translateScrimRank(post.eloRange.toLowerCase())}</p>
                              </div>
                              <div className="px-3 py-1">
                                <p className="mb-1 uppercase tracking-wide text-zinc-500">{t("home.card.owRank")}</p>
                                <p className="font-mono font-bold text-zinc-100">{formatLocalizedOwRank(post.owRank)}</p>
                              </div>
                              <div className="px-3 py-1">
                                <p className="mb-1 uppercase tracking-wide text-zinc-500">{t("home.card.mainRole")}</p>
                                <p className="font-mono text-zinc-300">{post.mainRole.length > 0 ? formatLocalizedRoleList(post.mainRole) : t("common.noDataDash")}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {post.postType === "team-lfp" ? (
                          <div className="space-y-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-3">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">{t("home.card.teamLfpRoster")}</p>
                            <div className="space-y-2">
                              {post.members.length > 0 ? (
                                sortRosterMembers(post.members).map((member) => (
                                  <div key={member.name} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm">
                                    <span className="font-semibold text-zinc-100">{member.name}</span>
                                    <div className="text-right">
                                      <p className="text-zinc-300">{translateRole(getRosterCategoryLabel(member.role, member.mainRole))}</p>
                                      {showMainRoleForMember(member.role) ? (
                                        <p className="text-xs text-orange-300">
                                          {member.mainRole && member.mainRole.length > 0 ? formatLocalizedRoleList(member.mainRole) : t("home.card.noMainRole")}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-zinc-500">{t("home.card.noRosterData")}</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t("home.card.rolesNeeded")}</p>
                              <p className="mt-1 text-sm text-zinc-200">
                                {post.lookingForRoles && post.lookingForRoles.length > 0
                                  ? formatLocalizedRoleList(post.lookingForRoles)
                                  : t("home.card.noRolesSelected")}
                              </p>
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t("home.card.aboutUs")}</p>
                              <p className="mt-1 text-sm text-zinc-200">{post.lookingFor || t("home.card.noDetailsProvided")}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 rounded-xl border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                            {post.topPicks && post.topPicks.length > 0 ? (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t("home.card.topPicks")}</p>
                                <p className="mt-1 text-sm text-zinc-200">{post.topPicks.map((pick) => translateRole(pick)).join(", ")}</p>
                              </div>
                            ) : null}
                            {post.tournaments && post.tournaments.length > 0 ? (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t("home.card.tournamentsInterested")}</p>
                                <p className="mt-1 text-sm text-zinc-200">{post.tournaments.join(", ")}</p>
                              </div>
                            ) : null}
                            {post.lookingFor ? (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t("home.card.aboutMe")}</p>
                                <p className="mt-1 text-sm text-zinc-200">{post.lookingFor}</p>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* OPEN button */}
                      <div className="flex items-center border-l border-zinc-800/90 px-5">
                        <Link
                          href={`/account/${encodeURIComponent(post.ownerUsername || post.leader)}`}
                          className="rounded-xl bg-orange-500 px-6 py-2 text-base font-bold text-black transition hover:bg-orange-600"
                        >
                          {t("common.open")}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}