"use client";

import { Bell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type AppNotification,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api/notifications.client";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const data = await fetchMyNotifications();
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* best-effort */
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 60000); // poll every minute
    return () => clearInterval(t);
  }, []);

  // close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function onItemClick(n: AppNotification) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationRead(n.id);
    }
  }

  async function onMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    await markAllNotificationsRead();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} className="text-gray-500" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#ec4899] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-h-[420px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[13px] font-semibold text-gray-800">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAll}
                className="text-[11.5px] font-medium text-[#FF014F] hover:text-[#eb0249] inline-flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px] text-gray-400">
                No notifications yet.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-2.5 ${
                    n.isRead ? "" : "bg-[#fff5f8]"
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      n.isRead ? "bg-transparent" : "bg-[#FF014F]"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-800 leading-snug">
                      {n.title}
                    </span>
                    {n.sub && (
                      <span className="block text-[12px] text-gray-500 leading-snug mt-0.5">
                        {n.sub}
                      </span>
                    )}
                    <span className="block text-[11px] text-gray-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
