import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface StoredBlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  category: string;
  published: boolean;
}

const dataDirectory = path.join(process.cwd(), "data");
const blogsFilePath = path.join(dataDirectory, "blogs.json");

const ensureDataFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readFile(blogsFilePath, "utf8");
  } catch {
    await writeFile(blogsFilePath, "[]", "utf8");
  }
};

const sanitizeBlogPost = (value: unknown): StoredBlogPost | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredBlogPost>;
  if (
    typeof candidate.title !== "string" ||
    typeof candidate.slug !== "string" ||
    typeof candidate.content !== "string" ||
    typeof candidate.author !== "string"
  ) {
    return null;
  }

  return {
    id: typeof candidate.id === "number" ? candidate.id : Date.now(),
    title: candidate.title.trim().slice(0, 200),
    slug: candidate.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 200),
    content: candidate.content.trim(),
    excerpt: typeof candidate.excerpt === "string" ? candidate.excerpt.trim().slice(0, 500) : candidate.content.trim().slice(0, 500),
    author: candidate.author.trim().slice(0, 100),
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
    category: typeof candidate.category === "string" ? candidate.category.trim().slice(0, 50) : "General",
    published: typeof candidate.published === "boolean" ? candidate.published : false,
  };
};

export const readBlogs = async (): Promise<StoredBlogPost[]> => {
  await ensureDataFile();
  const content = await readFile(blogsFilePath, "utf8");

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => sanitizeBlogPost(item))
      .filter((item): item is StoredBlogPost => item !== null);
  } catch {
    return [];
  }
};

export const createBlogPost = async (post: Omit<StoredBlogPost, "id" | "createdAt" | "updatedAt">): Promise<StoredBlogPost | null> => {
  const sanitized = sanitizeBlogPost({
    ...post,
    id: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  if (!sanitized) {
    return null;
  }

  const blogs = await readBlogs();
  blogs.push(sanitized);

  try {
    await writeFile(blogsFilePath, JSON.stringify(blogs, null, 2), "utf8");
    return sanitized;
  } catch {
    return null;
  }
};

export const updateBlogPost = async (id: number, updates: Partial<Omit<StoredBlogPost, "id" | "createdAt">>): Promise<StoredBlogPost | null> => {
  const blogs = await readBlogs();
  const index = blogs.findIndex((blog) => blog.id === id);

  if (index === -1) {
    return null;
  }

  const blog = blogs[index];
  const updated: StoredBlogPost = {
    ...blog,
    ...updates,
    id: blog.id,
    createdAt: blog.createdAt,
    updatedAt: Date.now(),
  };

  const sanitized = sanitizeBlogPost(updated);
  if (!sanitized) {
    return null;
  }

  blogs[index] = sanitized;

  try {
    await writeFile(blogsFilePath, JSON.stringify(blogs, null, 2), "utf8");
    return sanitized;
  } catch {
    return null;
  }
};

export const deleteBlogPost = async (id: number): Promise<boolean> => {
  const blogs = await readBlogs();
  const filtered = blogs.filter((blog) => blog.id !== id);

  if (filtered.length === blogs.length) {
    return false;
  }

  try {
    await writeFile(blogsFilePath, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
};

export const getBlogPostBySlug = async (slug: string): Promise<StoredBlogPost | null> => {
  const blogs = await readBlogs();
  return blogs.find((blog) => blog.slug === slug) || null;
};

export const getBlogPostById = async (id: number): Promise<StoredBlogPost | null> => {
  const blogs = await readBlogs();
  return blogs.find((blog) => blog.id === id) || null;
};
