import { NextRequest, NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { deletePost, getPostById, isPostOwnedByUsername } from "@/lib/posts-store";

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
    return NextResponse.json({ error: "Please log in before deleting a post." }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const post = await getPostById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (!isPostOwnedByUsername(post, username)) {
    return NextResponse.json({ error: "You can only delete your own post." }, { status: 403 });
  }

  const deleted = await deletePost(id);
  if (!deleted) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}