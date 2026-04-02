import { NextResponse } from "next/server";
import { getAllTeams } from "@/lib/teams-store";
import { getAccountRecordByUsername } from "@/lib/accounts-store";

export async function GET() {
  const teams = await getAllTeams();

  const enrichedTeams = await Promise.all(
    teams.map(async (team) => {
      const managerAccount = await getAccountRecordByUsername(team.managerUsername);
      const members = await Promise.all(
        team.members.map(async (member) => {
          const account = await getAccountRecordByUsername(member.username);
          const profileMainRoles = account?.gameProfile?.mainRole;
          return {
            ...member,
            avatarUrl: account?.accountProfile?.avatarUrl ?? "",
            mainRoles:
              Array.isArray(profileMainRoles) && profileMainRoles.length > 0
                ? profileMainRoles
                : (member.mainRoles ?? []),
            region: account?.gameProfile?.region ?? [],
          };
        }),
      );

      const managerMember = members.find((m) => m.role === "manager");
      const region = managerMember?.region ?? [];
      const scrimRank = managerAccount?.gameProfile?.eloRange || managerAccount?.gameProfile?.rank || "—";

      return {
        ...team,
        members,
        region,
        scrimRank,
      };
    }),
  );

  return NextResponse.json(enrichedTeams, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
