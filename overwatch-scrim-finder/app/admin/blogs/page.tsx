"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NotificationCenter from "@/components/notification-center";

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

export default function AdminBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    author: "",
    category: "General",
    published: false,
  });

  const loadBlogs = async (includeUnpublished = true) => {
    try {
      setLoading(true);
      const response = await fetch("/api/blogs", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load blogs");
      }
      const data = await response.json();
      // If includeUnpublished, we need to fetch from a different endpoint or re-fetch with auth
      // For now, we'll just show published blogs
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      author: "",
      category: "General",
      published: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (blog: BlogPost) => {
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt,
      author: blog.author,
      category: blog.category,
      published: blog.published,
    });
    setEditingId(blog.id);
    setShowForm(true);
    setError("");
  };

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content || !formData.author) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setError("");
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/blogs/${editingId}` : "/api/blogs";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save blog");
      }

      setSuccessMessage(editingId ? "Blog post updated successfully!" : "Blog post created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      resetForm();
      await loadBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blog");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) {
      return;
    }

    try {
      setError("");
      const response = await fetch(`/api/blogs/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to delete blog");
      }

      setSuccessMessage("Blog post deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setDeletingId(null);
      await loadBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blog");
    }
  };

  return (
    <main className="flex-1">
      <NotificationCenter />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Blog Management</h1>
          <button
            onClick={handleCreateNew}
            className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700"
          >
            + Create New Post
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            {successMessage}
          </div>
        )}

        {showForm && (
          <div className="mb-8 rounded-lg border border-zinc-700 bg-zinc-800/40 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">{editingId ? "Edit Blog Post" : "Create New Blog Post"}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Blog post title"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="url-friendly-slug"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                >
                  <option>General</option>
                  <option>Leadership</option>
                  <option>Management Tips</option>
                  <option>Communication</option>
                  <option>Team Building</option>
                  <option>Performance Management</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Author *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief summary (optional - will auto-generate if empty)"
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Content * (Use ## for headers)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Blog post content (use ## for headings, ## for subheadings)"
                  rows={10}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-orange-600"
                />
                <label htmlFor="published" className="text-sm font-semibold text-zinc-300">
                  Publish immediately
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700"
                >
                  {editingId ? "Update Post" : "Create Post"}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
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
            <p className="text-zinc-400">No blog posts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blogs.map((blog) => (
              <div key={blog.id} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white">{blog.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span>{blog.category}</span>
                    <span>•</span>
                    <span>{formatDate(blog.createdAt)}</span>
                    <span>•</span>
                    <span className={blog.published ? "text-green-400" : "text-yellow-400"}>
                      {blog.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(blog)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(blog.id)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-400 transition hover:border-red-500/60 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
