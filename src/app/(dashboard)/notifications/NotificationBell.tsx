"use client";

import { useState, useTransition } from "react";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

interface NotificationItem {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2">
            <p className="text-sm font-semibold text-neutral-700">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => markAllNotificationsRead())}
                className="text-xs text-neutral-500 underline hover:text-neutral-700 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">
                No notifications yet.
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read) startTransition(() => markNotificationRead(n.id));
                  if (n.link) window.location.href = n.link;
                }}
                className={`block w-full border-b border-neutral-50 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50 ${
                  n.read ? "text-neutral-500" : "font-medium text-neutral-900"
                }`}
              >
                {!n.read && (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-600" />
                )}
                {n.message}
                <span className="mt-0.5 block text-xs font-normal text-neutral-400">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
