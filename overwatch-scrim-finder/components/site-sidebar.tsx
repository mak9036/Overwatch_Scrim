"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function SiteSidebar() {
  const { t } = useI18n();

  return (
    <aside className="w-full border-b border-zinc-800 bg-zinc-950/50 p-4 sm:p-6 lg:w-48 lg:border-b-0 lg:border-r lg:space-y-6">
      <div className="relative h-24 w-full">
        <img
          src="/Overwatch_circle_logo.svg.png"
          alt="Overwatch logo"
          className="h-full w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) {
              fallback.style.display = "flex";
            }
          }}
        />
        <div className="absolute inset-0 hidden items-center justify-center text-sm font-bold uppercase tracking-[0.25em] text-zinc-500">
          OW
        </div>
      </div>

      <div className="space-y-2">
        <Link href="/team" className="block w-full px-3 py-2 text-zinc-400 hover:text-white">
          👥 {t("home.nav.myTeam")}
        </Link>
      </div>
    </aside>
  );
}