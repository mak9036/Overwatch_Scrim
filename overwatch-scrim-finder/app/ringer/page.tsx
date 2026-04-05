"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import { formatRoleList } from "@/lib/utils";
import { convertTimeBetweenTimeZones, formatTimeForDisplay, getTimeZoneAbbreviation, resolveTimeZoneFromCountryCode } from "@/lib/timezones";

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

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const hour = index + 1;
  return { value: String(hour), label: String(hour) };
});

const MINUTE_OPTIONS = ["00", "15", "30", "45"];
const PERIOD_OPTIONS = ["AM", "PM"] as const;
type Meridiem = (typeof PERIOD_OPTIONS)[number];

type TimeParts = {
  hour: string;
  minute: string;
  period: Meridiem;
};

const parseTimeValue = (value: string): TimeParts => {
  if (!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(value)) {
    return { hour: "", minute: "00", period: "AM" };
  }

  const [hourText, minute] = value.split(":");
  const hours24 = Number(hourText);
  const period: Meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour = String(hours24 % 12 || 12);
  return { hour, minute, period };
};

const buildTimeValue = (hour: string, minute: string, period: Meridiem) => {
  if (!hour) {
    return "";
  }

  const parsedHour = Number(hour);
  if (!Number.isInteger(parsedHour) || parsedHour < 1 || parsedHour > 12) {
    return "";
  }

  let hours24 = parsedHour % 12;
  if (period === "PM") {
    hours24 += 12;
  }

  return `${String(hours24).padStart(2, "0")}:${minute}`;
};

const formatRemaining = (expiresAt: number, now: number) => {
  const ms = Math.max(expiresAt - now, 0);
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

function TimeSelectionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = parseTimeValue(value);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_88px_88px] gap-2">
        <select
          value={parts.hour}
          onChange={(event) => onChange(buildTimeValue(event.target.value, parts.minute, parts.period))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-orange-500/60"
          title={`${label} hour`}
        >
          <option value="">Hour</option>
          {HOUR_OPTIONS.map((option) => (
            <option key={`${label}-hour-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={parts.minute}
          onChange={(event) => onChange(buildTimeValue(parts.hour, event.target.value, parts.period))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-orange-500/60"
          title={`${label} minutes`}
          disabled={!parts.hour}
        >
          {MINUTE_OPTIONS.map((minute) => (
            <option key={`${label}-minute-${minute}`} value={minute}>
              :{minute}
            </option>
          ))}
        </select>

        <select
          value={parts.period}
          onChange={(event) => onChange(buildTimeValue(parts.hour, parts.minute, event.target.value as "AM" | "PM"))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-orange-500/60"
          title={`${label} period`}
          disabled={!parts.hour}
        >
          {PERIOD_OPTIONS.map((period) => (
            <option key={`${label}-period-${period}`} value={period}>
              {period}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Quarter-hour slots only.</p>
    </div>
  );
}

export default function RingerPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<RingerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [preferredTimeZone, setPreferredTimeZone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [gridColumns, setGridColumns] = useState<1 | 2 | 4>(4);

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

        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const countryCode = typeof data.account?.accountProfile?.country === "string" ? data.account.accountProfile.country : "";
        const countryTimezone = resolveTimeZoneFromCountryCode(countryCode);
        setPreferredTimeZone(browserTimezone || countryTimezone || "UTC");
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
  const compactCards = gridColumns === 4;
  const availabilitySummary = availableFrom && availableUntil
    ? `${formatTimeForDisplay(availableFrom, { timeZone: preferredTimeZone })} to ${formatTimeForDisplay(availableUntil, { timeZone: preferredTimeZone })} ${getTimeZoneAbbreviation(preferredTimeZone)}`
    : "Choose your start and end time";

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
        body: JSON.stringify({ availableFrom, availableUntil, preferredTimeZone }),
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
          <p className="mt-1 text-sm text-zinc-400">Post your availability window. Posts auto-delete when your selected availability ends.</p>

          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-zinc-300">Availability</label>
              <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-xs font-semibold text-zinc-300">
                Timezone: {selectedTimeZoneLabel}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-end">
              <TimeSelectionField label="From" value={availableFrom} onChange={setAvailableFrom} />
              <div className="hidden pb-4 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 md:block">to</div>
              <TimeSelectionField label="Until" value={availableUntil} onChange={setAvailableUntil} />
              <button
                type="button"
                onClick={handleCreatePost}
                disabled={submitting || Boolean(myActivePost) || availableFrom.length === 0 || availableUntil.length === 0}
                className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Posting..." : myActivePost ? "Active Post Exists" : "Post as Ringer"}
              </button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Selected Window</p>
              <p className="mt-1 font-semibold text-zinc-100">{availabilitySummary}</p>
              <p className="mt-1 text-xs text-zinc-500">Shown using your current PC timezone settings.</p>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-3 text-sm text-green-300">{successMessage}</p> : null}
        </div>

        <div>
          <div className="mb-3 ml-auto flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
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
          <div className={`${gridColumns === 1 ? "space-y-3" : gridColumns === 2 ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"}`}>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading ringers...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No active ringer posts right now.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className={`rounded-2xl border border-zinc-800 bg-zinc-900 ${compactCards ? "p-3" : "p-4"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-bold text-white ${compactCards ? "text-base" : "text-lg"}`}>{post.ownerUsername}</p>
                    <p className={`mt-1 uppercase tracking-[0.16em] text-orange-300 ${compactCards ? "text-[10px]" : "text-xs"}`}>
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
                    <p className={`mt-1 text-zinc-200 break-words ${compactCards ? "text-xs" : "text-sm"}`}>{post.mainRole.length > 0 ? formatRoleList(post.mainRole) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Scrim Rank</p>
                    <p className={`mt-1 text-zinc-200 break-words ${compactCards ? "text-xs" : "text-sm"}`}>{post.scrimRank.toUpperCase()}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">OW Rank</p>
                    <p className={`mt-1 text-zinc-200 break-words ${compactCards ? "text-xs" : "text-sm"}`}>{formatOwRank(post.owRank)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Free Time</p>
                  {post.availableFrom && post.availableUntil ? (
                    <div className={`mt-1 space-y-1 text-zinc-200 ${compactCards ? "text-xs" : "text-sm"}`}>
                      <p>
                        Poster time: {formatTimeForDisplay(post.availableFrom, { timeZone: post.preferredTimeZone || "UTC" })} - {formatTimeForDisplay(post.availableUntil, { timeZone: post.preferredTimeZone || "UTC" })}{" "}
                        ({post.preferredTimeZone ? `${getTimeZoneAbbreviation(post.preferredTimeZone)}${getTimeZoneAbbreviation(post.preferredTimeZone) !== post.preferredTimeZone ? ` • ${post.preferredTimeZone}` : ""}` : "UTC"})
                      </p>
                      <p>
                        Your time: {formatTimeForDisplay(convertTimeBetweenTimeZones(post.availableFrom, post.preferredTimeZone || "UTC", viewerTimeZone), { timeZone: viewerTimeZone })} - {formatTimeForDisplay(convertTimeBetweenTimeZones(post.availableUntil, post.preferredTimeZone || "UTC", viewerTimeZone), { timeZone: viewerTimeZone })}{" "}
                        ({getTimeZoneAbbreviation(viewerTimeZone)}{getTimeZoneAbbreviation(viewerTimeZone) !== viewerTimeZone ? ` • ${viewerTimeZone}` : ""})
                      </p>
                    </div>
                  ) : (
                    <p className={`mt-1 text-zinc-200 ${compactCards ? "text-xs" : "text-sm"}`}>{post.preferredTime || "—"}</p>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  );
}