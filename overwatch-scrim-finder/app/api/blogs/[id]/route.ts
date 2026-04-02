import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBlogPostById, updateBlogPost, deleteBlogPost } from "@/lib/blogs-store";
import { isAdminSessionTokenValid } from "@/lib/admin-auth";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid blog ID" }, { status: 400 });
    }

    const blog = await getBlogPostById(parsedId);

    if (!blog) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    // Check if user is admin for unpublished posts
    if (!blog.published) {
      const sessionToken = request.cookies.get("admin_session")?.value;
      if (!isAdminSessionTokenValid(sessionToken)) {
        return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
      }
    }

    return NextResponse.json(blog);
  } catch {
    return NextResponse.json({ error: "Failed to read blog post" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const sessionToken = request.cookies.get("admin_session")?.value;

  if (!isAdminSessionTokenValid(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid blog ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, slug, content, excerpt, author, category, published } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (author !== undefined) updates.author = author;
    if (category !== undefined) updates.category = category;
    if (published !== undefined) updates.published = published;

    const updated = await updateBlogPost(parsedId, updates);

    if (!updated) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update blog post" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const sessionToken = request.cookies.get("admin_session")?.value;

  if (!isAdminSessionTokenValid(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid blog ID" }, { status: 400 });
    }

    const success = await deleteBlogPost(parsedId);

    if (!success) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500 });
  }
}
