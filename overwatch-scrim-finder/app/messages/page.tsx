"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NotificationCenter from "@/components/notification-center";

interface Message {
  id: number;
  senderUsername: string;
  recipientUsername: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

interface MessagesResponse {
  inbox: Message[];
  outbox: Message[];
  unreadCount: number;
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
};

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [body, setBody] = useState("");
  const [inbox, setInbox] = useState<Message[]>([]);
  const [outbox, setOutbox] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const defaultRecipient = searchParams.get("to") || "";

  const loadMessages = async () => {
    const [sessionResponse, messagesResponse] = await Promise.all([
      fetch("/api/account/session", { cache: "no-store" }),
      fetch("/api/messages", { cache: "no-store" }),
    ]);

    if (!sessionResponse.ok || !messagesResponse.ok) {
      router.replace(`/account/login?next=${encodeURIComponent("/messages")}`);
      return;
    }

    const sessionData = (await sessionResponse.json()) as { account?: { username?: string } };
    const messagesData = (await messagesResponse.json()) as MessagesResponse;

    setAccountName(typeof sessionData.account?.username === "string" ? sessionData.account.username : "");
    setInbox(Array.isArray(messagesData.inbox) ? messagesData.inbox : []);
    setOutbox(Array.isArray(messagesData.outbox) ? messagesData.outbox : []);
    setUnreadCount(typeof messagesData.unreadCount === "number" ? messagesData.unreadCount : 0);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages().catch(() => {
      router.replace(`/account/login?next=${encodeURIComponent("/messages")}`);
    });
  }, [router]);

  useEffect(() => {
    if (defaultRecipient) {
      setRecipientUsername(defaultRecipient);
    }
  }, [defaultRecipient]);

  const sendCurrentMessage = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!recipientUsername.trim()) {
      setError("Enter a username to message.");
      return;
    }

    if (!body.trim()) {
      setError("Write a message first.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername, body }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not send message.");
        setSending(false);
        return;
      }

      setBody("");
      setSuccess(`Message sent to ${recipientUsername.trim()}.`);
      setTab("sent");
      setSending(false);
      await loadMessages();
    } catch {
      setError("Could not send message.");
      setSending(false);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        return;
      }

      await loadMessages();
    } catch {
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading inbox...
      </div>
    );
  }

  const activeMessages = tab === "inbox" ? inbox : outbox;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_25%),linear-gradient(180deg,#060606_0%,#111114_45%,#09090b_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">Messages</p>
            <h1 className="mt-2 text-5xl font-black tracking-wide">Inbox</h1>
            <p className="mt-2 text-sm text-zinc-400">Send direct messages, track replies, and keep up with invite activity.</p>
          </div>
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <NotificationCenter />
            <Link href="/" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
              ← Back to Feed
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-[linear-gradient(180deg,rgba(249,115,22,0.14),rgba(20,20,24,0.95))] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-300">Compose</p>
              <p className="mt-3 font-heading text-3xl font-black">{accountName}</p>
              <p className="mt-2 text-sm text-zinc-300">Unread messages: <span className="font-semibold text-white">{unreadCount}</span></p>
            </div>

            <form onSubmit={sendCurrentMessage} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Recipient Username</label>
                <input
                  value={recipientUsername}
                  onChange={(event) => setRecipientUsername(event.target.value)}
                  placeholder="Who do you want to message?"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Message</label>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write your message here"
                  rows={6}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60"
                />
              </div>

              {error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
              {success ? <p className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</p> : null}

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </aside>

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
                <button
                  type="button"
                  onClick={() => setTab("inbox")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "inbox" ? "bg-orange-500 text-black" : "text-zinc-300 hover:text-white"}`}
                >
                  Inbox ({inbox.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("sent")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "sent" ? "bg-orange-500 text-black" : "text-zinc-300 hover:text-white"}`}
                >
                  Sent ({outbox.length})
                </button>
              </div>
              <p className="text-sm text-zinc-500">Unread now: {unreadCount}</p>
            </div>

            <div className="mt-5 space-y-3">
              {activeMessages.length > 0 ? (
                activeMessages.map((message) => {
                  const isInbox = tab === "inbox";
                  const unread = isInbox && !message.readAt;

                  return (
                    <article
                      key={message.id}
                      className={`rounded-2xl border px-4 py-4 transition ${unread ? "border-orange-500/40 bg-orange-500/5" : "border-zinc-800 bg-zinc-900/60"}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">
                            {isInbox ? `From ${message.senderUsername}` : `To ${message.recipientUsername}`}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{formatTimestamp(message.createdAt)}</p>
                        </div>
                        {unread ? (
                          <button
                            type="button"
                            onClick={() => markAsRead(message.id)}
                            className="rounded-xl border border-orange-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-200 transition hover:bg-orange-500/10"
                          >
                            Mark Read
                          </button>
                        ) : (
                          <span className="text-xs uppercase tracking-wide text-zinc-500">{isInbox ? "Read" : "Sent"}</span>
                        )}
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{message.body}</p>
                      {isInbox ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRecipientUsername(message.senderUsername);
                            setTab("sent");
                          }}
                          className="mt-4 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-200 transition hover:bg-zinc-800"
                        >
                          Reply
                        </button>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-12 text-center text-zinc-500">
                  {tab === "inbox" ? "No messages yet." : "No sent messages yet."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
          Loading inbox...
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
