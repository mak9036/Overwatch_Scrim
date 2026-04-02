import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccountRecordByUsername } from "@/lib/accounts-store";
import { getCurrentTeamForUser } from "@/lib/teams-store";
import NotificationCenter from "@/components/notification-center";
import CountryFlag from "@/components/country-flag";
import { getCountryLabel } from "@/lib/countries";
import { formatRoleList } from "@/lib/utils";

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

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username || "");
  const account = await getAccountRecordByUsername(decodedUsername);
  const currentTeam = await getCurrentTeamForUser(decodedUsername);

  if (!account) {
    notFound();
  }

  const profile = account.accountProfile || {
    avatarUrl: "",
    bio: "",
    battleTag: "",
    country: "",
    discordTag: "",
    twitterUrl: "",
    faceitUrl: "",
    proMatches: [],
  };
  const game = account.gameProfile || {
    rank: "",
    eloRange: "",
    region: [],
    leaderRole: "Player",
    leaderRoles: ["Player"],
    mainRole: [],
    topPicks: [],
  };
  const profileStatuses =
    Array.isArray(game.leaderRoles) && game.leaderRoles.length > 0
      ? game.leaderRoles
      : [game.leaderRole || "Player"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-zinc-400 hover:text-zinc-200">
            ← Back to listings
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/messages?to=${encodeURIComponent(account.username)}`}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              Message
            </Link>
            <NotificationCenter />
          </div>
        </div>

        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          {currentTeam ? (
            <Link
              href="/team"
              className="absolute right-6 top-6 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-right transition hover:border-orange-500/50 hover:bg-zinc-800"
              title={`Open team page for ${currentTeam.name}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Current Team</p>
              <p className="text-sm font-semibold text-orange-300">{currentTeam.name}</p>
            </Link>
          ) : null}
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`${account.username} avatar`}
                className="h-24 w-24 rounded-full border border-zinc-700 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-4xl">
                👤
              </div>
            )}

            <div>
              <h1 className="text-3xl font-black text-white">{account.username}</h1>
              <p className="mt-1 text-zinc-400">{profileStatuses.join(", ")}</p>
              {profile.battleTag ? (
                <p className="mt-2 text-sm font-semibold text-orange-300">{profile.battleTag}</p>
              ) : null}
              {profile.country ? (
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <CountryFlag countryCode={profile.country} className="h-3.5 w-5 rounded-sm border border-zinc-700 object-cover" title={`${getCountryLabel(profile.country)} flag`} />
                  {getCountryLabel(profile.country)}
                </p>
              ) : null}
              {profile.discordTag ? (
                <p className="mt-1 text-sm font-semibold text-indigo-300">Discord: {profile.discordTag}</p>
              ) : null}
              {profile.twitterUrl ? (
                <a
                  href={profile.twitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm font-semibold text-sky-300 hover:text-sky-200"
                >
                  Twitter / X
                </a>
              ) : null}
              {profile.faceitUrl ? (
                <a
                  href={profile.faceitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  Faceit Profile
                </a>
              ) : null}
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300">{profile.bio}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Scrim Rank</p>
            <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{game.rank || "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Overwatch Rank</p>
            <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{game.eloRange || "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Regions</p>
            <p className="mt-1 font-mono text-sm text-zinc-200">{game.region.length > 0 ? game.region.join(", ") : "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Main Roles</p>
            <p className="mt-1 font-mono text-sm text-zinc-200">{game.mainRole.length > 0 ? formatRoleList(game.mainRole) : "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:col-span-2 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Top Picks</p>
            <p className="mt-1 font-mono text-sm text-zinc-200">{game.topPicks.length > 0 ? game.topPicks.join(", ") : "—"}</p>
          </div>
        </div>

        {profile.proMatches.length > 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pro Match History</p>
            <ul className="mt-3 space-y-2">
              {profile.proMatches.map((entry, index) => (
                <li key={`${entry}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-200">
                  {(() => {
                    const link = extractEntryLink(entry);
                    if (!link.href) {
                      return <span>{link.label}</span>;
                    }
                    return (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-orange-300 hover:text-orange-200"
                        title={link.href}
                      >
                        {link.label}
                      </a>
                    );
                  })()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
