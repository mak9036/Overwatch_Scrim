import { NextRequest, NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { deleteMatchPost, getMatchPostById } from "@/lib/match-posts-store";

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Please log in before deleting a match post." }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const post = await getMatchPostById(id);
  if (!post) {
    return NextResponse.json({ error: "Match post not found." }, { status: 404 });
  }

  if (post.managerUsername.trim().toLowerCase() !== username.trim().toLowerCase()) {
    return NextResponse.json({ error: "You can only delete your own match post." }, { status: 403 });
  }

  const deleted = await deleteMatchPost(id);
  if (!deleted) {
    return NextResponse.json({ error: "Match post not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}