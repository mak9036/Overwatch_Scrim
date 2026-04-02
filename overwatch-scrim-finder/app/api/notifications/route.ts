import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { getMessagesForUser } from "@/lib/messages-store";
import { getTeamForUser } from "@/lib/teams-store";

export async function GET(request: NextRequest) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    if (request.nextUrl.searchParams.get("soft") === "1") {
      return NextResponse.json(
        {
          unreadMessageCount: 0,
          pendingInviteCount: 0,
          totalCount: 0,
          notifications: [],
        },
        {
          headers: {
            "Cache-Control": "private, max-age=8, stale-while-revalidate=24",
            Vary: "Cookie",
          },
        },
      );
    }
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const [{ inbox, unreadCount }, team] = await Promise.all([
    getMessagesForUser(username),
    getTeamForUser(username),
  ]);

  const pendingInvite = team?.invites.find((invite) => invite.username.toLowerCase() === username.toLowerCase()) || null;
  const unreadMessages = inbox.filter((message) => !message.readAt).slice(0, 5);

  const notifications = [
    ...(pendingInvite
      ? [{
          id: `team-invite-${team?.id || "unknown"}`,
          type: "team-invite",
          title: `Team invite from ${pendingInvite.invitedBy}`,
          detail: `You have been invited to join ${team?.name || "a team"}.`,
          href: "/team",
          createdAt: pendingInvite.createdAt,
        }]
      : []),
    ...unreadMessages.map((message) => ({
      id: `message-${message.id}`,
      type: "message",
      title: `New message from ${message.senderUsername}`,
      detail: message.body,
      href: "/messages",
      createdAt: message.createdAt,
    })),
  ].sort((leftItem, rightItem) => new Date(rightItem.createdAt).getTime() - new Date(leftItem.createdAt).getTime());

  return NextResponse.json(
    {
      unreadMessageCount: unreadCount,
      pendingInviteCount: pendingInvite ? 1 : 0,
      totalCount: unreadCount + (pendingInvite ? 1 : 0),
      notifications,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=8, stale-while-revalidate=24",
        Vary: "Cookie",
      },
    },
  );
}
