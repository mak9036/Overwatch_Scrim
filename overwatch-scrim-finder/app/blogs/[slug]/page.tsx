"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
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

const formatReadingTime = (content: string) => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
};

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function BlogDetailPage({ params: paramsPromise }: PageProps) {
  const params = use(paramsPromise);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setLoading(true);
        
        // First, try to get all blogs and find by slug
        const response = await fetch("/api/blogs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load blog");
        }
        const blogs = await response.json();
        const foundBlog = blogs.find((b: BlogPost) => b.slug === params.slug);

        if (foundBlog) {
          setBlog(foundBlog);
        } else {
          setError("Blog post not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blog");
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [params.slug]);

  if (loading) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-12 flex items-center justify-center">
          <div className="animate-spin">
            <div className="h-8 w-8 border-4 border-zinc-600 border-t-orange-500 rounded-full"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !blog) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Link href="/blogs" className="mb-6 inline-block text-orange-400 hover:text-orange-300">
            ← Back to Blogs
          </Link>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
            {error || "Blog post not found"}
          </div>
        </div>
      </main>
    );
  }

  const readingTime = formatReadingTime(blog.content);

  return (
    <main className="flex-1">
      <article className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/blogs" className="mb-6 inline-block text-orange-400 transition hover:text-orange-300">
          ← Back to Blogs
        </Link>

        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
              {blog.category}
            </span>
            <span className="text-xs text-zinc-500">{formatDate(blog.createdAt)}</span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-500">{readingTime} min read</span>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">{blog.title}</h1>
          <p className="text-sm text-zinc-400">By {blog.author}</p>
        </div>

        <div className="prose prose-invert max-w-none mb-12">
          <div className="text-zinc-100 leading-relaxed space-y-4">
            {blog.content.split("\n\n").map((paragraph, index) => {
              if (paragraph.startsWith("##")) {
                return (
                  <h2 key={index} className="mt-6 mb-3 text-2xl font-bold text-white">
                    {paragraph.replace("## ", "")}
                  </h2>
                );
              }
              if (paragraph.startsWith("#")) {
                return (
                  <h3 key={index} className="mt-5 mb-3 text-xl font-bold text-white">
                    {paragraph.replace("# ", "")}
                  </h3>
                );
              }
              return (
                <p key={index} className="text-zinc-300">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>

        <div className="border-t border-zinc-700 pt-8">
          <div className="mb-6 rounded-lg bg-zinc-800/40 p-4 text-sm text-zinc-400">
            <p className="mb-2 font-semibold text-zinc-300">About the author</p>
            <p>{blog.author} • {formatDate(blog.createdAt)}</p>
          </div>
          <Link
            href="/blogs"
            className="inline-block rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:border-orange-500/60 hover:bg-orange-500/20"
          >
            ← Back to All Posts
          </Link>
        </div>
      </article>
    </main>
  );
}
