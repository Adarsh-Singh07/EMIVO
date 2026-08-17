"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, LogIn, ShieldAlert, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { storeApi, type NotificationItem } from "@/lib/store-api";
import { toast } from "sonner";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const data = await storeApi.listNotifications(filterUnread ? { unread_only: true } : {});
      setItems(data.items || []);
      setUnread(data.unread_count || 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load notifications");
    } finally {
      setFetching(false);
    }
  }, [filterUnread]);

  useEffect(() => {
    if (user) load();
    else setFetching(false);
  }, [user, load]);

  const markRead = async (n: NotificationItem) => {
    if (n.read_at) {
      if (n.link) window.location.href = n.link;
      return;
    }
    try {
      await storeApi.markNotificationRead(n.id);
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)));
      if (n.link) window.location.href = n.link;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark as read");
    }
  };

  const markAll = async () => {
    try {
      await storeApi.markAllNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update notifications");
    }
  };

  if (loading || (user && fetching)) {
    return (
      <div className="max-w-[700px] mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 bg-neutral-100 rounded w-1/3 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Authentication Required</h1>
        <p className="text-neutral-500 mb-6">Sign in to see your notifications.</p>
        <Link
          href="/login?next=/notifications"
          className="inline-flex items-center gap-2 h-12 px-8 bg-neutral-950 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
        >
          <LogIn className="w-4 h-4" /> Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
        <Link href="/account" className="hover:text-neutral-900">
          My Account
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Notifications</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">Notifications</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterUnread((v) => !v)}
            className={`h-9 px-4 rounded-full border text-xs font-semibold ${
              filterUnread
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 text-neutral-600"
            }`}
          >
            Unread only {unread > 0 ? `(${unread})` : ""}
          </button>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="h-9 px-4 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 hover:border-neutral-400 inline-flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-neutral-200 rounded-3xl p-16 text-center text-neutral-400">
          <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-sm">
            {filterUnread
              ? "You're all caught up — no unread notifications."
              : "No notifications yet — order updates will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n)}
              className={`w-full text-left border rounded-2xl p-4 sm:p-5 transition-colors ${
                n.read_at
                  ? "border-neutral-100 bg-white opacity-80"
                  : "border-neutral-200 bg-neutral-50/60 hover:border-neutral-400"
              }`}
            >
              <p className="text-sm font-semibold flex items-center gap-2">
                {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                {n.title}
                {n.link && (
                  <span className="ml-auto text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                    view
                  </span>
                )}
              </p>
              {n.body && <p className="text-sm text-neutral-500 mt-1">{n.body}</p>}
              <p className="text-[11px] text-neutral-400 mt-2">
                {new Date(n.created_at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
