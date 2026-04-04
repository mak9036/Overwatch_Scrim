import { NextResponse } from "next/server";
import { listAccountRecords } from "@/lib/accounts-store";
import { getCurrentTeamForUser } from "@/lib/teams-store";

export async function GET() {
  const accounts = await listAccountRecords();

  const profiles = await Promise.all(
    accounts.map(async (account) => {
      const currentTeam = await getCurrentTeamForUser(account.username);

      return {
        username: account.username,
        createdAt: account.createdAt,
        avatarUrl: account.accountProfile?.avatarUrl || "",
        bio: account.accountProfile?.bio || "",
        battleTag: account.accountProfile?.battleTag || "",
        country: account.accountProfile?.country || "",
        leaderRoles: Array.isArray(account.gameProfile?.leaderRoles)
          ? account.gameProfile.leaderRoles
          : account.gameProfile?.leaderRole
            ? [account.gameProfile.leaderRole]
            : [],
        mainRole: Array.isArray(account.gameProfile?.mainRole) ? account.gameProfile.mainRole : [],
        topPicks: Array.isArray(account.gameProfile?.topPicks) ? account.gameProfile.topPicks : [],
        region: Array.isArray(account.gameProfile?.region) ? account.gameProfile.region : [],
        scrimRank: account.gameProfile?.rank || "",
        owRank: account.gameProfile?.eloRange || "",
        currentTeamName: currentTeam?.name || "",
      };
    }),
  );

  return NextResponse.json(profiles, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}