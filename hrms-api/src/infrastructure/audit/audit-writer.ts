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
  | "ONBOARDING_COMPLETED"
  // Leave lifecycle (M5)
  | "LEAVE_SUBMITTED"
  | "LEAVE_AUTO_APPROVED"
  | "LEAVE_AUTO_REJECTED"
  | "LEAVE_APPROVED_BY_MANAGER"
  | "LEAVE_REJECTED_BY_MANAGER"
  | "LEAVE_FORWARDED_BY_MANAGER"
  | "LEAVE_APPROVED_BY_HR"
  | "LEAVE_REJECTED_BY_HR"
  | "LEAVE_CANCELLED"
  | "ONBOARDING_PROFILE_UPDATED_ON_BEHALF"
  | "ONBOARDING_SUBMITTED_ON_BEHALF"
  // Offboarding / resignation lifecycle (Phase 1)
  | "RESIGNATION_SUBMITTED"
  | "RESIGNATION_WITHDRAWN"
  | "RESIGNATION_APPROVED_BY_MANAGER"
  | "RESIGNATION_REJECTED_BY_MANAGER"
  | "RESIGNATION_APPROVED_BY_HR"
  | "RESIGNATION_REJECTED_BY_HR"
  | "RESIGNATION_ON_HOLD"
  | "RESIGNATION_RESUMED"
  | "RESIGNATION_DISCUSSION_REQUESTED"
  | "RESIGNATION_BUYOUT_DECISION"
  | "OFFBOARDING_CASE_CREATED"
  | "OFFBOARDING_CLEARANCE_UPDATED"
  | "OFFBOARDING_CLEARANCES_COMPLETE"
  | "EXIT_INTERVIEW_SUBMITTED"
  | "OFFBOARDING_FNF_UPDATED"
  | "OFFBOARDING_FNF_APPROVED"
  | "OFFBOARDING_FNF_PAID"
  | "OFFBOARDING_DOCUMENT_GENERATED"
  | "OFFBOARDING_DOCUMENT_SENT"
  | "OFFBOARDING_ACCESS_REVOKED"
  | "OFFBOARDING_CASE_CLOSED";

type AuditEntityType =
  | "employee"
  | "document"
  | "invitation"
  | "auth"
  | "leave_request"
  | "resignation"
  | "offboarding_case";

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

// `auditCtx` accepts `string | null | undefined` for both fields because
// upstream sources differ: the express middleware (`AuditContext`) sets nulls
// when headers are absent, while internal service AuditCtx shapes mark them
// optional. The DB column itself is nullable — null falls through cleanly.
export function writeAuditLogAsync(
  entry: AuditEntry,
  auditCtx?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): void {
  void writeAuditLog({
    ...entry,
    ipAddress: entry.ipAddress ?? auditCtx?.ipAddress ?? null,
    userAgent: entry.userAgent ?? auditCtx?.userAgent ?? null,
  });
}
