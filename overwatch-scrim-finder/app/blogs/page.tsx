"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  createdAt: number;
  category: string;
  published: boolean;
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/blogs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load blogs");
        }
        const data = await response.json();
        setBlogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blogs");
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-white">Management Blogs</h1>
          <p className="text-zinc-400">Tips, strategies, and insights on becoming and being a great manager</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <div className="h-8 w-8 border-4 border-zinc-600 border-t-orange-500 rounded-full"></div>
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-12 text-center">
            <p className="text-zinc-400">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="group rounded-lg border border-zinc-700 bg-zinc-800/40 p-6 transition hover:border-orange-500/50 hover:bg-zinc-800/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-block rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
                        {blog.category}
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(blog.createdAt)}</span>
                    </div>
                    <Link href={`/blogs/${blog.slug}`}>
                      <h2 className="mb-2 text-xl font-bold text-white transition group-hover:text-orange-400">
                        {blog.title}
                      </h2>
                    </Link>
                    <p className="mb-4 text-sm text-zinc-300 line-clamp-2">{blog.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">By {blog.author}</span>
                      <Link
                        href={`/blogs/${blog.slug}`}
                        className="inline-block text-xs font-semibold text-orange-400 transition hover:text-orange-300"
                      >
                        Read More →
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
