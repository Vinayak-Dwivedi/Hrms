import { db } from "@/db/runtime";
import { auditLogs } from "@/db/schema/hrms";

type AuditAction =
  | "EMPLOYEE_CREATED"
  | "INVITATION_SENT"
  | "INVITATION_RESENT"
  | "INVITATION_REGENERATED"
  | "INVITATION_INVALIDATED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "PROFILE_UPDATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REJECTED"
  | "ONBOARDING_SUBMITTED"
  | "ONBOARDING_COMPLETED";

type AuditEntityType = "employee" | "document" | "invitation" | "auth";

export type AuditEntry = {
  actorUserId?: string | null;
  actorEmployeeId?: number | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      actorEmployeeId: entry.actorEmployeeId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? {},
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}

export function writeAuditLogAsync(
  entry: AuditEntry,
  auditCtx?: { ipAddress?: string; userAgent?: string },
): void {
  void writeAuditLog({
    ...entry,
    ipAddress: entry.ipAddress ?? auditCtx?.ipAddress,
    userAgent: entry.userAgent ?? auditCtx?.userAgent,
  });
}
