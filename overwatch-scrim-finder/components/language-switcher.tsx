"use client";

import { useI18n, type SupportedLanguage } from "@/lib/i18n";

const LANGUAGES: SupportedLanguage[] = ["en", "ar", "ko", "de", "fr"];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="notranslate rounded-xl border border-zinc-700 bg-zinc-900/95 p-1.5">
      <label htmlFor="site-language" className="sr-only">
        {t("language.siteLanguage")}
      </label>
      <select
        id="site-language"
        value={language}
        onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
        className="cursor-pointer rounded-lg border border-zinc-600 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 outline-none transition hover:border-orange-500/70 focus:border-orange-500 sm:text-sm"
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {code === "en" ? "🇬🇧" : code === "ar" ? "🇸🇦" : code === "ko" ? "🇰🇷" : code === "de" ? "🇩🇪" : "🇫🇷"} {t(`language.names.${code}`)}
          </option>
        ))}
      </select>
    </div>
  );
}