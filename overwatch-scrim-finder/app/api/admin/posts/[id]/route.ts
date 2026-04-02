import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { deletePost, updatePost } from "@/lib/posts-store";

interface UpdatePayload {
  teamName?: unknown;
  eloRange?: unknown;
  region?: unknown;
  leader?: unknown;
  leaderRole?: unknown;
  mainRole?: unknown;
}

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const body = (await request.json()) as UpdatePayload;
  const updates: {
    teamName?: string;
    eloRange?: string;
    region?: string[];
    leader?: string;
    leaderRole?: string;
    mainRole?: string[];
  } = {};

  if (typeof body.teamName === "string") {
    updates.teamName = body.teamName.trim();
  }
  if (typeof body.eloRange === "string") {
    updates.eloRange = body.eloRange.trim();
  }
  if (typeof body.leader === "string") {
    updates.leader = body.leader.trim();
  }
  if (typeof body.leaderRole === "string") {
    updates.leaderRole = body.leaderRole.trim();
  }
  if (Array.isArray(body.region) && body.region.every((entry) => typeof entry === "string")) {
    updates.region = body.region;
  }
  if (Array.isArray(body.mainRole) && body.mainRole.every((entry) => typeof entry === "string")) {
    updates.mainRole = body.mainRole;
  }

  const updated = await updatePost(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const deleted = await deletePost(id);
  if (!deleted) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
