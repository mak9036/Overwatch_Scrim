"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface PublicProfileSummary {
  username: string;
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
  battleTag?: string;
  country?: string;
  leaderRoles: string[];
  mainRole: string[];
  topPicks: string[];
  region: string[];
  scrimRank?: string;
  owRank?: string;
  currentTeamName?: string;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString();
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<PublicProfileSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/profiles", { cache: "no-store" });
        if (!response.ok) {
          setProfiles([]);
          return;
        }

        const data = (await response.json()) as PublicProfileSummary[];
        setProfiles(Array.isArray(data) ? data : []);
      } catch {
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return [...profiles].sort((left, right) => left.username.localeCompare(right.username));
    }

    return profiles
      .filter((profile) => {
        const haystack = [
          profile.username,
          profile.battleTag,
          profile.bio,
          profile.currentTeamName,
          profile.scrimRank,
          profile.owRank,
          ...profile.region,
          ...profile.leaderRoles,
          ...profile.mainRole,
          ...profile.topPicks,
        ]
          .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) => left.username.localeCompare(right.username));
  }, [profiles, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/60 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Profiles</p>
              <h2 className="mt-2 text-3xl font-black text-white">Search Every Public Account</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Search by username, battle tag, roles, ranks, heroes, team name, or region.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-2 text-sm font-semibold text-zinc-300">
              {filteredProfiles.length} {filteredProfiles.length === 1 ? "profile" : "profiles"}
            </div>
          </div>

          <div className="mt-5">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search username, battle tag, team, role, rank, hero..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <p className="text-sm text-zinc-500">No matching profiles found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <Link
                key={profile.username}
                href={`/account/${encodeURIComponent(profile.username)}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-orange-500/40 hover:bg-zinc-900"
              >
                <div className="flex items-start gap-4">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={`${profile.username} avatar`}
                      className="h-16 w-16 rounded-full border border-zinc-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xl font-black text-orange-300">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black text-white">{profile.username}</p>
                    {profile.battleTag ? <p className="truncate text-sm font-semibold text-orange-300">{profile.battleTag}</p> : null}
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">Joined {formatDate(profile.createdAt)}</p>
                  </div>
                </div>

                {profile.bio ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">No bio added yet.</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Scrim Rank</p>
                    <p className="mt-1 font-semibold text-zinc-100">{profile.scrimRank || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">OW Rank</p>
                    <p className="mt-1 font-semibold text-zinc-100">{profile.owRank || "—"}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-zinc-400">
                    <span className="font-semibold text-zinc-200">Status:</span>{" "}
                    {profile.leaderRoles.length > 0 ? profile.leaderRoles.join(", ") : "—"}
                  </p>
                  <p className="text-zinc-400">
                    <span className="font-semibold text-zinc-200">Main Roles:</span>{" "}
                    {profile.mainRole.length > 0 ? profile.mainRole.join(", ") : "—"}
                  </p>
                  <p className="text-zinc-400">
                    <span className="font-semibold text-zinc-200">Region:</span>{" "}
                    {profile.region.length > 0 ? profile.region.join(", ") : "—"}
                  </p>
                  {profile.currentTeamName ? (
                    <p className="text-zinc-400">
                      <span className="font-semibold text-zinc-200">Team:</span> {profile.currentTeamName}
                    </p>
                  ) : null}
                  {profile.topPicks.length > 0 ? (
                    <p className="text-zinc-400">
                      <span className="font-semibold text-zinc-200">Top Picks:</span> {profile.topPicks.join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 inline-flex rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">
                  View Profile
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}