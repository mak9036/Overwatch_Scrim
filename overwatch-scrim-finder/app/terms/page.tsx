import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-black text-orange-400">Terms of Service</h1>
        <p className="text-sm text-zinc-400">Last updated: March 25, 2026</p>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Eligibility</h2>
          <p>By using this site, you confirm you are allowed to use online services in your region and can enter a binding agreement where required.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">User content and conduct</h2>
          <p>You are responsible for content you post. Do not upload illegal, abusive, infringing, or harmful content. The site operator may remove content or suspend accounts for violations.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Intellectual property</h2>
          <p>You retain rights to your content but grant the site a license to host and display it for platform operation. Do not upload content you do not have rights to use.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Service availability</h2>
          <p>The service is provided "as is" and may change or be interrupted. The operator may modify features, moderate content, or discontinue service at any time.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Limitation of liability</h2>
          <p>To the maximum extent allowed by law, the site operator is not liable for indirect or consequential damages arising from platform use.</p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-zinc-300">
          <h2 className="text-lg font-bold text-white">Contact and governing law</h2>
          <p>Before launch, add your legal business/contact information and governing law/jurisdiction to this section.</p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
