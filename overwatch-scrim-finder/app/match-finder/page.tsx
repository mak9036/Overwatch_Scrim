"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";

interface MatchPost {
  id: number;
  teamId: number;
  teamName: string;
  managerUsername: string;
  avatarUrl?: string;
  scrimRank: string;
  region: string[];
  tournaments: string[];
  preferredTime: string;
  notes?: string;
  createdAt: string;
  roster?: Array<{
    username: string;
    role: string;
    mainRoles?: string[];
    avatarUrl?: string;
    topPicks?: string[];
  }>;
  incomingRequests?: Array<{
    id: number;
    requesterManagerUsername: string;
    requesterTeamName: string;
    createdAt: string;
  }>;
  outgoingRequestStatus?: "pending" | "accepted" | "declined" | null;
}

interface SessionAccount {
  username?: string;
  accountProfile?: { avatarUrl?: string };
  gameProfile?: { leaderRole?: string; leaderRoles?: string[] };
}

interface TeamResponse {
  team?: {
    id?: number;
    name?: string;
    managerUsername?: string;
  };
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
};

const getPlayerRolePriority = (mainRoles?: string[]) => {
  const normalizedRoles = Array.isArray(mainRoles)
    ? mainRoles.map((entry) => entry.trim().toLowerCase())
    : [];

  if (normalizedRoles.some((entry) => entry === "tank")) return 0;
  if (normalizedRoles.some((entry) => entry === "hitscan" || entry === "dps" || entry === "main dps" || entry === "hs")) return 1;
  if (normalizedRoles.some((entry) => entry === "flex dps" || entry === "fdps" || entry === "flex")) return 2;
  if (normalizedRoles.some((entry) => entry === "main support" || entry === "support" || entry === "ms")) return 3;
  if (normalizedRoles.some((entry) => entry === "flex support" || entry === "fs")) return 4;
  return 5;
};

const DEFAULT_PLAYER_AVATAR = "/uploads/avatars/44ce68c0-d822-4e3a-8b5f-bfe92075f665.jpg";

export default function MatchFinderPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<MatchPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [managedTeamId, setManagedTeamId] = useState<number | null>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [requestingPostId, setRequestingPostId] = useState<number | null>(null);
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/match-posts");
      if (!response.ok) {
        throw new Error("Failed to load match posts.");
      }
      const data = (await response.json()) as MatchPost[];
      setPosts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load match posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const [sessionResponse, teamResponse] = await Promise.all([
          fetch("/api/account/session?soft=1", { cache: "no-store" }),
          fetch("/api/team", { cache: "no-store" }),
        ]);

        if (sessionResponse.ok) {
          const sessionData = (await sessionResponse.json()) as { account?: SessionAccount };
          if (typeof sessionData.account?.username === "string") {
            setAccountName(sessionData.account.username);
          }
          if (typeof sessionData.account?.accountProfile?.avatarUrl === "string") {
            setAccountAvatarUrl(sessionData.account.accountProfile.avatarUrl);
          }

          const leaderRoles = Array.isArray(sessionData.account?.gameProfile?.leaderRoles)
            ? sessionData.account.gameProfile.leaderRoles
            : [];
          const primaryRole = sessionData.account?.gameProfile?.leaderRole;
          const managerDetected =
            leaderRoles.some((role) => typeof role === "string" && role.toLowerCase() === "manager") ||
            (typeof primaryRole === "string" && primaryRole.toLowerCase() === "manager");
          setIsManager(managerDetected);
        }

        if (teamResponse.ok) {
          const teamData = (await teamResponse.json()) as TeamResponse;
          if (typeof teamData.team?.id === "number" && typeof teamData.team?.managerUsername === "string") {
            const normalizedManager = teamData.team.managerUsername.trim().toLowerCase();
            const normalizedAccount = (accountName || "").trim().toLowerCase();
            if (!normalizedAccount || normalizedManager === normalizedAccount) {
              setManagedTeamId(teamData.team.id);
            }
          }
        }
      } catch {
        setAccountName("");
        setIsManager(false);
      }
    };

    verifySession();
  }, [accountName]);

  const myActivePost = useMemo(() => {
    if (managedTeamId === null) {
      return null;
    }
    return posts.find((post) => post.teamId === managedTeamId) || null;
  }, [posts, managedTeamId]);

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
      router.push("/account/login?next=/match-finder");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/match-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferredTime, notes }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to create match post.");
        return;
      }

      setPreferredTime("");
      setNotes("");
      setSuccessMessage("Match finder post created.");
      await loadPosts();
    } catch {
      setError("Failed to create match post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/match-posts/${postId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to delete match post.");
        return;
      }

      setSuccessMessage("Match finder post deleted.");
      await loadPosts();
    } catch {
      setError("Failed to delete match post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleAskToScrim = async (targetPostId: number) => {
    setRequestingPostId(targetPostId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/scrim-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetPostId }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to send scrim request.");
        return;
      }

      setSuccessMessage("Scrim request sent.");
      await loadPosts();
    } catch {
      setError("Failed to send scrim request.");
    } finally {
      setRequestingPostId(null);
    }
  };

  const handleRespondToRequest = async (requestId: number, action: "accept" | "decline") => {
    setRespondingRequestId(requestId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/scrim-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to respond to scrim request.");
        return;
      }

      setSuccessMessage(action === "accept" ? "Scrim request accepted." : "Scrim request declined.");
      await loadPosts();
    } catch {
      setError("Failed to respond to scrim request.");
    } finally {
      setRespondingRequestId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Match Finder</p>
          <h2 className="mt-3 text-3xl font-black text-white">Post when your team is looking for a match</h2>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Managers can post one active match request per team. Team name, scrim rank, region, and tournaments are pulled from your team and profile automatically.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              placeholder="Preferred time, e.g. Today 8 PM EMEA"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60"
            />
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Extra notes, map set, FT, or rules"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60"
            />
            <button
              type="button"
              onClick={handleCreatePost}
              disabled={!isManager || submitting || Boolean(myActivePost)}
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Posting..." : myActivePost ? "Active Post Exists" : "Post Match"}
            </button>
          </div>

          {!isManager ? <p className="mt-3 text-sm text-zinc-500">Only managers can create match finder posts.</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {successMessage ? <p className="mt-3 text-sm text-green-300">{successMessage}</p> : null}
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading match posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No active match requests right now.</p>
          ) : (
            posts.map((post) => {
              const rosterPlayers = (post.roster || [])
                .filter((member) => {
                  const normalizedRole = member.role.trim().toLowerCase();
                  return normalizedRole !== "manager" && normalizedRole !== "coach";
                })
                .sort((leftMember, rightMember) => {
                  const leftPriority = getPlayerRolePriority(leftMember.mainRoles);
                  const rightPriority = getPlayerRolePriority(rightMember.mainRoles);
                  if (leftPriority !== rightPriority) {
                    return leftPriority - rightPriority;
                  }
                  return leftMember.username.localeCompare(rightMember.username);
                });

              return (
              <div key={post.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-3">
                    {post.avatarUrl ? (
                      <img src={post.avatarUrl} alt={`${post.teamName} avatar`} className="h-14 w-14 rounded-full border border-zinc-700 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/20 text-xl">👥</div>
                    )}
                    <div>
                      <p className="text-lg font-bold text-white">{post.teamName}</p>
                      <p className="text-sm text-zinc-400">Manager: {post.managerUsername}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">Posted {formatTimestamp(post.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {accountName && post.managerUsername.trim().toLowerCase() === accountName.trim().toLowerCase() ? (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingPostId === post.id}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingPostId === post.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                    {isManager && post.managerUsername.trim().toLowerCase() !== accountName.trim().toLowerCase() ? (
                      <button
                        type="button"
                        onClick={() => handleAskToScrim(post.id)}
                        disabled={requestingPostId === post.id || post.outgoingRequestStatus === "pending"}
                        className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {requestingPostId === post.id
                          ? "Sending..."
                          : post.outgoingRequestStatus === "pending"
                            ? "Request Pending"
                            : post.outgoingRequestStatus === "accepted"
                              ? "Request Accepted"
                              : post.outgoingRequestStatus === "declined"
                                ? "Request Declined"
                                : "Ask to Scrim"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Scrim Rank</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.scrimRank.toUpperCase()}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Region</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.region.length > 0 ? post.region.join(" • ") : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Tournaments</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.tournaments.length > 0 ? post.tournaments.join(", ") : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Preferred Time</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.preferredTime}</p>
                  </div>
                </div>

                {post.notes ? (
                  <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Notes</p>
                    <p className="mt-1 text-sm text-zinc-200">{post.notes}</p>
                  </div>
                ) : null}

                {post.incomingRequests && post.incomingRequests.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-950/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Incoming Scrim Requests</p>
                    <div className="mt-2 space-y-2">
                      {post.incomingRequests.map((scrimRequest) => (
                        <div key={scrimRequest.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-2.5 py-2">
                          <p className="text-xs text-zinc-300">
                            <span className="font-semibold text-zinc-100">{scrimRequest.requesterTeamName}</span> ({scrimRequest.requesterManagerUsername})
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRespondToRequest(scrimRequest.id, "accept")}
                              disabled={respondingRequestId === scrimRequest.id}
                              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {respondingRequestId === scrimRequest.id ? "Working..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondToRequest(scrimRequest.id, "decline")}
                              disabled={respondingRequestId === scrimRequest.id}
                              className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {respondingRequestId === scrimRequest.id ? "Working..." : "Decline"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-zinc-700/60 bg-[linear-gradient(180deg,rgba(39,39,42,0.45),rgba(12,12,15,0.92))] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">Roster</p>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      {rosterPlayers.length} players
                    </span>
                  </div>
                  {rosterPlayers.length > 0 ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {rosterPlayers.map((member) => (
                        <div
                          key={`${post.id}-${member.username}-${member.role}`}
                          className="h-[124px] rounded-lg border border-zinc-700/70 bg-[linear-gradient(180deg,rgba(39,39,42,0.75),rgba(24,24,27,0.9))] px-2.5 py-2 text-xs shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]"
                        >
                          <div className="flex items-center gap-2">
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl || DEFAULT_PLAYER_AVATAR}
                                  alt={`${member.username} avatar`}
                                  className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                                />
                              ) : (
                                <img
                                  src={DEFAULT_PLAYER_AVATAR}
                                  alt={`${member.username} avatar`}
                                  className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                                />
                              )}
                              <p className="font-semibold text-zinc-100">{member.username}</p>
                          </div>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Main Roles</p>
                          <p className="mt-1 rounded border border-zinc-700/70 bg-zinc-950/70 px-2 py-1 text-zinc-200">
                            {member.mainRoles && member.mainRoles.length > 0 ? member.mainRoles.join(" • ") : "Not set"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No players listed.</p>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}