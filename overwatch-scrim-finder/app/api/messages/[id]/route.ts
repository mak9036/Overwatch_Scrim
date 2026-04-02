import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { markMessageRead } from "@/lib/messages-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const { id } = await context.params;
  const messageId = Number(id);
  if (!Number.isFinite(messageId)) {
    return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
  }

  const message = await markMessageRead(messageId, username);
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  return NextResponse.json({ message });
}
