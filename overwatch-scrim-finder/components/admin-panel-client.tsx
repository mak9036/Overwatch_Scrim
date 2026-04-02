"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminPost {
  id: number;
  teamName: string;
  eloRange: string;
  region: string[];
  leader: string;
  leaderRole: string;
  mainRole: string[];
}

export default function AdminPanelClient({ initialPosts }: { initialPosts: AdminPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const updateDraft = (id: number, key: keyof AdminPost, value: string | string[]) => {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, [key]: value } : post)),
    );
  };

  const savePost = async (post: AdminPost) => {
    setSavingId(post.id);
    setMessage("");

    const response = await fetch(`/api/admin/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName: post.teamName,
        eloRange: post.eloRange,
        region: post.region,
        leader: post.leader,
        leaderRole: post.leaderRole,
        mainRole: post.mainRole,
      }),
    });

    if (!response.ok) {
      setMessage("Failed to update post.");
      setSavingId(null);
      return;
    }

    const updated = (await response.json()) as AdminPost;
    setPosts((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    setMessage(`Updated ${updated.teamName}.`);
    setSavingId(null);
  };

  const removePost = async (id: number) => {
    setDeletingId(id);
    setMessage("");

    const response = await fetch(`/api/admin/posts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Failed to delete post.");
      setDeletingId(null);
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== id));
    setMessage("Post deleted.");
    setDeletingId(null);
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-orange-400">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/blogs" className="text-zinc-400 hover:text-white text-sm font-semibold">
              📚 Manage Blogs
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-orange-500/40"
            >
              Logout
            </button>
          </div>
        </div>

        <p className="text-zinc-400">Update or remove posts below.</p>
        {message ? <p className="text-sm text-orange-300">{message}</p> : null}

        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-zinc-500">No posts to manage.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-400">Team Name</span>
                    <input
                      value={post.teamName}
                      onChange={(event) => updateDraft(post.id, "teamName", event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-400">ELO Range</span>
                    <input
                      value={post.eloRange}
                      onChange={(event) => updateDraft(post.id, "eloRange", event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-400">Leader Name</span>
                    <input
                      value={post.leader}
                      onChange={(event) => updateDraft(post.id, "leader", event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-400">Position</span>
                    <select
                      value={post.leaderRole}
                      onChange={(event) => updateDraft(post.id, "leaderRole", event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                    >
                      <option value="Player">Player</option>
                      <option value="Manager">Manager</option>
                      <option value="Coach">Coach</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-zinc-400">Region (comma separated)</span>
                    <input
                      value={post.region.join(", ")}
                      onChange={(event) =>
                        updateDraft(
                          post.id,
                          "region",
                          event.target.value
                            .split(",")
                            .map((entry) => entry.trim())
                            .filter(Boolean),
                        )
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-3">
                    <span className="text-zinc-400">Main Roles (comma separated)</span>
                    <input
                      value={post.mainRole.join(", ")}
                      onChange={(event) =>
                        updateDraft(
                          post.id,
                          "mainRole",
                          event.target.value
                            .split(",")
                            .map((entry) => entry.trim())
                            .filter(Boolean),
                        )
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => savePost(post)}
                    disabled={savingId === post.id}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {savingId === post.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePost(post.id)}
                    disabled={deletingId === post.id}
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-60"
                  >
                    {deletingId === post.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
