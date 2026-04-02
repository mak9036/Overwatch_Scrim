"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import CountryFlag from "@/components/country-flag";
import { notifyAppSessionChanged } from "@/lib/client-events";
import { COUNTRY_OPTIONS, getCountryLabel } from "@/lib/countries";

const MAIN_ROLE_OPTIONS = [
  { value: "Tank", label: "Tank" },
  { value: "Hitscan", label: "Hitscan" },
  { value: "Flex DPS", label: "Flex DPS" },
  { value: "Flex Support", label: "Flex Support" },
  { value: "Main Support", label: "Main Support" },
];

const REGION_OPTIONS = [
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "EMEA", label: "EMEA" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "APAC", label: "APAC" },
];

const LEADER_ROLE_OPTIONS = [
  { value: "Player", label: "Player" },
  { value: "Manager", label: "Manager" },
  { value: "Coach", label: "Coach" },
];

const getPrimaryLeaderRole = (roles: string[]) => {
  if (roles.includes("Manager")) {
    return "Manager";
  }
  if (roles.includes("Coach")) {
    return "Coach";
  }
  if (roles.includes("Player")) {
    return "Player";
  }
  return "Player";
};

const RANK_OPTIONS = [
  { value: "3000", label: "3000" },
  { value: "3500", label: "3500" },
  { value: "4000", label: "4000" },
  { value: "4500", label: "4500" },
  { value: "open", label: "Open" },
  { value: "adv", label: "Advanced" },
  { value: "expert", label: "Expert" },
  { value: "master", label: "Master" },
  { value: "owcs", label: "OWCS" },
];

const PLAYER_RANK_OPTIONS = [
  { value: "Bronze", label: "Bronze" },
  { value: "Silver", label: "Silver" },
  { value: "Gold", label: "Gold" },
  { value: "Platinum", label: "Platinum" },
  { value: "Diamond", label: "Diamond" },
  { value: "Master", label: "Master" },
  { value: "Grandmaster", label: "Grandmaster" },
  { value: "Champion", label: "Champion" },
];

const OVERWATCH_HEROES: { role: string; heroes: string[] }[] = [
  {
    role: "Tank",
    heroes: ["D.Va", "Domina", "Doomfist", "Hazard", "Junker Queen", "Mauga", "Orisa", "Ramattra", "Reinhardt", "Roadhog", "Sigma", "Winston", "Wrecking Ball", "Zarya"],
  },
  {
    role: "Damage",
    heroes: ["Anran", "Ashe", "Bastion", "Cassidy", "Echo", "Emre", "Freja", "Genji", "Hanzo", "Junkrat", "Mei", "Pharah", "Reaper", "Soldier: 76", "Sojourn", "Sombra", "Symmetra", "Torbjörn", "Tracer", "Venture", "Widowmaker"],
  },
  {
    role: "Support",
    heroes: ["Ana", "Baptiste", "Brigitte", "Illari", "Jetpack Cat", "Juno", "Kiriko", "Lifeweaver", "Lúcio", "Mercy", "Mizuki", "Moira", "Zenyatta"],
  },
];

const PRO_MATCH_ALLOWED_HOSTS = ["liquipedia.net"] as const;

const isAllowedProMatchUrl = (raw: string) => {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return PRO_MATCH_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
};

const extractEntryLink = (entry: string) => {
  const match = entry.match(/https?:\/\/\S+/i);
  if (!match) {
    return { label: entry, href: "" };
  }
  const href = match[0];
  if (!isAllowedProMatchUrl(href)) {
    return { label: entry.replace(href, "").replace(/[\-|:]+$/, "").trim(), href: "" };
  }
  const label = entry.replace(href, "").replace(/[\-|:]+$/, "").trim() || href;
  return { label, href };
};

function AccountProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingSession, setLoadingSession] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [battleTag, setBattleTag] = useState("");
  const [country, setCountry] = useState("");
  const [discordTag, setDiscordTag] = useState("");
  const [discordUserId, setDiscordUserId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [discordDmNotifications, setDiscordDmNotifications] = useState(true);
  const [twitterUrl, setTwitterUrl] = useState("");
  const [faceitUrl, setFaceitUrl] = useState("");
  const [proMatches, setProMatches] = useState<string[]>([]);
  const [pendingProMatch, setPendingProMatch] = useState("");
  const [rank, setRank] = useState("");
  const [playerRank, setPlayerRank] = useState("");
  const [region, setRegion] = useState<string[]>([]);
  const [leaderRoles, setLeaderRoles] = useState<string[]>(["Player"]);
  const [mainRole, setMainRole] = useState<string[]>([]);
  const [topPicks, setTopPicks] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hasDiscordLinked = discordUserId.trim().length > 0;
  const resolvedDiscordTag = hasDiscordLinked ? (discordUsername || discordTag) : discordTag;

  useEffect(() => {
    const discordStatus = searchParams.get("discord") || "";
    if (!discordStatus) {
      return;
    }

    if (discordStatus === "connected") {
      setSuccess("Discord connected successfully. You will be eligible for Discord DM notifications.");
      setError("");
      return;
    }

    const statusMessageMap: Record<string, string> = {
      "config-missing": "Discord is not configured yet. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your environment.",
      "cancelled": "Discord connect was cancelled.",
      "invalid-state": "Discord connect verification failed. Please try again.",
      "missing-code": "Discord did not return an authorization code. Please try again.",
      "token-failed": "Discord token exchange failed. Check your Discord app redirect settings.",
      "token-missing": "Discord token response was invalid. Please try again.",
      "user-fetch-failed": "Could not fetch your Discord user profile.",
      "user-id-missing": "Discord user ID was missing from the response.",
      "not-logged-in": "Please log in to your website account first, then connect Discord.",
    };

    setError(statusMessageMap[discordStatus] || "Discord connect was not completed. Please try again.");
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" });
        if (!response.ok) {
          router.replace("/account/create?next=/account/profile");
          return;
        }

        const data = (await response.json()) as {
          account?: {
            username?: string;
            accountProfile?: {
              avatarUrl?: string;
              bio?: string;
              battleTag?: string;
              country?: string;
              discordTag?: string;
              discordUserId?: string;
              discordUsername?: string;
              discordDmNotifications?: boolean;
              twitterUrl?: string;
              faceitUrl?: string;
              proMatches?: string[];
            };
            gameProfile?: {
              rank?: string;
              eloRange?: string;
              region?: string[];
              leaderRole?: string;
              leaderRoles?: string[];
              mainRole?: string[];
              topPicks?: string[];
            };
          };
        };

        setAccountName(typeof data.account?.username === "string" ? data.account.username : "");
  setAvatarUrl(typeof data.account?.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "");
  setBio(typeof data.account?.accountProfile?.bio === "string" ? data.account.accountProfile.bio : "");
  setBattleTag(typeof data.account?.accountProfile?.battleTag === "string" ? data.account.accountProfile.battleTag : "");
  setCountry(typeof data.account?.accountProfile?.country === "string" ? data.account.accountProfile.country.toUpperCase() : "");
  const incomingDiscordTag = typeof data.account?.accountProfile?.discordTag === "string" ? data.account.accountProfile.discordTag : "";
  const incomingDiscordUsername = typeof data.account?.accountProfile?.discordUsername === "string" ? data.account.accountProfile.discordUsername : "";
  setDiscordTag(incomingDiscordTag || incomingDiscordUsername);
  setDiscordUserId(typeof data.account?.accountProfile?.discordUserId === "string" ? data.account.accountProfile.discordUserId : "");
  setDiscordUsername(incomingDiscordUsername);
  setDiscordDmNotifications(typeof data.account?.accountProfile?.discordDmNotifications === "boolean" ? data.account.accountProfile.discordDmNotifications : true);
  setTwitterUrl(typeof data.account?.accountProfile?.twitterUrl === "string" ? data.account.accountProfile.twitterUrl : "");
  setFaceitUrl(typeof data.account?.accountProfile?.faceitUrl === "string" ? data.account.accountProfile.faceitUrl : "");
  setProMatches(Array.isArray(data.account?.accountProfile?.proMatches) ? data.account?.accountProfile?.proMatches || [] : []);
        const storedRank = typeof data.account?.gameProfile?.rank === "string" ? data.account.gameProfile.rank.trim() : "";
        if (storedRank && RANK_OPTIONS.some((option) => option.value === storedRank)) {
          setRank(storedRank);
        } else {
          const fallbackRank = typeof data.account?.gameProfile?.eloRange === "string" ? data.account.gameProfile.eloRange.trim() : "";
          setRank(RANK_OPTIONS.some((option) => option.value === fallbackRank) ? fallbackRank : "");
        }
        const storedPlayerRank = typeof data.account?.gameProfile?.eloRange === "string" ? data.account.gameProfile.eloRange.trim() : "";
        setPlayerRank(
          PLAYER_RANK_OPTIONS.some((option) => option.value === storedPlayerRank) ? storedPlayerRank : "",
        );
  setRegion(Array.isArray(data.account?.gameProfile?.region) ? data.account?.gameProfile?.region || [] : []);
        const incomingLeaderRoles =
          Array.isArray(data.account?.gameProfile?.leaderRoles) && data.account.gameProfile.leaderRoles.length > 0
            ? data.account.gameProfile.leaderRoles.filter((entry): entry is string => typeof entry === "string")
            : typeof data.account?.gameProfile?.leaderRole === "string"
              ? [data.account.gameProfile.leaderRole]
              : ["Player"];
        setLeaderRoles(incomingLeaderRoles);
        setMainRole(Array.isArray(data.account?.gameProfile?.mainRole) ? data.account?.gameProfile?.mainRole || [] : []);
        setTopPicks(Array.isArray(data.account?.gameProfile?.topPicks) ? data.account?.gameProfile?.topPicks || [] : []);
        setLoadingSession(false);
      } catch {
        router.replace("/account/create?next=/account/profile");
      }
    };

    loadProfile();
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    setSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl,
          bio,
          battleTag,
          country,
          discordTag: resolvedDiscordTag,
          discordDmNotifications,
          twitterUrl,
          faceitUrl,
          proMatches,
          rank,
          eloRange: playerRank,
          region,
          leaderRole: getPrimaryLeaderRole(leaderRoles),
          leaderRoles,
          mainRole,
          topPicks,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Could not update profile.");
        setSaving(false);
        return;
      }

      setSuccess("Profile updated.");
      notifyAppSessionChanged();
      setSaving(false);
    } catch {
      setError("Could not update profile.");
      setSaving(false);
    }
  };

  const onAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setSuccess("");
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/account/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Could not upload avatar.");
        setUploadingAvatar(false);
        return;
      }

      const data = (await response.json()) as { avatarUrl?: string };
      if (typeof data.avatarUrl === "string") {
        setAvatarUrl(data.avatarUrl);
      }
      setSuccess("Avatar uploaded.");
      notifyAppSessionChanged();
      setUploadingAvatar(false);
    } catch {
      setError("Could not upload avatar.");
      setUploadingAvatar(false);
    } finally {
      event.target.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/account/logout", { method: "POST" });
      notifyAppSessionChanged();
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <form
        onSubmit={onSubmit}
        className="min-h-screen w-full space-y-6 bg-gradient-to-br from-black via-zinc-900 to-black p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-3 text-orange-400 hover:text-orange-300">
            <span className="text-2xl">⚔️</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              LOG OUT
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-5">
          <h1 className="text-4xl font-black text-orange-400">Profile</h1>
          <p className="mt-1 text-sm text-zinc-300">Manage your full account profile, rank, roles, heroes, and showcase info.</p>
        </div>

        <div className="grid min-h-[78vh] gap-6 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-col items-center text-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" className="h-48 w-48 rounded-full border-2 border-zinc-700 object-cover" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-6xl">👤</div>
              )}
              <p className="mt-4 font-heading text-4xl font-black text-white">{accountName || "Unknown"}</p>
              <p className="mt-1 text-sm text-zinc-400">Account Profile</p>
              <label className="mt-5 inline-block cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
                {uploadingAvatar ? "Uploading..." : "Upload Profile Picture"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onAvatarFileChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div className="mt-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
              <p className="font-semibold uppercase tracking-wide text-zinc-400">Quick Snapshot</p>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Battle Tag</span>
                <span className="font-semibold text-zinc-200">{battleTag || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Country</span>
                {country ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-zinc-200">
                    <CountryFlag countryCode={country} className="h-3.5 w-5 rounded-sm border border-zinc-700 object-cover" title={`${getCountryLabel(country)} flag`} />
                    {getCountryLabel(country)}
                  </span>
                ) : (
                  <span className="font-semibold text-zinc-200">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Discord</span>
                <span className="font-semibold text-zinc-200">{resolvedDiscordTag || "Not connected"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Twitter</span>
                <span className="max-w-[180px] truncate text-right font-semibold text-zinc-200">{twitterUrl || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Faceit</span>
                <span className="max-w-[180px] truncate text-right font-semibold text-zinc-200">{faceitUrl || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Scrim Rank</span>
                <span className="font-semibold text-zinc-200">{rank ? rank.toUpperCase() : "Unranked"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Rank</span>
                <span className="font-semibold text-zinc-200">{playerRank || "Unranked"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Regions</span>
                <span className="max-w-[180px] truncate text-right font-semibold text-zinc-200">
                  {region.length > 0 ? region.join(", ") : "None"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Top Heroes</span>
                <span className="max-w-[180px] truncate text-right font-semibold text-zinc-200">
                  {topPicks.length > 0 ? topPicks.join(", ") : "None"}
                </span>
              </div>
            </div>
          </aside>

          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-6">
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Battle Tag</span>
              <input
                value={battleTag}
                onChange={(event) => setBattleTag(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                maxLength={48}
                placeholder="e.g. Player#1234"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Country</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {country ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200">
                  <CountryFlag countryCode={country} className="h-3.5 w-5 rounded-sm border border-zinc-700 object-cover" title={`${getCountryLabel(country)} flag`} />
                  {getCountryLabel(country)}
                </div>
              ) : null}
            </label>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Discord Integration</p>
              <p className="text-xs text-zinc-400">Connect your Discord to receive DM alerts when you get new website messages.</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/api/account/discord/connect";
                  }}
                  className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20"
                >
                  {hasDiscordLinked ? "Reconnect Discord" : "Connect Discord"}
                </button>
                <span className="text-xs text-zinc-400">
                  Status: <span className="font-semibold text-zinc-200">{hasDiscordLinked ? "Connected" : "Not connected"}</span>
                </span>
              </div>
              {hasDiscordLinked ? (
                <p className="text-xs text-zinc-400">Connected account: <span className="font-semibold text-zinc-200">{discordUsername || "Discord user"}</span></p>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={discordDmNotifications}
                  onChange={(event) => setDiscordDmNotifications(event.target.checked)}
                  className="accent-orange-500"
                />
                Send me Discord DMs when I receive website notifications
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Bio</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-[110px] w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                maxLength={280}
                placeholder="Tell players about your playstyle, availability, and goals..."
              />
            </label>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Pro Matches</p>
              <p className="text-xs text-zinc-400">Add notable matches/tournaments like a mini wiki timeline.</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={pendingProMatch}
                  onChange={(event) => setPendingProMatch(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                  maxLength={120}
                  placeholder="e.g. 2025 — OWCS Stage 2 vs Team XYZ https://liquipedia.net/..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = pendingProMatch.trim();
                    if (!trimmed) return;
                    const urlMatch = trimmed.match(/https?:\/\/\S+/i);
                    if (urlMatch && !isAllowedProMatchUrl(urlMatch[0])) {
                      setError("Pro match links must be from Liquipedia only for now.");
                      return;
                    }
                    if (proMatches.length >= 20) return;
                    setProMatches((prev) => [...prev, trimmed]);
                    setPendingProMatch("");
                  }}
                  disabled={!pendingProMatch.trim() || proMatches.length >= 20}
                  className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Match
                </button>
              </div>
              <p className="text-xs text-zinc-500">Allowed links: liquipedia.net</p>

              {proMatches.length > 0 ? (
                <ul className="space-y-2">
                  {proMatches.map((entry, index) => (
                    <li key={`${entry}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                      {(() => {
                        const link = extractEntryLink(entry);
                        if (!link.href) {
                          return <span className="text-sm text-zinc-200">{link.label}</span>;
                        }
                        return (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-orange-300 hover:text-orange-200"
                            title={link.href}
                          >
                            {link.label}
                          </a>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => setProMatches((prev) => prev.filter((_, position) => position !== index))}
                        className="shrink-0 text-xs font-semibold text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">No pro matches added yet.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Scrim Rank</span>
                <select
                  value={rank}
                  onChange={(event) => setRank(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                >
                  <option value="">Select scrim rank</option>
                  {RANK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Rank</span>
                <select
                  value={playerRank}
                  onChange={(event) => setPlayerRank(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                >
                  <option value="">Select rank</option>
                  {PLAYER_RANK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Regions</p>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map((option) => {
                  const selected = region.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setRegion((prev) => prev.filter((entry) => entry !== option.value));
                        } else {
                          setRegion((prev) => [...prev, option.value]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Statuses</p>
              <div className="flex flex-wrap gap-2">
                {LEADER_ROLE_OPTIONS.map((option) => {
                  const selected = leaderRoles.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          const next = leaderRoles.filter((entry) => entry !== option.value);
                          setLeaderRoles(next.length > 0 ? next : ["Player"]);
                        } else {
                          setLeaderRoles((prev) => [...prev, option.value]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Main Roles</p>
              <div className="flex flex-wrap gap-2">
                {MAIN_ROLE_OPTIONS.map((option) => {
                  const selected = mainRole.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setMainRole((prev) => prev.filter((role) => role !== option.value));
                        } else {
                          setMainRole((prev) => [...prev, option.value]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Top Heroes (max 3)</p>

              {topPicks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topPicks.map((hero) => (
                    <span key={hero} className="rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
                      {hero}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="space-y-3">
                {OVERWATCH_HEROES.map((group) => (
                  <div key={group.role}>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-zinc-600">{group.role}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.heroes.map((hero) => {
                        const selected = topPicks.includes(hero);
                        return (
                          <button
                            key={hero}
                            type="button"
                            disabled={!selected && topPicks.length >= 3}
                            onClick={() => {
                              if (selected) {
                                setTopPicks((prev) => prev.filter((h) => h !== hero));
                              } else if (topPicks.length < 3) {
                                setTopPicks((prev) => [...prev, hero]);
                              }
                            }}
                            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : topPicks.length >= 3 ? "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:text-white"}`}
                          >
                            {hero}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">External Links</p>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Twitter / X Link</span>
                <input
                  value={twitterUrl}
                  onChange={(event) => setTwitterUrl(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                  maxLength={256}
                  placeholder="https://x.com/yourname"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Faceit Link</span>
                <input
                  value={faceitUrl}
                  onChange={(event) => setFaceitUrl(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                  maxLength={256}
                  placeholder="https://www.faceit.com/en/players/yourname"
                />
              </label>
            </div>
          </section>

          <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Highlights</p>
              <p className="mt-2 text-sm text-zinc-300">Your profile is now used to auto-fill the post creator. Keep this updated for faster posting.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Activity</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">✅ Profile synced with posting flow</div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">🔥 Hero picks ready for quick posts</div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">🎯 Role setup optimized</div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Profile Strength</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${Math.min(100, 25 + (bio ? 20 : 0) + (battleTag ? 20 : 0) + (hasDiscordLinked ? 15 : 0) + (twitterUrl ? 10 : 0) + (faceitUrl ? 10 : 0) + mainRole.length * 7 + topPicks.length * 8)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">Add more details to improve your profile visibility.</p>
            </div>
          </aside>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-green-400">{success}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-black disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          <div className="text-sm">
            <Link href="/" className="text-zinc-500 hover:text-zinc-300">
              ← Back to listings
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function AccountProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AccountProfilePageContent />
    </Suspense>
  );
}

