"use client";

/**
 * Header notification bell. Polls GET /notifications every 60s while the
 * user is signed in, shows a dropdown of recent items, marks items read on
 * click and links to the full /notifications page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type NotificationItem } from "@/lib/store-api";

const POLL_INTERVAL_MS = 60_000;

export default function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    if (!user) {
      setUnread(0);
      setItems([]);
      return;
    }
    try {
      const data = await storeApi.listNotifications({ limit: 8 });
      setItems(data.items || []);
      setUnread(data.unread_count || 0);
    } catch {
      // Non-fatal — badge simply stays stale until the next poll.
    }
  }, [user]);

  useEffect(() => {
    poll();
    if (!user) return;
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll, user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openDropdown = async () => {
    const next = !open;
    setOpen(next);
    if (next) poll();
  };

  const handleItemClick = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.read_at) {
      try {
        await storeApi.markNotificationRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
        setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)));
      } catch {
        // Navigation still proceeds; the item stays unread server-side.
      }
    }
    if (n.link) router.push(n.link);
  };

  if (!user) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={openDropdown}
        className="relative p-2 hover:bg-neutral-100 rounded-full"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] grid place-items-center font-semibold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              onClick={async () => {
                try {
                  await storeApi.markAllNotificationsRead();
                  setUnread(0);
                  setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
                } catch {
                  /* non-fatal */
                }
              }}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-sm text-neutral-400 text-center">
                No notifications yet — order updates will appear here.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50 ${
                    n.read_at ? "opacity-70" : "bg-neutral-50/60"
                  }`}
                >
                  <p className="text-sm font-medium flex items-center gap-2">
                    {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                    {n.title}
                  </p>
                  {n.body && <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-neutral-400 mt-1">
                    {new Date(n.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-center bg-neutral-50 hover:bg-neutral-100"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
