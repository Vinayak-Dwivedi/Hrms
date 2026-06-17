import { API_BASE } from "@/lib/hrms-client";

export type AppNotification = {
  id: string;
  kind: "leave" | "team" | "hr" | "holiday" | "event";
  title: string;
  sub: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function fetchMyNotifications(): Promise<{
  unread: number;
  items: AppNotification[];
}> {
  const res = await fetch(`${API_BASE}/api/me/notifications`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/me/notifications/${id}/read`, {
    method: "PATCH",
    credentials: "include",
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE}/api/me/notifications/read-all`, {
    method: "POST",
    credentials: "include",
  });
}
