"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import SiteHeader from "@/components/site-header";
import SiteSidebar from "@/components/site-sidebar";
import { useI18n } from "@/lib/i18n";

const DISCORD_INVITE_URL = "https://discord.gg/";
const TWITTER_URL = "https://x.com/LFFfinder";

export default function AppChrome({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col lg:flex-row">
        <SiteSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <CookieConsentBanner />
      <footer className="border-t border-zinc-800 bg-zinc-900/70 px-6 py-5 text-xs text-zinc-400">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t("layout.joinDiscord")}
              title={t("layout.joinDiscord")}
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M20.32 4.37a19.8 19.8 0 0 0-4.92-1.56.07.07 0 0 0-.07.03c-.21.37-.44.86-.6 1.24a18.4 18.4 0 0 0-5.46 0 12.6 12.6 0 0 0-.61-1.24.08.08 0 0 0-.07-.03 19.7 19.7 0 0 0-4.92 1.56.07.07 0 0 0-.03.03C.53 9.07-.32 13.62.1 18.11a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6.03 3.05.08.08 0 0 0 .09-.03c.47-.64.9-1.31 1.27-2.01a.08.08 0 0 0-.04-.11 13.2 13.2 0 0 1-1.89-.9.08.08 0 0 1-.01-.13c.13-.1.27-.2.4-.31a.08.08 0 0 1 .08-.01c3.97 1.81 8.27 1.81 12.2 0a.08.08 0 0 1 .09.01c.13.11.26.21.4.31a.08.08 0 0 1-.01.13c-.6.35-1.23.65-1.89.9a.08.08 0 0 0-.04.11c.38.7.8 1.37 1.28 2.01a.08.08 0 0 0 .09.03 19.8 19.8 0 0 0 6.03-3.05.08.08 0 0 0 .03-.05c.5-5.19-.84-9.7-3.55-13.74a.06.06 0 0 0-.03-.04ZM8.02 15.36c-1.2 0-2.18-1.1-2.18-2.45 0-1.35.96-2.45 2.18-2.45 1.23 0 2.2 1.1 2.18 2.45 0 1.35-.96 2.45-2.18 2.45Zm7.96 0c-1.2 0-2.18-1.1-2.18-2.45 0-1.35.96-2.45 2.18-2.45 1.23 0 2.2 1.1 2.18 2.45 0 1.35-.95 2.45-2.18 2.45Z" />
              </svg>
            </a>
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t("layout.checkTwitter")}
              title={t("layout.checkTwitter")}
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.25l-4.9-6.36L6.5 22H3.4l7.24-8.28L1 2h6.4l4.43 5.8L18.9 2Zm-1.1 18h1.73L6.48 3.9H4.62L17.8 20Z" />
              </svg>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-zinc-200">
                {t("layout.terms")}
              </Link>
              <Link href="/privacy" className="hover:text-zinc-200">
                {t("layout.privacy")}
              </Link>
              <Link href="/cookies" className="hover:text-zinc-200">
                {t("layout.cookies")}
              </Link>
            </nav>
            <p>{t("layout.copyright", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </>
  );
}