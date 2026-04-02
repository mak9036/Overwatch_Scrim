"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function AccountCreateContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
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

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedLegal) {
      setError("You must accept the Terms and Privacy Policy to create an account.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, acceptedLegal }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Could not create account.");
        setLoading(false);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not create account.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h1 className="text-2xl font-bold text-orange-400">Create Account</h1>
        <p className="text-sm text-zinc-400">Username and password only.</p>

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

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
            required
            minLength={6}
            maxLength={64}
          />
        </label>

        <label className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
          <input
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => setAcceptedLegal(event.target.checked)}
            className="mt-0.5 accent-orange-500"
            required
          />
          <span className="text-zinc-300 leading-5">
            I agree to the <Link href="/terms" className="text-orange-300 hover:text-orange-200">Terms of Service</Link> and acknowledge the <Link href="/privacy" className="text-orange-300 hover:text-orange-200">Privacy Policy</Link>.
          </span>
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>

        <Link href="/" className="block text-center text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to listings
        </Link>
      </form>
    </div>
  );
}

export default function AccountCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-6">
          Loading account creation...
        </div>
      }
    >
      <AccountCreateContent />
    </Suspense>
  );
}
