"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import { formatRoleList } from "@/lib/utils";
import { convertTimeBetweenTimeZones, getTimeZoneAbbreviation, resolveTimeZoneFromCountryCode } from "@/lib/timezones";

interface RingerPost {
  id: number;
  ownerUsername: string;
  mainRole: string[];
  scrimRank: string;
  owRank: string;
  preferredTime?: string;
  availableFrom?: string;
  availableUntil?: string;
  preferredTimeZone?: string;
  durationHours: 12 | 24;
  createdAt: number;
  expiresAt: number;
}

const formatOwRank = (value: string) => {
  if (!value) return "—";
  return value
    .split("-")
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" ");
};

const formatRemaining = (expiresAt: number, now: number) => {
  const ms = Math.max(expiresAt - now, 0);
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

export default function RingerPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<RingerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [durationHours, setDurationHours] = useState<12 | 24>(12);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [preferredTimeZone, setPreferredTimeZone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ringers", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load ringer posts.");
      }
      const data = (await response.json()) as RingerPost[];
      setPosts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load ringer posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/account/session?soft=1", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          account?: {
            username?: string;
            accountProfile?: { avatarUrl?: string; country?: string };
            gameProfile?: { leaderRole?: string; leaderRoles?: string[] };
          };
        };

        if (data.account?.username) {
          setAccountName(data.account.username);
        }
        if (typeof data.account?.accountProfile?.avatarUrl === "string") {
          setAccountAvatarUrl(data.account.accountProfile.avatarUrl);
        }

        const leaderRoles = Array.isArray(data.account?.gameProfile?.leaderRoles)
          ? data.account?.gameProfile?.leaderRoles
          : [];
        const primaryRole = data.account?.gameProfile?.leaderRole;
        const managerDetected =
          leaderRoles.some((role) => typeof role === "string" && role.toLowerCase() === "manager") ||
          (typeof primaryRole === "string" && primaryRole.toLowerCase() === "manager");
        setIsManager(managerDetected);

        const countryCode = typeof data.account?.accountProfile?.country === "string" ? data.account.accountProfile.country : "";
        const countryTimezone = resolveTimeZoneFromCountryCode(countryCode);
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        setPreferredTimeZone(countryTimezone || browserTimezone);
      } catch {
        setAccountName("");
        setIsManager(false);
        setPreferredTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      }
    };

    verifySession();
  }, []);

  const myActivePost = useMemo(
    () => posts.find((post) => post.ownerUsername.trim().toLowerCase() === accountName.trim().toLowerCase()),
    [posts, accountName],
  );
  const viewerTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const selectedTimeZoneLabel = preferredTimeZone
    ? `${getTimeZoneAbbreviation(preferredTimeZone)} (${preferredTimeZone})`
    : "UTC";

  const handleLogout = async () => {
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  const handleCreatePost = async () => {
    setError("");
    setSuccessMessage("");

    if (!accountName) {
      router.push("/account/login?next=/ringer");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/ringers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ durationHours, availableFrom, availableUntil, preferredTimeZone }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to create ringer post.");
        return;
      }

      setAvailableFrom("");
      setAvailableUntil("");
      setSuccessMessage("Ringer post created.");
      await load();
    } catch {
      setError("Failed to create ringer post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!accountName) {
      return;
    }

    setDeletingPostId(postId);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch(`/api/ringers/${postId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to delete ringer post.");
        return;
      }
      setSuccessMessage("Ringer post deleted.");
      await load();
    } catch {
      setError("Failed to delete ringer post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/60 p-5">
          <h2 className="text-xl font-bold">Ringer Board</h2>
          <p className="mt-1 text-sm text-zinc-400">Post your availability for 12h or 24h. Posts auto-delete when time runs out.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-zinc-300">Availability</label>
            <select
              value={durationHours}
              onChange={(event) => setDurationHours(event.target.value === "24" ? 24 : 12)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white"
            >
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
            </select>

            <input
              type="time"
              value={availableFrom}
              onChange={(event) => setAvailableFrom(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-orange-500/60"
              title="Available from"
            />

            <span className="text-xs text-zinc-400">to</span>

            <input
              type="time"
              value={availableUntil}
              onChange={(event) => setAvailableUntil(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-orange-500/60"
              title="Available until"
            />

            <span className="text-xs text-zinc-400">Timezone: {selectedTimeZoneLabel}</span>

            <button
              type="button"
              onClick={handleCreatePost}
              disabled={submitting || Boolean(myActivePost) || availableFrom.length === 0 || availableUntil.length === 0}
              className="rounded-xl bg-orange-500 px-5 py-2 font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Posting..." : myActivePost ? "Active Post Exists" : "Post as Ringer"}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-3 text-sm text-green-300">{successMessage}</p> : null}
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading ringers...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No active ringer posts right now.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">{post.ownerUsername}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-300">
                      Expires in {formatRemaining(post.expiresAt, now)}
                    </p>
                  </div>
                  {accountName && post.ownerUsername.trim().toLowerCase() === accountName.trim().toLowerCase() ? (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingPostId === post.id}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingPostId === post.id ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </div>

                {isManager && post.ownerUsername.trim().toLowerCase() !== accountName.trim().toLowerCase() ? (
                  <div className="mt-3">
                    <Link
                      href={`/messages?to=${encodeURIComponent(post.ownerUsername)}`}
                      className="inline-flex rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200 transition hover:bg-orange-500/20"
                    >
                      Invite to Scrim
                    </Link>
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Main Role</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.mainRole.length > 0 ? formatRoleList(post.mainRole) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Scrim Rank</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.scrimRank.toUpperCase()}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">OW Rank</p>
                    <p className="mt-1 text-sm text-zinc-200">{formatOwRank(post.owRank)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Free Time</p>
                  {post.availableFrom && post.availableUntil ? (
                    <div className="mt-1 space-y-1 text-sm text-zinc-200">
                      <p>
                        Poster time: {post.availableFrom} - {post.availableUntil}{" "}
                        ({post.preferredTimeZone ? `${getTimeZoneAbbreviation(post.preferredTimeZone)}${getTimeZoneAbbreviation(post.preferredTimeZone) !== post.preferredTimeZone ? ` • ${post.preferredTimeZone}` : ""}` : "UTC"})
                      </p>
                      <p>
                        Your time: {convertTimeBetweenTimeZones(post.availableFrom, post.preferredTimeZone || "UTC", viewerTimeZone)} - {convertTimeBetweenTimeZones(post.availableUntil, post.preferredTimeZone || "UTC", viewerTimeZone)}{" "}
                        ({getTimeZoneAbbreviation(viewerTimeZone)}{getTimeZoneAbbreviation(viewerTimeZone) !== viewerTimeZone ? ` • ${viewerTimeZone}` : ""})
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-200">{post.preferredTime || "—"}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}