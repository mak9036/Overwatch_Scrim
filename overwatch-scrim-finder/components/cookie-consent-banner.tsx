"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "cookie-consent-v1";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      setVisible(saved !== "accepted");
    } catch {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch {
      // no-op
    }
    setVisible(false);
  };

  const declineCookies = () => {
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-white">Cookies Notice</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          We use essential cookies for login/session functionality and security. The site does not require optional tracking cookies to function.
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          Learn more in our <Link href="/cookies" className="text-orange-300 hover:text-orange-200">Cookies Policy</Link> and <Link href="/privacy" className="text-orange-300 hover:text-orange-200">Privacy Policy</Link>.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={acceptCookies}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400"
          >
            Allow
          </button>
          <button
            type="button"
            onClick={declineCookies}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
