import { mkdir, unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterUsernameFromRequest } from "@/lib/account-auth";
import { getTeamManagedBy, updateTeamAvatar } from "@/lib/teams-store";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

const getExtensionFromMime = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "";
};

const validateMagicBytes = (buffer: Buffer, extension: string): boolean => {
  switch (extension) {
    case "png":
      return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case "jpg":
      return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "gif":
      return buffer.subarray(0, 3).equals(Buffer.from([0x47, 0x49, 0x46]));
    case "webp":
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
        buffer.subarray(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))
      );
    default:
      return false;
  }
};

export async function POST(request: NextRequest) {
  const username = getPosterUsernameFromRequest(request);
  if (!username) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const managedTeam = await getTeamManagedBy(username);
  if (!managedTeam) {
    return NextResponse.json({ error: "Only the team manager can upload a team avatar." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No avatar file provided." }, { status: 400 });
  }

  const extension = getExtensionFromMime(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Image too large (max 3MB)." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!validateMagicBytes(buffer, extension)) {
    return NextResponse.json({ error: "File content does not match the declared image type." }, { status: 400 });
  }

  // Delete previous team avatar to prevent disk exhaustion
  const oldAvatarUrl = managedTeam.avatarUrl ?? "";
  if (oldAvatarUrl.startsWith("/uploads/") && !oldAvatarUrl.includes("..")) {
    try {
      await unlink(join(process.cwd(), "public", oldAvatarUrl));
    } catch {
      // File may not exist — ignore
    }
  }

  const uploadDirectory = join(process.cwd(), "public", "uploads", "teams");
  await mkdir(uploadDirectory, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  const absolutePath = join(uploadDirectory, fileName);
  await writeFile(absolutePath, buffer);

  const avatarUrl = `/uploads/teams/${fileName}`;
  const team = await updateTeamAvatar(managedTeam.id, username, avatarUrl);
  if (!team) {
    return NextResponse.json({ error: "Could not update team avatar." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, avatarUrl, team });
}
