import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminPanelClient from "@/components/admin-panel-client";
import { ADMIN_SESSION_COOKIE_NAME, isAdminSessionTokenValid } from "@/lib/admin-auth";
import { readPosts } from "@/lib/posts-store";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!isAdminSessionTokenValid(token)) {
    redirect("/admin/login");
  }

  const posts = await readPosts();

  return <AdminPanelClient initialPosts={posts} />;
}
