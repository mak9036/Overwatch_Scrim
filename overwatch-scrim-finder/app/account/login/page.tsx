"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function AccountLoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/account/profile";

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const response = await fetch("/api/account/session", { cache: "no-store" });
        if (response.ok) {
          router.replace(nextPath);
        }
      } catch {
        // no-op
      }
    };

    checkExistingSession();
  }, [nextPath, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Could not log in.");
        setLoading(false);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not log in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h1 className="text-2xl font-bold text-orange-400">Login</h1>
        <p className="text-sm text-zinc-400">Sign in with your username and password.</p>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Account Name</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
            required
            minLength={2}
            maxLength={24}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
            required
            minLength={6}
            maxLength={64}
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <Link href="/account/create?next=/account/profile" className="block text-center text-sm text-zinc-400 hover:text-white">
          Need an account? Create one
        </Link>

        <Link href="/" className="block text-center text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to listings
        </Link>
      </form>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-6">
          Loading login...
        </div>
      }
    >
      <AccountLoginContent />
    </Suspense>
  );
}
