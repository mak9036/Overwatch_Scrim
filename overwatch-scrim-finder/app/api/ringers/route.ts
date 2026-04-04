import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest, getPosterUsernameFromRequest, isPosterRequest } from "@/lib/account-auth";
import { createRingerPost, readRingers } from "@/lib/ringers-store";
import { resolveTimeZoneFromCountryCode } from "@/lib/timezones";

interface IncomingRingerPayload {
  availableFrom?: unknown;
  availableUntil?: unknown;
  preferredTimeZone?: unknown;
}

const normalizeMainRoles = (roles: string[]) => {
  const mapRole = (entry: string) => {
    if (entry === "Flex DPS") return "FPDS";
    if (entry === "Hitscan") return "HS";
    if (entry === "Flex Support") return "FS";
    if (entry === "Main Support") return "MS";
    return entry;
  };

  return roles.map((entry) => mapRole(entry.trim())).filter((entry) => entry.length > 0);
};

const isQuarterHourTime = (value: string) => /^([01]\d|2[0-3]):(00|15|30|45)$/.test(value);

export async function GET() {
  const ringers = await readRingers();
  return NextResponse.json(ringers);
}

export async function POST(request: NextRequest) {
  if (!isPosterRequest(request)) {
    return NextResponse.json({ error: "Please log in before posting as a ringer." }, { status: 401 });
  }

  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Please log in before posting as a ringer." }, { status: 401 });
  }

  const account = getPosterAccountFromRequest(request);
  const scrimRank = account?.gameProfile?.rank?.trim() || "";
  const owRank = account?.gameProfile?.eloRange?.trim() || "";
  const mainRole = normalizeMainRoles(Array.isArray(account?.gameProfile?.mainRole) ? account.gameProfile.mainRole : []);

  if (!scrimRank || !owRank || mainRole.length === 0) {
    return NextResponse.json(
      { error: "Please complete your profile (main role, scrim rank, and OW rank) before posting as a ringer." },
      { status: 400 },
    );
  }

  let payload: IncomingRingerPayload;
  try {
    payload = (await request.json()) as IncomingRingerPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const availableFrom = typeof payload.availableFrom === "string" ? payload.availableFrom.trim() : "";
  const availableUntil = typeof payload.availableUntil === "string" ? payload.availableUntil.trim() : "";
  if (!isQuarterHourTime(availableFrom) || !isQuarterHourTime(availableUntil)) {
    return NextResponse.json({ error: "Please pick a valid availability time window." }, { status: 400 });
  }
  if (availableFrom === availableUntil) {
    return NextResponse.json({ error: "Availability start and end times must be different." }, { status: 400 });
  }

  const accountCountry = typeof account?.accountProfile?.country === "string" ? account.accountProfile.country : "";
  const payloadTimeZone = typeof payload.preferredTimeZone === "string" ? payload.preferredTimeZone.trim().slice(0, 64) : "";
  const preferredTimeZone = payloadTimeZone || resolveTimeZoneFromCountryCode(accountCountry) || "UTC";

  const ringers = await readRingers();
  const hasExisting = ringers.some((ringer) => ringer.ownerUsername.trim().toLowerCase() === username.toLowerCase());
  if (hasExisting) {
    return NextResponse.json({ error: "You already have an active ringer post." }, { status: 409 });
  }

  const created = await createRingerPost({
    ownerUsername: username,
    mainRole,
    scrimRank,
    owRank,
    preferredTime: `${availableFrom} - ${availableUntil}`,
    availableFrom,
    availableUntil,
    preferredTimeZone,
  });

  return NextResponse.json(created, { status: 201 });
}