import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { getAccountRecordByUsername } from "@/lib/accounts-store";
import { notifyUserWithDiscordDm } from "@/lib/discord-dm";
import { getMessagesForUser, sendMessage } from "@/lib/messages-store";

interface SendMessagePayload {
  recipientUsername?: unknown;
  body?: unknown;
}

export async function GET(request: NextRequest) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const messages = await getMessagesForUser(username);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const senderUsername = getPosterUsernameFromRequest(request);
  if (!senderUsername) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const payload = (await request.json()) as SendMessagePayload;
  const recipientUsername = typeof payload.recipientUsername === "string" ? payload.recipientUsername.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!recipientUsername) {
    return NextResponse.json({ error: "Recipient username is required." }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  if (recipientUsername.toLowerCase() === senderUsername.toLowerCase()) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }

  const recipientAccount = await getAccountRecordByUsername(recipientUsername);
  if (!recipientAccount) {
    return NextResponse.json({ error: "That user does not exist." }, { status: 404 });
  }

  const message = await sendMessage(senderUsername, recipientAccount.username, body);
  if (!message) {
    return NextResponse.json({ error: "Could not send message." }, { status: 400 });
  }

  try {
    await notifyUserWithDiscordDm({
      username: recipientAccount.username,
      dispatchKey: `${recipientAccount.username.toLowerCase()}|message:${message.id}`,
      content: `📩 New message from ${senderUsername}: ${message.body.slice(0, 300)}`,
    });
  } catch (error) {
    console.error("[messages] Discord DM failed:", error instanceof Error ? error.message : error);
  }

  return NextResponse.json({ message }, { status: 201 });
}
