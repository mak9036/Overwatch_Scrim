"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import { useI18n } from "@/lib/i18n";

type HeaderSection = "home" | "blogs";

interface SiteHeaderProps {
  active?: HeaderSection;
  accountName?: string;
  accountAvatarUrl?: string;
  onLogout?: () => void | Promise<void>;
}

const navClass = (active: boolean) =>
  active
    ? "shrink-0 whitespace-nowrap text-xs font-semibold text-orange-500 hover:text-orange-400 sm:text-sm"
    : "shrink-0 whitespace-nowrap text-xs text-zinc-400 hover:text-white sm:text-sm";

export default function SiteHeader({ active, accountName, accountAvatarUrl, onLogout }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [resolvedName, setResolvedName] = useState(accountName ?? "");
  const [resolvedAvatar, setResolvedAvatar] = useState(accountAvatarUrl ?? "");
  const activeSection: HeaderSection | undefined =
    active ?? (pathname === "/" ? "home" : pathname?.startsWith("/blogs") ? "blogs" : undefined);

  useEffect(() => {
    if (accountName !== undefined) {
      setResolvedName(accountName);
    }
  }, [accountName]);

  useEffect(() => {
    if (accountAvatarUrl !== undefined) {
      setResolvedAvatar(accountAvatarUrl);
    }
  }, [accountAvatarUrl]);

  useEffect(() => {
    const shouldHydrateFromSession = accountName === undefined || accountAvatarUrl === undefined;
    if (!shouldHydrateFromSession) {
      return;
    }

    const loadSession = async () => {
      try {
        const response = await fetch("/api/account/session?soft=1", { cache: "no-store" });
        const data = (await response.json()) as {
          authenticated?: boolean;
          account?: { username?: string; accountProfile?: { avatarUrl?: string } };
        };

        if (!data.authenticated) {
          setResolvedName("");
          setResolvedAvatar("");
          return;
        }

        setResolvedName(typeof data.account?.username === "string" ? data.account.username : "");
        setResolvedAvatar(
          typeof data.account?.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "",
        );
      } catch {
        setResolvedName("");
        setResolvedAvatar("");
      }
    };

    loadSession();
  }, [accountName, accountAvatarUrl]);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }

    try {
      await fetch("/api/account/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <div className="border-b border-zinc-800 bg-black/50 px-4 py-4 sm:px-6 lg:py-6 lg:pl-6 lg:pr-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl sm:text-2xl">⚔️</div>
          <h1 className="text-lg font-bold text-orange-500 sm:text-2xl">{t("home.brand")}</h1>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-1 sm:gap-6">
        {activeSection === "home" ? (
          <button className={navClass(true)}>{t("home.nav.home")}</button>
        ) : (
          <Link href="/" className={navClass(false)}>
            {t("home.nav.home")}
          </Link>
        )}
        <Link href="/teams" className={navClass(false)}>
          {t("home.nav.teams")}
        </Link>
        <Link href="/ringer" className={navClass(false)}>
          {t("home.nav.ringer")}
        </Link>
        <Link href="/match-finder" className={navClass(false)}>
          {t("home.nav.matchFinder")}
        </Link>
        <Link href="/blogs" className={navClass(activeSection === "blogs")}>
          BLOGS
        </Link>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 text-xs sm:gap-3 sm:text-sm md:mr-24 lg:mr-24 xl:mr-28">
          <NotificationCenter />
          {resolvedName ? (
            <Link
              href="/account/profile"
              className="rounded-xl border border-zinc-700 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-zinc-800 sm:px-4 sm:py-2"
            >
              {t("common.profile")}
            </Link>
          ) : (
            <>
              <Link
                href="/account/create?next=/account/profile"
                className="rounded-xl bg-orange-500 px-3 py-1.5 font-semibold text-black hover:bg-orange-600 sm:px-4 sm:py-2"
              >
                {t("common.createAccount")}
              </Link>
              <Link
                href="/account/login?next=/account/profile"
                className="rounded-xl border border-zinc-700 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-zinc-800 sm:px-4 sm:py-2"
              >
                {t("common.login")}
              </Link>
            </>
          )}
          {resolvedAvatar ? (
            <img src={resolvedAvatar} alt="Avatar" className="h-7 w-7 rounded-full border border-zinc-700 object-cover" />
          ) : (
            <span className="text-lg">👤</span>
          )}
          <span className="hidden sm:inline">{resolvedName || t("common.guest")}</span>
          <span className={`hidden sm:inline ${resolvedName ? "text-green-500" : "text-zinc-500"}`}>●</span>
          {resolvedName ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 font-semibold text-zinc-200 hover:bg-zinc-800 sm:px-3 sm:py-2"
            >
              {t("common.logout")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}