"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "message" | "team-invite";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
}

interface NotificationsResponse {
  unreadMessageCount: number;
  pendingInviteCount: number;
  totalCount: number;
  notifications: NotificationItem[];
}

const formatTimeAgo = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Just now";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) {
    return "Just now";
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  return `${Math.floor(diffSeconds / 86400)}d ago`;
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [data, setData] = useState<NotificationsResponse>({
    unreadMessageCount: 0,
    pendingInviteCount: 0,
    totalCount: 0,
    notifications: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await fetch("/api/notifications");
        if (response.status === 401) {
          if (!cancelled) {
            setVisible(false);
          }
          return;
        }

        if (!response.ok) {
          return;
        }

        const nextData = (await response.json()) as NotificationsResponse;
        if (!cancelled) {
          setVisible(true);
          const normalizedData = {
            unreadMessageCount: typeof nextData.unreadMessageCount === "number" ? nextData.unreadMessageCount : 0,
            pendingInviteCount: typeof nextData.pendingInviteCount === "number" ? nextData.pendingInviteCount : 0,
            totalCount: typeof nextData.totalCount === "number" ? nextData.totalCount : 0,
            notifications: Array.isArray(nextData.notifications) ? nextData.notifications : [],
          };

          setData((current) => {
            if (
              current.unreadMessageCount === normalizedData.unreadMessageCount &&
              current.pendingInviteCount === normalizedData.pendingInviteCount &&
              current.totalCount === normalizedData.totalCount &&
              current.notifications.length === normalizedData.notifications.length &&
              current.notifications.every((entry, index) => {
                const nextEntry = normalizedData.notifications[index];
                return (
                  entry.id === nextEntry?.id &&
                  entry.createdAt === nextEntry?.createdAt &&
                  entry.href === nextEntry?.href
                );
              })
            ) {
              return current;
            }

            return normalizedData;
          });
        }
      } catch {
        if (!cancelled) {
          setVisible(false);
        }
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const summaryLabel = useMemo(() => {
    if (data.totalCount === 0) {
      return "No new notifications";
    }
    return `${data.totalCount} new notification${data.totalCount === 1 ? "" : "s"}`;
  }, [data.totalCount]);

  if (!visible) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative rounded-xl border px-3 py-2 text-sm font-semibold transition ${data.totalCount > 0 ? "border-orange-500/60 bg-orange-500/10 text-orange-200 hover:bg-orange-500/15" : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"}`}
      >
        <span className="mr-2 text-base">🔔</span>
        Alerts
        {data.totalCount > 0 ? (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-black text-black">
            {data.totalCount > 9 ? "9+" : data.totalCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[22rem] rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="mt-1 text-xs text-zinc-400">{summaryLabel}</p>
            </div>
            <div className="text-right text-[11px] uppercase tracking-wide text-zinc-500">
              <p>Messages {data.unreadMessageCount}</p>
              <p className="mt-1">Invites {data.pendingInviteCount}</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {data.notifications.length > 0 ? (
              data.notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3 transition hover:border-orange-500/40 hover:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-100">{notification.title}</p>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-zinc-500">{formatTimeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{notification.detail}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-sm text-zinc-500">
                No new invites or messages.
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              Open Inbox
            </Link>
            <Link
              href="/team"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              View Team
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
