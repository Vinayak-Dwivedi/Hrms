import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { notifications } from "@/db/schema/hrms";

export type NotifKind = "leave" | "team" | "hr" | "holiday" | "event";

// Fire-and-forget: write an in-app notification for an employee. Never throws
// (failures are logged) so it can't break the request that triggered it.
export function notify(
  recipientEmployeeId: number,
  kind: NotifKind,
  title: string,
  sub?: string | null,
): void {
  void db
    .insert(notifications)
    .values({ recipientId: recipientEmployeeId, kind, title, sub: sub ?? null })
    .catch((e) => {
      console.error("[notify] failed:", (e as Error)?.message ?? e);
    });
}

export async function listMyNotifications(employeeId: number, limit = 30) {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, employeeId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const unread = rows.filter((r) => !r.isRead).length;
  return { items: rows, unread };
}

export async function markNotificationRead(employeeId: number, id: bigint) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, employeeId)));
}

export async function markAllNotificationsRead(employeeId: number) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.recipientId, employeeId));
}
