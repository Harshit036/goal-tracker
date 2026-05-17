"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, CheckCheck, Clock } from "lucide-react";

interface Notif {
  id: string;
  title: string;
  body: string;
  level: number | null;
  isRead: boolean;
  createdAt: string;
}

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-blue-500",
  2: "bg-amber-500",
  3: "bg-red-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications");
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((n) => n.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--fg-muted)] transition-all hover:bg-[var(--surface)] hover:text-[var(--fg)]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--fg)]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400">
                <CheckCheck className="h-3.5 w-3.5" />Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-[var(--fg-muted)]">
                <Bell className="h-8 w-8 opacity-20" />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--bg)] ${!n.isRead ? "bg-amber-50/60 dark:bg-amber-500/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Level dot */}
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.level ? LEVEL_COLORS[n.level] : "bg-[var(--fg-muted)]"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold ${n.isRead ? "text-[var(--fg-2)]" : "text-[var(--fg)]"}`}>{n.title}</p>
                        <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-[var(--fg-muted)]">
                          <Clock className="h-2.5 w-2.5" />{timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--fg-muted)] line-clamp-2">{n.body}</p>
                      {n.level && (
                        <span className={`mt-1 inline-block rounded px-1 py-0.5 text-[9px] font-bold text-white ${LEVEL_COLORS[n.level]}`}>
                          LEVEL {n.level}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
