"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NotificationCenter from "@/components/notification-center";
import CountryFlag from "@/components/country-flag";
import { notifyAppSessionChanged } from "@/lib/client-events";
import { COUNTRY_OPTIONS, getCountryLabel } from "@/lib/countries";

const MAIN_ROLE_OPTIONS = [
  { value: "Tank", label: "Tank" },
  { value: "Hitscan", label: "Hitscan" },
  { value: "Flex DPS", label: "Flex DPS" },
  { value: "Flex Support", label: "Flex Support" },
  { value: "Main Support", label: "Main Support" },
];

const REGION_OPTIONS = [
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "EMEA", label: "EMEA" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "APAC", label: "APAC" },
];

const LEADER_ROLE_OPTIONS = [
  { value: "Player", label: "Player" },
  { value: "Manager", label: "Manager" },
  { value: "Coach", label: "Coach" },
];

const getPrimaryLeaderRole = (roles: string[]) => {
  if (roles.includes("Manager")) {
    return "Manager";
  }
  if (roles.includes("Coach")) {
    return "Coach";
  }
  if (roles.includes("Player")) {
    return "Player";
  }
  return "Player";
};

const RANK_OPTIONS = [
  { value: "3000", label: "3000" },
  { value: "3500", label: "3500" },
  { value: "4000", label: "4000" },
  { value: "4500", label: "4500" },
  { value: "open", label: "Open" },
  { value: "adv", label: "Advanced" },
  { value: "expert", label: "Expert" },
  { value: "master", label: "Master" },
  { value: "owcs", label: "OWCS" },
];

const PLAYER_RANK_OPTIONS = [
  { value: "Bronze", label: "Bronze" },
  { value: "Silver", label: "Silver" },
  { value: "Gold", label: "Gold" },
  { value: "Platinum", label: "Platinum" },
  { value: "Diamond", label: "Diamond" },
  { value: "Master", label: "Master" },
  { value: "Grandmaster", label: "Grandmaster" },
  { value: "Champion", label: "Champion" },
];

const OVERWATCH_HEROES: { role: string; heroes: string[] }[] = [
  {
    role: "Tank",
    heroes: ["D.Va", "Domina", "Doomfist", "Hazard", "Junker Queen", "Mauga", "Orisa", "Ramattra", "Reinhardt", "Roadhog", "Sigma", "Winston", "Wrecking Ball", "Zarya"],
  },
  {
    role: "Damage",
    heroes: ["Anran", "Ashe", "Bastion", "Cassidy", "Echo", "Emre", "Freja", "Genji", "Hanzo", "Junkrat", "Mei", "Pharah", "Reaper", "Soldier: 76", "Sojourn", "Sombra", "Symmetra", "Torbjörn", "Tracer", "Venture", "Widowmaker"],
  },
  {
    role: "Support",
    heroes: ["Ana", "Baptiste", "Brigitte", "Illari", "Jetpack Cat", "Juno", "Kiriko", "Lifeweaver", "Lúcio", "Mercy", "Mizuki", "Moira", "Zenyatta"],
  },
];

const MAIN_ROLE_TO_HERO_GROUP: Record<string, string> = {
  Tank: "Tank",
  Hitscan: "Damage",
  "Flex DPS": "Damage",
  "Flex Support": "Support",
  "Main Support": "Support",
};

const PRO_MATCH_ALLOWED_HOSTS = ["liquipedia.net"] as const;

const isAllowedProMatchUrl = (raw: string) => {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return PRO_MATCH_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
};

const extractEntryLink = (entry: string) => {
  const match = entry.match(/https?:\/\/\S+/i);
  if (!match) {
    return { label: entry, href: "" };
  }
  const href = match[0];
  if (!isAllowedProMatchUrl(href)) {
    return { label: entry.replace(href, "").replace(/[\-|:]+$/, "").trim(), href: "" };
  }
  const label = entry.replace(href, "").replace(/[\-|:]+$/, "").trim() || href;
  return { label, href };
};

const AVATAR_EDITOR_FRAME_SIZE = 340;
const AVATAR_EDITOR_CROP_RATIO = 0.8;
const AVATAR_EDITOR_CROP_SIZE = AVATAR_EDITOR_FRAME_SIZE * AVATAR_EDITOR_CROP_RATIO;
const AVATAR_EDITOR_CROP_OFFSET = (AVATAR_EDITOR_FRAME_SIZE - AVATAR_EDITOR_CROP_SIZE) / 2;
const AVATAR_EDITOR_OUTPUT_SIZE = 512;
const AVATAR_EDITOR_MAX_ZOOM_CAP = 12;

const getAvatarDrawGeometry = (
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) => {
  const baseScale = Math.max(
    AVATAR_EDITOR_CROP_SIZE / imageWidth,
    AVATAR_EDITOR_CROP_SIZE / imageHeight,
  );
  const effectiveScale = baseScale * zoom;
  const drawWidth = imageWidth * effectiveScale;
  const drawHeight = imageHeight * effectiveScale;
  const maxOffsetX = Math.max(0, (drawWidth - AVATAR_EDITOR_CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - AVATAR_EDITOR_CROP_SIZE) / 2);
  const clampedOffsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX));
  const clampedOffsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY));

  return {
    drawWidth,
    drawHeight,
    drawX: (AVATAR_EDITOR_CROP_SIZE - drawWidth) / 2 + clampedOffsetX,
    drawY: (AVATAR_EDITOR_CROP_SIZE - drawHeight) / 2 + clampedOffsetY,
    clampedOffsetX,
    clampedOffsetY,
    effectiveScale,
  };
};

const getAvatarSourceCrop = (
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) => {
  const geometry = getAvatarDrawGeometry(imageWidth, imageHeight, zoom, offsetX, offsetY);
  const cropSizeInSourcePixels = AVATAR_EDITOR_CROP_SIZE / geometry.effectiveScale;
  const centerX = imageWidth / 2 - geometry.clampedOffsetX / geometry.effectiveScale;
  const centerY = imageHeight / 2 - geometry.clampedOffsetY / geometry.effectiveScale;
  const sx = Math.min(
    Math.max(0, centerX - cropSizeInSourcePixels / 2),
    Math.max(0, imageWidth - cropSizeInSourcePixels),
  );
  const sy = Math.min(
    Math.max(0, centerY - cropSizeInSourcePixels / 2),
    Math.max(0, imageHeight - cropSizeInSourcePixels),
  );

  return {
    sx,
    sy,
    sSize: cropSizeInSourcePixels,
  };
};

function AccountProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingSession, setLoadingSession] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [battleTag, setBattleTag] = useState("");
  const [country, setCountry] = useState("");
  const [discordTag, setDiscordTag] = useState("");
  const [discordUserId, setDiscordUserId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [discordDmNotifications, setDiscordDmNotifications] = useState(true);
  const [twitterUrl, setTwitterUrl] = useState("");
  const [faceitUrl, setFaceitUrl] = useState("");
  const [proMatches, setProMatches] = useState<string[]>([]);
  const [pendingProMatch, setPendingProMatch] = useState("");
  const [rank, setRank] = useState("");
  const [playerRank, setPlayerRank] = useState("");
  const [region, setRegion] = useState<string[]>([]);
  const [leaderRoles, setLeaderRoles] = useState<string[]>(["Player"]);
  const [mainRole, setMainRole] = useState<string[]>([]);
  const [topPicks, setTopPicks] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarEditorImageSrc, setAvatarEditorImageSrc] = useState("");
  const [avatarEditorMimeType, setAvatarEditorMimeType] = useState("image/png");
  const [avatarEditorImageSize, setAvatarEditorImageSize] = useState<{ width: number; height: number } | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [draggingAvatar, setDraggingAvatar] = useState(false);
  const avatarDragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hasDiscordLinked = discordUserId.trim().length > 0;
  const resolvedDiscordTag = hasDiscordLinked ? (discordUsername || discordTag) : discordTag;
  const visibleHeroGroups = OVERWATCH_HEROES.filter((group) =>
    mainRole.some((role) => MAIN_ROLE_TO_HERO_GROUP[role] === group.role),
  );
  const allowedHeroNames = new Set(visibleHeroGroups.flatMap((group) => group.heroes));

  useEffect(() => {
    const discordStatus = searchParams.get("discord") || "";
    if (!discordStatus) {
      return;
    }

    if (discordStatus === "connected") {
      setSuccess("Discord connected successfully. You will be eligible for Discord DM notifications.");
      setError("");
      return;
    }

    const statusMessageMap: Record<string, string> = {
      "config-missing": "Discord is not configured yet. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your environment.",
      "cancelled": "Discord connect was cancelled.",
      "invalid-state": "Discord connect verification failed. Please try again.",
      "missing-code": "Discord did not return an authorization code. Please try again.",
      "token-failed": "Discord token exchange failed. Check your Discord app redirect settings.",
      "token-missing": "Discord token response was invalid. Please try again.",
      "user-fetch-failed": "Could not fetch your Discord user profile.",
      "user-id-missing": "Discord user ID was missing from the response.",
      "not-logged-in": "Please log in to your website account first, then connect Discord.",
    };

    setError(statusMessageMap[discordStatus] || "Discord connect was not completed. Please try again.");
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" });
        if (!response.ok) {
          router.replace("/account/create?next=/account/profile");
          return;
        }

        const data = (await response.json()) as {
          account?: {
            username?: string;
            accountProfile?: {
              avatarUrl?: string;
              bio?: string;
              battleTag?: string;
              country?: string;
              discordTag?: string;
              discordUserId?: string;
              discordUsername?: string;
              discordDmNotifications?: boolean;
              twitterUrl?: string;
              faceitUrl?: string;
              proMatches?: string[];
            };
            gameProfile?: {
              rank?: string;
              eloRange?: string;
              region?: string[];
              leaderRole?: string;
              leaderRoles?: string[];
              mainRole?: string[];
              topPicks?: string[];
            };
          };
        };

        setAccountName(typeof data.account?.username === "string" ? data.account.username : "");
  setAvatarUrl(typeof data.account?.accountProfile?.avatarUrl === "string" ? data.account.accountProfile.avatarUrl : "");
  setBio(typeof data.account?.accountProfile?.bio === "string" ? data.account.accountProfile.bio : "");
  setBattleTag(typeof data.account?.accountProfile?.battleTag === "string" ? data.account.accountProfile.battleTag : "");
  setCountry(typeof data.account?.accountProfile?.country === "string" ? data.account.accountProfile.country.toUpperCase() : "");
  const incomingDiscordTag = typeof data.account?.accountProfile?.discordTag === "string" ? data.account.accountProfile.discordTag : "";
  const incomingDiscordUsername = typeof data.account?.accountProfile?.discordUsername === "string" ? data.account.accountProfile.discordUsername : "";
  setDiscordTag(incomingDiscordTag || incomingDiscordUsername);
  setDiscordUserId(typeof data.account?.accountProfile?.discordUserId === "string" ? data.account.accountProfile.discordUserId : "");
  setDiscordUsername(incomingDiscordUsername);
  setDiscordDmNotifications(typeof data.account?.accountProfile?.discordDmNotifications === "boolean" ? data.account.accountProfile.discordDmNotifications : true);
  setTwitterUrl(typeof data.account?.accountProfile?.twitterUrl === "string" ? data.account.accountProfile.twitterUrl : "");
  setFaceitUrl(typeof data.account?.accountProfile?.faceitUrl === "string" ? data.account.accountProfile.faceitUrl : "");
  setProMatches(Array.isArray(data.account?.accountProfile?.proMatches) ? data.account?.accountProfile?.proMatches || [] : []);
        const storedRank = typeof data.account?.gameProfile?.rank === "string" ? data.account.gameProfile.rank.trim() : "";
        if (storedRank && RANK_OPTIONS.some((option) => option.value === storedRank)) {
          setRank(storedRank);
        } else {
          const fallbackRank = typeof data.account?.gameProfile?.eloRange === "string" ? data.account.gameProfile.eloRange.trim() : "";
          setRank(RANK_OPTIONS.some((option) => option.value === fallbackRank) ? fallbackRank : "");
        }
        const storedPlayerRank = typeof data.account?.gameProfile?.eloRange === "string" ? data.account.gameProfile.eloRange.trim() : "";
        setPlayerRank(
          PLAYER_RANK_OPTIONS.some((option) => option.value === storedPlayerRank) ? storedPlayerRank : "",
        );
  setRegion(Array.isArray(data.account?.gameProfile?.region) ? data.account?.gameProfile?.region || [] : []);
        const incomingLeaderRoles =
          Array.isArray(data.account?.gameProfile?.leaderRoles) && data.account.gameProfile.leaderRoles.length > 0
            ? data.account.gameProfile.leaderRoles.filter((entry): entry is string => typeof entry === "string")
            : typeof data.account?.gameProfile?.leaderRole === "string"
              ? [data.account.gameProfile.leaderRole]
              : ["Player"];
        setLeaderRoles(incomingLeaderRoles);
        setMainRole(Array.isArray(data.account?.gameProfile?.mainRole) ? data.account?.gameProfile?.mainRole || [] : []);
        setTopPicks(Array.isArray(data.account?.gameProfile?.topPicks) ? data.account?.gameProfile?.topPicks || [] : []);
        setLoadingSession(false);
      } catch {
        router.replace("/account/create?next=/account/profile");
      }
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    if (allowedHeroNames.size === 0) {
      return;
    }

    setTopPicks((prev) => {
      const next = prev.filter((hero) => allowedHeroNames.has(hero));
      return next.length === prev.length ? prev : next;
    });
  }, [mainRole]);

  useEffect(() => {
    if (!avatarEditorImageSize) {
      return;
    }

    const geometry = getAvatarDrawGeometry(
      avatarEditorImageSize.width,
      avatarEditorImageSize.height,
      avatarZoom,
      avatarOffsetX,
      avatarOffsetY,
    );

    if (Math.abs(geometry.clampedOffsetX - avatarOffsetX) > 0.01) {
      setAvatarOffsetX(geometry.clampedOffsetX);
    }
    if (Math.abs(geometry.clampedOffsetY - avatarOffsetY) > 0.01) {
      setAvatarOffsetY(geometry.clampedOffsetY);
    }
  }, [avatarEditorImageSize, avatarOffsetX, avatarOffsetY, avatarZoom]);

  useEffect(() => {
    if (!avatarEditorOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [avatarEditorOpen]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    setSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl,
          bio,
          battleTag,
          country,
          discordTag: resolvedDiscordTag,
          discordDmNotifications,
          twitterUrl,
          faceitUrl,
          proMatches,
          rank,
          eloRange: playerRank,
          region,
          leaderRole: getPrimaryLeaderRole(leaderRoles),
          leaderRoles,
          mainRole,
          topPicks,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Could not update profile.");
        setSaving(false);
        return;
      }

      setSuccess("Profile updated.");
      notifyAppSessionChanged();
      setSaving(false);
    } catch {
      setError("Could not update profile.");
      setSaving(false);
    }
  };

  const onAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setSuccess("");
    if (file.type && !file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Could not read image."));
        reader.readAsDataURL(file);
      });

      if (!dataUrl) {
        setError("Could not open image.");
        return;
      }

      const imageSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => reject(new Error("Could not decode image."));
        image.src = dataUrl;
      });

      setAvatarEditorImageSrc(dataUrl);
      setAvatarEditorImageSize(imageSize);
      setAvatarEditorMimeType(file.type || "image/png");
      setAvatarZoom(1);
      setAvatarOffsetX(0);
      setAvatarOffsetY(0);
      setAvatarEditorOpen(true);
    } catch {
      setError("Could not open avatar editor.");
    } finally {
      event.target.value = "";
    }
  };

  const closeAvatarEditor = () => {
    setAvatarEditorOpen(false);
    setDraggingAvatar(false);
    avatarDragStartRef.current = null;
  };

  const uploadEditedAvatar = async () => {
    if (!avatarEditorImageSrc || !avatarEditorImageSize) {
      setError("No image selected.");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingAvatar(true);

    try {
      const sourceCrop = getAvatarSourceCrop(
        avatarEditorImageSize.width,
        avatarEditorImageSize.height,
        avatarZoom,
        avatarOffsetX,
        avatarOffsetY,
      );

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Could not decode avatar image."));
        nextImage.src = avatarEditorImageSrc;
      });

      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_EDITOR_OUTPUT_SIZE;
      canvas.height = AVATAR_EDITOR_OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        setError("Could not render avatar.");
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, AVATAR_EDITOR_OUTPUT_SIZE, AVATAR_EDITOR_OUTPUT_SIZE);
      context.save();
      context.beginPath();
      context.arc(
        AVATAR_EDITOR_OUTPUT_SIZE / 2,
        AVATAR_EDITOR_OUTPUT_SIZE / 2,
        AVATAR_EDITOR_OUTPUT_SIZE / 2,
        0,
        Math.PI * 2,
      );
      context.closePath();
      context.clip();
      context.drawImage(
        image,
        sourceCrop.sx,
        sourceCrop.sy,
        sourceCrop.sSize,
        sourceCrop.sSize,
        0,
        0,
        AVATAR_EDITOR_OUTPUT_SIZE,
        AVATAR_EDITOR_OUTPUT_SIZE,
      );
      context.restore();

      const fallbackMime = "image/png";
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), fallbackMime, 0.92);
      });

      if (!blob) {
        setError("Could not create cropped avatar image.");
        return;
      }

      const extension = "png";
      const croppedFile = new File([blob], `avatar-cropped.${extension}`, { type: blob.type });
      const formData = new FormData();
      formData.append("avatar", croppedFile);

      const response = await fetch("/api/account/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Could not upload avatar.");
        return;
      }

      const data = (await response.json()) as { avatarUrl?: string };
      if (typeof data.avatarUrl === "string") {
        setAvatarUrl(data.avatarUrl);
      }
      setSuccess("Avatar uploaded.");
      notifyAppSessionChanged();
      closeAvatarEditor();
    } catch {
      setError("Could not upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const nextZoom = Math.min(
      avatarEditorSliderMaxZoom,
      Math.max(1, avatarZoom + (event.deltaY < 0 ? 0.12 : -0.12)),
    );

    if (avatarEditorImageSize) {
      const geometry = getAvatarDrawGeometry(
        avatarEditorImageSize.width,
        avatarEditorImageSize.height,
        nextZoom,
        avatarOffsetX,
        avatarOffsetY,
      );
      setAvatarOffsetX(geometry.clampedOffsetX);
      setAvatarOffsetY(geometry.clampedOffsetY);
    }
    setAvatarZoom(nextZoom);
  };

  const resetAvatarEditorView = () => {
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
  };

  const handleAvatarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!avatarEditorImageSize) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingAvatar(true);
    avatarDragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: avatarOffsetX,
      offsetY: avatarOffsetY,
    };
  };

  const handleAvatarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingAvatar || !avatarEditorImageSize || !avatarDragStartRef.current) {
      return;
    }

    const deltaX = event.clientX - avatarDragStartRef.current.x;
    const deltaY = event.clientY - avatarDragStartRef.current.y;
    const geometry = getAvatarDrawGeometry(
      avatarEditorImageSize.width,
      avatarEditorImageSize.height,
      avatarZoom,
      avatarDragStartRef.current.offsetX + deltaX,
      avatarDragStartRef.current.offsetY + deltaY,
    );

    setAvatarOffsetX(geometry.clampedOffsetX);
    setAvatarOffsetY(geometry.clampedOffsetY);
  };

  const handleAvatarPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingAvatar(false);
    avatarDragStartRef.current = null;
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/account/logout", { method: "POST" });
      notifyAppSessionChanged();
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading profile...
      </div>
    );
  }

  const avatarEditorGeometry = avatarEditorImageSize
    ? getAvatarDrawGeometry(
        avatarEditorImageSize.width,
        avatarEditorImageSize.height,
        avatarZoom,
        avatarOffsetX,
        avatarOffsetY,
      )
    : null;
  const avatarEditorSliderMaxZoom = AVATAR_EDITOR_MAX_ZOOM_CAP;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <form
        onSubmit={onSubmit}
        className="min-h-screen w-full space-y-6 bg-gradient-to-br from-black via-zinc-900 to-black p-4 sm:p-6"
      >
        <div className="flex items-center justify-end gap-3">
            <NotificationCenter />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              LOG OUT
            </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="text-3xl font-black text-orange-400 sm:text-4xl">Profile</h1>
          <p className="mt-1 text-sm text-zinc-300">Manage your full account profile, rank, roles, heroes, and showcase info.</p>
        </div>

        <div className="grid min-h-[78vh] gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_minmax(240px,320px)]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-col items-center text-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" className="h-36 w-36 rounded-full border-2 border-zinc-700 object-cover sm:h-44 sm:w-44 xl:h-48 xl:w-48" />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-5xl sm:h-44 sm:w-44 sm:text-6xl xl:h-48 xl:w-48">👤</div>
              )}
              <p className="mt-4 break-all font-heading text-3xl font-black text-white sm:text-4xl">{accountName || "Unknown"}</p>
              <p className="mt-1 text-sm text-zinc-400">Account Profile</p>
              <label className="mt-5 inline-block cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
                {uploadingAvatar ? "Uploading..." : "Upload Profile Picture"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarFileChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div className="mt-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
              <p className="font-semibold uppercase tracking-wide text-zinc-400">Quick Snapshot</p>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Battle Tag</span>
                <span className="font-semibold text-zinc-200">{battleTag || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Country</span>
                {country ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-zinc-200">
                    <CountryFlag countryCode={country} className="h-3.5 w-5 rounded-sm border border-zinc-700 object-cover" title={`${getCountryLabel(country)} flag`} />
                    {getCountryLabel(country)}
                  </span>
                ) : (
                  <span className="font-semibold text-zinc-200">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Discord</span>
                <span className="font-semibold text-zinc-200">{resolvedDiscordTag || "Not connected"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Twitter</span>
                <span className="max-w-[140px] truncate text-right font-semibold text-zinc-200 sm:max-w-[180px]">{twitterUrl || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Faceit</span>
                <span className="max-w-[140px] truncate text-right font-semibold text-zinc-200 sm:max-w-[180px]">{faceitUrl || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Scrim Rank</span>
                <span className="font-semibold text-zinc-200">{rank ? rank.toUpperCase() : "Unranked"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Rank</span>
                <span className="font-semibold text-zinc-200">{playerRank || "Unranked"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Regions</span>
                <span className="max-w-[140px] truncate text-right font-semibold text-zinc-200 sm:max-w-[180px]">
                  {region.length > 0 ? region.join(", ") : "None"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Top Heroes</span>
                <span className="max-w-[140px] truncate text-right font-semibold text-zinc-200 sm:max-w-[180px]">
                  {topPicks.length > 0 ? topPicks.join(", ") : "None"}
                </span>
              </div>
            </div>
          </aside>

          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-6">
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Battle Tag</span>
              <input
                value={battleTag}
                onChange={(event) => setBattleTag(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                maxLength={48}
                placeholder="e.g. Player#1234"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Country</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {country ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200">
                  <CountryFlag countryCode={country} className="h-3.5 w-5 rounded-sm border border-zinc-700 object-cover" title={`${getCountryLabel(country)} flag`} />
                  {getCountryLabel(country)}
                </div>
              ) : null}
            </label>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Discord Integration</p>
              <p className="text-xs text-zinc-400">Connect your Discord to receive DM alerts when you get new website messages.</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/api/account/discord/connect";
                  }}
                  className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20"
                >
                  {hasDiscordLinked ? "Reconnect Discord" : "Connect Discord"}
                </button>
                <span className="text-xs text-zinc-400">
                  Status: <span className="font-semibold text-zinc-200">{hasDiscordLinked ? "Connected" : "Not connected"}</span>
                </span>
              </div>
              {hasDiscordLinked ? (
                <p className="text-xs text-zinc-400">Connected account: <span className="font-semibold text-zinc-200">{discordUsername || "Discord user"}</span></p>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={discordDmNotifications}
                  onChange={(event) => setDiscordDmNotifications(event.target.checked)}
                  className="accent-orange-500"
                />
                Send me Discord DMs when I receive website notifications
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-zinc-400">Bio</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-[110px] w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                maxLength={280}
                placeholder="Tell players about your playstyle, availability, and goals..."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Scrim Rank</span>
                <select
                  value={rank}
                  onChange={(event) => setRank(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                >
                  <option value="">Select scrim rank</option>
                  {RANK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Rank</span>
                <select
                  value={playerRank}
                  onChange={(event) => setPlayerRank(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                >
                  <option value="">Select rank</option>
                  {PLAYER_RANK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Regions</p>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map((option) => {
                  const selected = region.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setRegion((prev) => prev.filter((entry) => entry !== option.value));
                        } else {
                          setRegion((prev) => [...prev, option.value]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Statuses</p>
              <div className="flex flex-wrap gap-2">
                {LEADER_ROLE_OPTIONS.map((option) => {
                  const selected = leaderRoles.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          const next = leaderRoles.filter((entry) => entry !== option.value);
                          setLeaderRoles(next.length > 0 ? next : ["Player"]);
                        } else {
                          setLeaderRoles((prev) => [...prev, option.value]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Main Roles</p>
              <div className="flex flex-wrap gap-2">
                {MAIN_ROLE_OPTIONS.map((option) => {
                  const selected = mainRole.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setMainRole((prev) => prev.filter((role) => role !== option.value));
                        } else {
                          setMainRole((prev) => [...prev, option.value]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-zinc-400">Top Heroes (max 3)</p>

              {topPicks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topPicks.map((hero) => (
                    <span key={hero} className="rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
                      {hero}
                    </span>
                  ))}
                </div>
              ) : null}

              {visibleHeroGroups.length === 0 ? (
                <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-500">
                  Choose at least one main role to unlock matching hero selections.
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleHeroGroups.map((group) => (
                    <div key={group.role}>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-zinc-600">{group.role}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.heroes.map((hero) => {
                          const selected = topPicks.includes(hero);
                          return (
                            <button
                              key={hero}
                              type="button"
                              disabled={!selected && topPicks.length >= 3}
                              onClick={() => {
                                if (selected) {
                                  setTopPicks((prev) => prev.filter((h) => h !== hero));
                                } else if (topPicks.length < 3) {
                                  setTopPicks((prev) => [...prev, hero]);
                                }
                              }}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${selected ? "border-orange-500 bg-orange-500/20 text-orange-300" : topPicks.length >= 3 ? "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-orange-500/40 hover:text-white"}`}
                            >
                              {hero}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">External Links</p>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Twitter / X Link</span>
                <input
                  value={twitterUrl}
                  onChange={(event) => setTwitterUrl(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                  maxLength={256}
                  placeholder="https://x.com/yourname"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Faceit Link</span>
                <input
                  value={faceitUrl}
                  onChange={(event) => setFaceitUrl(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
                  maxLength={256}
                  placeholder="https://www.faceit.com/en/players/yourname"
                />
              </label>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Pro Matches</p>
              <p className="text-xs text-zinc-400">Add notable matches/tournaments like a mini wiki timeline.</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={pendingProMatch}
                  onChange={(event) => setPendingProMatch(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                  maxLength={120}
                  placeholder="e.g. 2025 — OWCS Stage 2 vs Team XYZ https://liquipedia.net/..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = pendingProMatch.trim();
                    if (!trimmed) return;
                    const urlMatch = trimmed.match(/https?:\/\/\S+/i);
                    if (urlMatch && !isAllowedProMatchUrl(urlMatch[0])) {
                      setError("Pro match links must be from Liquipedia only for now.");
                      return;
                    }
                    if (proMatches.length >= 20) return;
                    setProMatches((prev) => [...prev, trimmed]);
                    setPendingProMatch("");
                  }}
                  disabled={!pendingProMatch.trim() || proMatches.length >= 20}
                  className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Match
                </button>
              </div>
              <p className="text-xs text-zinc-500">Allowed links: liquipedia.net</p>

              {proMatches.length > 0 ? (
                <ul className="space-y-2">
                  {proMatches.map((entry, index) => (
                    <li key={`${entry}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                      {(() => {
                        const link = extractEntryLink(entry);
                        if (!link.href) {
                          return <span className="text-sm text-zinc-200">{link.label}</span>;
                        }
                        return (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-orange-300 hover:text-orange-200"
                            title={link.href}
                          >
                            {link.label}
                          </a>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => setProMatches((prev) => prev.filter((_, position) => position !== index))}
                        className="shrink-0 text-xs font-semibold text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">No pro matches added yet.</p>
              )}
            </div>
          </section>

          <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Highlights</p>
              <p className="mt-2 text-sm text-zinc-300">Your profile is now used to auto-fill the post creator. Keep this updated for faster posting.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Activity</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">✅ Profile synced with posting flow</div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">🔥 Hero picks ready for quick posts</div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">🎯 Role setup optimized</div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Profile Strength</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${Math.min(100, 25 + (bio ? 20 : 0) + (battleTag ? 20 : 0) + (hasDiscordLinked ? 15 : 0) + (twitterUrl ? 10 : 0) + (faceitUrl ? 10 : 0) + mainRole.length * 7 + topPicks.length * 8)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">Add more details to improve your profile visibility.</p>
            </div>
          </aside>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-green-400">{success}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-black disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          <div className="text-sm">
            <Link href="/" className="text-zinc-500 hover:text-zinc-300">
              ← Back to listings
            </Link>
          </div>
        </div>
      </form>

      {avatarEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[430px] rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Edit Image</h2>
                <p className="mt-1 text-xs text-zinc-400">Drag to move and use zoom to frame your avatar.</p>
              </div>
              <button
                type="button"
                onClick={closeAvatarEditor}
                className="-mr-1 -mt-1 rounded-md p-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                aria-label="Close avatar editor"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
              <div
                className="relative mx-auto overflow-hidden rounded-lg"
                onWheel={handleAvatarWheel}
                style={{ width: `${AVATAR_EDITOR_FRAME_SIZE}px`, height: `${AVATAR_EDITOR_FRAME_SIZE}px` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-black/35" />
                <div
                  className={`absolute overflow-hidden rounded-full ${draggingAvatar ? "cursor-grabbing" : "cursor-grab"}`}
                  onPointerDown={handleAvatarPointerDown}
                  onPointerMove={handleAvatarPointerMove}
                  onPointerUp={handleAvatarPointerUp}
                  onPointerCancel={handleAvatarPointerUp}
                  style={{
                    left: `${AVATAR_EDITOR_CROP_OFFSET}px`,
                    top: `${AVATAR_EDITOR_CROP_OFFSET}px`,
                    width: `${AVATAR_EDITOR_CROP_SIZE}px`,
                    height: `${AVATAR_EDITOR_CROP_SIZE}px`,
                    touchAction: "none",
                  }}
                >
                  {avatarEditorGeometry ? (
                    <img
                      src={avatarEditorImageSrc}
                      alt="Avatar preview"
                      className="pointer-events-none absolute select-none"
                      draggable={false}
                      style={{
                        left: `${avatarEditorGeometry.drawX}px`,
                        top: `${avatarEditorGeometry.drawY}px`,
                        width: `${avatarEditorGeometry.drawWidth}px`,
                        height: `${avatarEditorGeometry.drawHeight}px`,
                        maxWidth: "none",
                        maxHeight: "none",
                      }}
                    />
                  ) : null}
                </div>
                <div
                  className="pointer-events-none absolute rounded-full shadow-[0_0_0_1200px_rgba(0,0,0,0.35),0_0_0_4px_rgba(255,255,255,0.95)]"
                  style={{
                    left: `${AVATAR_EDITOR_CROP_OFFSET}px`,
                    top: `${AVATAR_EDITOR_CROP_OFFSET}px`,
                    width: `${AVATAR_EDITOR_CROP_SIZE}px`,
                    height: `${AVATAR_EDITOR_CROP_SIZE}px`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2 text-zinc-300">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-200">Zoom</span>
                <span className="text-zinc-400">{avatarZoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={avatarEditorSliderMaxZoom}
                step={0.01}
                value={avatarZoom}
                onChange={(event) => {
                  setAvatarZoom(Number(event.target.value));
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-orange-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetAvatarEditorView}
                className="text-sm font-medium text-zinc-400 hover:text-zinc-200"
              >
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeAvatarEditor}
                  className="rounded-lg border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
                  disabled={uploadingAvatar}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={uploadEditedAvatar}
                  className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-60"
                  disabled={uploadingAvatar || !avatarEditorImageSrc}
                >
                  {uploadingAvatar ? "Applying..." : "Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AccountProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AccountProfilePageContent />
    </Suspense>
  );
}

