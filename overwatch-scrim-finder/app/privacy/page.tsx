import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-black text-orange-400">Privacy Policy</h1>
        <p className="text-sm text-zinc-400">Last updated: March 25, 2026</p>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">What we collect</h2>
          <p>We collect account information you submit (username and password), profile and team content you create, and basic technical data needed to operate and protect the service.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">How we use data</h2>
          <p>We use your data to provide account access, publish your team-related content, support messaging and notifications, and protect the platform from abuse.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Cookies and sessions</h2>
          <p>We use essential cookies for login/session functionality and security. The site does not require optional tracking cookies to function.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Data sharing</h2>
          <p>We do not sell personal data. We may disclose data when required by law, to enforce platform rules, or to protect users and service integrity.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Retention and deletion</h2>
          <p>We retain data as needed to run the service and comply with legal obligations. You can request account or data deletion by contacting the site operator.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Contact</h2>
          <p>For privacy requests, contact the site owner at your official support email address before going live.</p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
