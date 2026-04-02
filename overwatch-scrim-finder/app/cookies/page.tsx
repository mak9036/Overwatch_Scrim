import Link from "next/link";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-black text-orange-400">Cookies Policy</h1>
        <p className="text-sm text-zinc-400">Last updated: March 25, 2026</p>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Essential cookies</h2>
          <p>We use essential cookies for login/session functionality and security. The site does not require optional tracking cookies to function.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Cookie duration</h2>
          <p>Session cookies may remain active while you are signed in and can persist based on account session settings.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Managing cookies</h2>
          <p>You can clear cookies from your browser settings. Clearing cookies may sign you out and affect normal site functionality.</p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
