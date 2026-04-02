import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readBlogs, createBlogPost } from "@/lib/blogs-store";
import { isAdminSessionTokenValid } from "@/lib/admin-auth";

export async function GET() {
  try {
    const blogs = await readBlogs();
    const publishedBlogs = blogs.filter((blog) => blog.published).sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json(publishedBlogs);
  } catch {
    return NextResponse.json({ error: "Failed to read blogs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("admin_session")?.value;

  if (!isAdminSessionTokenValid(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, excerpt, author, category } = body;

    if (!title || !slug || !content || !author) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newBlog = await createBlogPost({
      title,
      slug,
      content,
      excerpt: excerpt || content.slice(0, 200),
      author,
      category: category || "General",
      published: false,
    });

    if (!newBlog) {
      return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 });
    }

    return NextResponse.json(newBlog, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 });
  }
}
