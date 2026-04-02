import { readFile } from "fs/promises";
import { join, extname } from "path";
import { NextResponse } from "next/server";

const ALLOWED_SCOPES = new Set(["avatars", "teams"]);
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".webp", ".gif", ".jpeg"]);

const contentTypeForExtension = (ext: string) => {
  const normalized = ext.toLowerCase();
  if (normalized === ".png") return "image/png";
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg";
  if (normalized === ".webp") return "image/webp";
  if (normalized === ".gif") return "image/gif";
  return "application/octet-stream";
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ scope: string; filename: string }> },
) {
  const { scope, filename } = await context.params;

  if (!ALLOWED_SCOPES.has(scope)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const extension = extname(filename);
  if (!ALLOWED_EXTENSIONS.has(extension.toLowerCase())) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const primaryPath = join(process.cwd(), "data", "uploads", scope, filename);
  const legacyPath = join(process.cwd(), "public", "uploads", scope, filename);

  let fileBuffer: Buffer | null = null;

  try {
    fileBuffer = await readFile(primaryPath);
  } catch {
    try {
      // Backward compatibility: serve images already stored in public/uploads.
      fileBuffer = await readFile(legacyPath);
    } catch {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": contentTypeForExtension(extension),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
