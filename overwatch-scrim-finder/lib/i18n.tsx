"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SupportedLanguage = "en" | "ar" | "ko" | "de" | "fr";

type TranslationParams = Record<string, string | number>;

const STORAGE_KEY = "site_language";

const messages = {
  en: {
    language: {
      siteLanguage: "Site language",
      names: {
        en: "English",
        ar: "Arabic",
        ko: "Korean",
        de: "German",
        fr: "French",
      },
    },
    common: {
      all: "All",
      clearFilters: "Clear filters",
      selectedCount: "{count} selected",
      guest: "Guest",
      cancel: "Cancel",
      open: "OPEN",
      profile: "Profile",
      createAccount: "CREATE ACCOUNT",
      login: "LOGIN",
      logout: "LOG OUT",
      signInToPost: "Sign in to Post",
      teamWithName: "Team {name}",
      signedInAs: "Signed in as: {name}",
      roleWithName: "Role: {role}",
      checkingAccount: "Checking account...",
      notSignedIn: "You are not signed in.",
      noDataDash: "—",
    },
    layout: {
      joinDiscord: "Join our Discord",
      checkTwitter: "Check our Twitter/X",
      terms: "Terms",
      privacy: "Privacy",
      cookies: "Cookies",
      copyright: "© {year} Overwatch Scrim Finder",
    },
    home: {
      brand: "Necoss Slave House",
      nav: {
        home: "HOME",
        teams: "TEAMS",
        ringer: "RINGER",
        matchFinder: "MATCH FINDER",
        findPlayers: "FIND PLAYERS",
        myTeam: "My Team",
      },
      search: {
        title: "Search",
        teamNamePlaceholder: "Team name...",
      },
      cta: {
        managerTitle: "List your team",
        playerTitle: "Find your team",
        managerDescription: "Managers can create Team LFP posts so players can find your roster.",
        playerDescription: "Create your own player post and look for a team.",
        postTeam: "Post Team",
        postAccount: "Post Account",
        accountInfo: "Account Info",
      },
      results: {
        title: "OW Players",
        count: "{count} results",
        empty: "No teams posted yet...",
      },
      filters: {
        sort: "Sort",
        region: "Region",
        role: "Role",
        seeking: "Seeking",
        lfpRole: "LFP Role",
        scrimRank: "Scrim Rank",
        rank: "Rank",
      },
      card: {
        deletePost: "Delete Post",
        deleting: "Deleting...",
        scrimRank: "SCRIM RANK",
        members: "MEMBERS",
        tournaments: "TOURNAMENTS",
        owRank: "OW RANK",
        mainRole: "MAIN ROLE",
        teamLfpRoster: "Team LFP Roster",
        noMainRole: "No main role",
        noRosterData: "No roster data.",
        rolesNeeded: "Roles Needed",
        noRolesSelected: "No roles selected.",
        aboutUs: "About Us",
        noDetailsProvided: "No details provided.",
        topPicks: "Top Picks",
        tournamentsInterested: "Tournaments Interested In",
        aboutMe: "About Me",
      },
    },
    options: {
      regions: {
        NA: "North America",
        SA: "South America",
        EMEA: "EMEA",
        JP: "Japan",
        CN: "China",
        APAC: "APAC",
      },
      sort: {
        newest: "Newest",
        oldest: "Oldest",
        teamAz: "Team A-Z",
        teamZa: "Team Z-A",
      },
    },
  },
  ar: {
    language: {
      siteLanguage: "لغة الموقع",
      names: {
        en: "الإنجليزية",
        ar: "العربية",
        ko: "الكورية",
        de: "الألمانية",
        fr: "الفرنسية",
      },
    },
    common: {
      all: "All / الكل",
      clearFilters: "Clear Filters / مسح الفلاتر",
      selectedCount: "{count} selected / تم الاختيار {count}",
      guest: "Guest / زائر",
      cancel: "Cancel / إلغاء",
      open: "OPEN / فتح",
      profile: "Profile / البروفايل",
      createAccount: "Create Account / إنشاء حساب",
      login: "Login / تسجيل دخول",
      logout: "Logout / تسجيل خروج",
      signInToPost: "Sign in to post / سجل دخول للنشر",
      teamWithName: "Team {name} / فريق {name}",
      signedInAs: "Signed in as: {name} / داخل باسم: {name}",
      roleWithName: "Role: {role} / الرول: {role}",
      checkingAccount: "Checking account... / جاري التحقق...",
      notSignedIn: "Not signed in / لم يتم التسجيل",
      noDataDash: "—",
    },
    layout: {
      joinDiscord: "Join our Discord / انضم للدسكورد",
      checkTwitter: "Check Twitter / تحقق تويتر / X",
      terms: "Terms / الشروط",
      privacy: "Privacy / الخصوصية",
      cookies: "Cookies / الكوكيز",
      copyright: "© {year} Overwatch Scrim Finder / موقع سكرم أوفرواتش",
    },
    home: {
      brand: "Necoss Slave House",
      nav: {
        home: "Home / الرئيسية",
        teams: "Teams / الفرق",
        ringer: "Ringer / لاعب بديل",
        matchFinder: "Match Finder / البحث عن سكرم",
        findPlayers: "Find Players / البحث عن لاعبين",
        myTeam: "My Team / فريقي",
      },
      search: {
        title: "Search / بحث",
        teamNamePlaceholder: "Team name... / اسم الفريق...",
      },
      cta: {
        managerTitle: "List your team / أضف فريقك",
        playerTitle: "Find your team / دور لك فريق",
        managerDescription: "Managers can create Team LFP posts so players can find your roster. / تفاصيل للمانجرز",
        playerDescription: "Create your own player post and look for a team. / تفاصيل اللاعب",
        postTeam: "Post Team / نشر فريق",
        postAccount: "Post Account / نشر حساب",
        accountInfo: "Account Info / معلومات الحساب",
      },
      results: {
        title: "OW Players / لاعبين أوفرواتش",
        count: "{count} results / {count} نتيجة",
        empty: "No teams yet... / ما فيه فرق حالياً",
      },
      filters: {
        sort: "Sort / ترتيب",
        region: "Region / السيرفر",
        role: "Role / الرول",
        seeking: "Seeking / يبحث",
        lfpRole: "LFP Role / الرول المطلوب ابحث عن",
        scrimRank: "Scrim Rank / رانك السكرم",
        rank: "Rank / الرانك",
      },
      card: {
        deletePost: "Delete Post / حذف البوست",
        deleting: "Deleting... / جاري الحذف",
        scrimRank: "Scrim Rank / رانك السكرم",
        members: "Members / الأعضاء",
        tournaments: "Tournaments / بطولات",
        owRank: "OW Rank / رانك أوفرواتش",
        mainRole: "Main Role / الرول الأساسي",
        teamLfpRoster: "Team LFP Roster / تشكيلة الفريق الباحث",
        noMainRole: "No main role / لايوجد رول أساسي",
        noRosterData: "No roster data / ما فيه بيانات",
        rolesNeeded: "Roles Needed / الرولات المطلوبة",
        noRolesSelected: "No roles selected / لم يتم اختيار رول",
        aboutUs: "About Us / عن الفريق",
        noDetailsProvided: "No details / لايوجد تفاصيل",
        topPicks: "Top Picks / اعلى الاختيارات",
        tournamentsInterested: "Interested Tournaments / البطولات المهتم فيها",
        aboutMe: "About Me / عني",
      },
    },
    options: {
      regions: {
        NA: "أمريكا الشمالية",
        SA: "أمريكا الجنوبية",
        EMEA: "أوروبا والشرق الأوسط وأفريقيا",
        JP: "اليابان",
        CN: "الصين",
        APAC: "آسيا والمحيط الهادئ",
      },
      sort: {
        newest: "الأحدث",
        oldest: "الأقدم",
        teamAz: "الفريق أ-ي",
        teamZa: "الفريق ي-أ",
      },
    },
  },
  ko: {
    language: {
      siteLanguage: "사이트 언어",
      names: {
        en: "영어",
        ar: "아랍어",
        ko: "한국어",
        de: "독일어",
        fr: "프랑스어",
      },
    },
    common: {
      all: "전체",
      clearFilters: "필터 초기화",
      selectedCount: "{count}개 선택됨",
      guest: "게스트",
      cancel: "취소",
      open: "열기",
      profile: "프로필",
      createAccount: "계정 만들기",
      login: "로그인",
      logout: "로그아웃",
      signInToPost: "로그인 후 게시",
      teamWithName: "팀 {name}",
      signedInAs: "로그인 계정: {name}",
      roleWithName: "역할: {role}",
      checkingAccount: "계정 확인 중...",
      notSignedIn: "로그인되어 있지 않습니다.",
      noDataDash: "—",
    },
    layout: {
      joinDiscord: "디스코드 참가",
      checkTwitter: "트위터/X 보기",
      terms: "이용약관",
      privacy: "개인정보처리방침",
      cookies: "쿠키",
      copyright: "© {year} 오버워치 스크림 파인더",
    },
    home: {
      brand: "Necoss Slave House",
      nav: {
        home: "홈",
        teams: "팀",
        ringer: "링어",
        matchFinder: "매치 찾기",
        findPlayers: "플레이어 찾기",
        myTeam: "내 팀",
      },
      search: {
        title: "검색",
        teamNamePlaceholder: "팀 이름...",
      },
      cta: {
        managerTitle: "팀을 등록하세요",
        playerTitle: "팀을 찾아보세요",
        managerDescription: "매니저는 팀 모집 게시글을 만들어 플레이어가 로스터를 찾을 수 있게 할 수 있습니다.",
        playerDescription: "플레이어 게시글을 만들고 팀을 찾아보세요.",
        postTeam: "팀 게시",
        postAccount: "계정 게시",
        accountInfo: "계정 정보",
      },
      results: {
        title: "오버워치 플레이어",
        count: "결과 {count}개",
        empty: "아직 게시된 팀이 없습니다...",
      },
      filters: {
        sort: "정렬",
        region: "지역",
        role: "역할",
        seeking: "찾는 대상",
        lfpRole: "모집 역할",
        scrimRank: "스크림 랭크",
        rank: "랭크",
      },
      card: {
        deletePost: "게시글 삭제",
        deleting: "삭제 중...",
        scrimRank: "스크림 랭크",
        members: "멤버",
        tournaments: "토너먼트",
        owRank: "오버워치 랭크",
        mainRole: "주 역할",
        teamLfpRoster: "팀 모집 로스터",
        noMainRole: "주 역할 없음",
        noRosterData: "로스터 데이터가 없습니다.",
        rolesNeeded: "필요 역할",
        noRolesSelected: "선택된 역할이 없습니다.",
        aboutUs: "팀 소개",
        noDetailsProvided: "제공된 정보가 없습니다.",
        topPicks: "선호 역할",
        tournamentsInterested: "관심 있는 대회",
        aboutMe: "자기소개",
      },
    },
    options: {
      regions: {
        NA: "북미",
        SA: "남미",
        EMEA: "EMEA",
        JP: "일본",
        CN: "중국",
        APAC: "아시아 태평양",
      },
      sort: {
        newest: "최신순",
        oldest: "오래된순",
        teamAz: "팀 A-Z",
        teamZa: "팀 Z-A",
      },
    },
  },
  de: {
    language: {
      siteLanguage: "Sprache der Website",
      names: {
        en: "Englisch",
        ar: "Arabisch",
        ko: "Koreanisch",
        de: "Deutsch",
        fr: "Französisch",
      },
    },
    common: {
      all: "Alle",
      clearFilters: "Filter zurücksetzen",
      selectedCount: "{count} ausgewählt",
      guest: "Gast",
      cancel: "Abbrechen",
      open: "ÖFFNEN",
      profile: "Profil",
      createAccount: "KONTO ERSTELLEN",
      login: "ANMELDEN",
      logout: "ABMELDEN",
      signInToPost: "Zum Posten anmelden",
      teamWithName: "Team {name}",
      signedInAs: "Angemeldet als: {name}",
      roleWithName: "Rolle: {role}",
      checkingAccount: "Konto wird geprüft...",
      notSignedIn: "Du bist nicht angemeldet.",
      noDataDash: "—",
    },
    layout: {
      joinDiscord: "Unserem Discord beitreten",
      checkTwitter: "Unser Twitter/X ansehen",
      terms: "Nutzungsbedingungen",
      privacy: "Datenschutz",
      cookies: "Cookies",
      copyright: "© {year} Overwatch Scrim Finder",
    },
    home: {
      brand: "Necoss Slave House",
      nav: {
        home: "START",
        teams: "TEAMS",
        ringer: "RINGER",
        matchFinder: "MATCH-FINDER",
        findPlayers: "SPIELER FINDEN",
        myTeam: "Mein Team",
      },
      search: {
        title: "Suche",
        teamNamePlaceholder: "Teamname...",
      },
      cta: {
        managerTitle: "Stelle dein Team vor",
        playerTitle: "Finde dein Team",
        managerDescription: "Manager können Team-LFP-Posts erstellen, damit Spieler euren Kader finden.",
        playerDescription: "Erstelle deinen eigenen Spieler-Post und suche nach einem Team.",
        postTeam: "Team posten",
        postAccount: "Account posten",
        accountInfo: "Kontoinfo",
      },
      results: {
        title: "OW-Spieler",
        count: "{count} Ergebnisse",
        empty: "Noch keine Teams gepostet...",
      },
      filters: {
        sort: "Sortierung",
        region: "Region",
        role: "Rolle",
        seeking: "Gesucht",
        lfpRole: "LFP-Rolle",
        scrimRank: "Scrim-Rang",
        rank: "Rang",
      },
      card: {
        deletePost: "Post löschen",
        deleting: "Wird gelöscht...",
        scrimRank: "SCRIM-RANG",
        members: "MITGLIEDER",
        tournaments: "TURNIERE",
        owRank: "OW-RANG",
        mainRole: "HAUPTROLLE",
        teamLfpRoster: "Team-LFP-Kader",
        noMainRole: "Keine Hauptrolle",
        noRosterData: "Keine Kaderdaten.",
        rolesNeeded: "Benötigte Rollen",
        noRolesSelected: "Keine Rollen ausgewählt.",
        aboutUs: "Über uns",
        noDetailsProvided: "Keine Details angegeben.",
        topPicks: "Top-Picks",
        tournamentsInterested: "Interessierte Turniere",
        aboutMe: "Über mich",
      },
    },
    options: {
      regions: {
        NA: "Nordamerika",
        SA: "Südamerika",
        EMEA: "EMEA",
        JP: "Japan",
        CN: "China",
        APAC: "APAC",
      },
      sort: {
        newest: "Neueste",
        oldest: "Älteste",
        teamAz: "Team A-Z",
        teamZa: "Team Z-A",
      },
    },
  },
  fr: {
    language: {
      siteLanguage: "Langue du site",
      names: {
        en: "Anglais",
        ar: "Arabe",
        ko: "Coréen",
        de: "Allemand",
        fr: "Français",
      },
    },
    common: {
      cancel: "Annuler",
      createAccount: "CRÉER UN COMPTE",
      login: "CONNECTER",
      logout: "DÉCONNECTER",
      signInToPost: "S’enregistrer pour Publier",
    },
    layout: {
      terms: "Termes",
      privacy: "Confidentialité",
      cookies: "Cookies",
    },
    home: {
      nav: {
        home: "MENU",
        teams: "ÉQUIPES",
        ringer: "REMPLAÇANT",
        matchFinder: "TROUVER UN MATCH",
        findPlayers: "TROUVER DES JOUEURS",
        myTeam: "Mon Équipe",
      },
      cta: {
        postTeam: "Publier l’équipe",
        postAccount: "Publier le compte",
        accountInfo: "Informations du Compte",
      },
    },
  },
} as const;

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar" || stored === "ko" || stored === "de" || stored === "fr") {
    return stored;
  }

  return "en";
}

function getMessageValue(language: SupportedLanguage, key: string): string | undefined {
  const segments = key.split(".");
  let current: unknown = messages[language];

  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(message: string, params?: TranslationParams): string {
  if (!params) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>(() => getStoredLanguage());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key: string, params?: TranslationParams) => {
      const message = getMessageValue(language, key) ?? getMessageValue("en", key) ?? key;
      return interpolate(message, params);
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}