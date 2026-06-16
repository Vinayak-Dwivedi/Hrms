import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { users } from "@/db/schema/auth";
import { employees, roles } from "@/db/schema/hrms";
import { authRoleToRbacCode } from "@/lib/auth-role";
import {
  getEmployeeColumnSupport,
  inferOnboardingStatus,
} from "@/lib/employee-schema-compat";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import * as profileService from "@/modules/onboarding/services/employee-profile.service";
import { HR_REQUIRED_VERIFIED_DOCUMENTS } from "@/modules/hr-onboarding/constants";
import * as employeeAdminRepo from "@/modules/hr-onboarding/repositories/employee-admin.repository";
import * as tokenHistoryRepo from "@/modules/hr-onboarding/repositories/token-history.repository";
import * as bankOnboarding from "@/modules/hr-onboarding/services/bank-onboarding.service";
import * as documentVerification from "@/modules/hr-onboarding/services/document-verification.service";
import { ensureInvitationStatusFresh } from "@/modules/hr-onboarding/services/onboarding-status.service";
import { ApiError } from "@/middleware/error";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };

export async function listEmployees(params: {
  search?: string;
  departmentId?: number;
  employeeStatus?: string;
  onboardingStatus?: string;
  limit: number;
  offset: number;
  sort?: "id" | "createdAt" | "joiningDate" | "lastName";
}) {
  return employeeAdminRepo.listEmployeesAdmin(params);
}

export async function getEmployeeAdminById(employeeId: number) {
  return employeeAdminRepo.getEmployeeAdminById(employeeId);
}

async function resolveSystemAccessRole(userId: string | null | undefined): Promise<{
  roleId: number | null;
  roleName: string | null;
}> {
  if (!userId) {
    return { roleId: null, roleName: null };
  }
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    return { roleId: null, roleName: null };
  }
  const rbacCode = authRoleToRbacCode(user.role);
  const [role] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.code, rbacCode))
    .limit(1);
  if (!role) {
    return { roleId: null, roleName: null };
  }
  return { roleId: role.id, roleName: role.name };
}

export async function getEmployeeDetail(employeeId: number) {
  const emp = await ensureInvitationStatusFresh(employeeId);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  const [row, profile] = await Promise.all([
    employeeAdminRepo.getEmployeeAdminById(employeeId),
    profileService.getProfile(employeeId),
  ]);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  const userId =
    typeof (row as { userId?: string | null }).userId === "string"
      ? (row as { userId: string }).userId
      : null;
  const systemRole = await resolveSystemAccessRole(userId);
  return { ...row, ...systemRole, profile };
}

export async function getOnboardingTimeline(employeeId: number) {
  const emp = await ensureInvitationStatusFresh(employeeId);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  const support = await getEmployeeColumnSupport();
  const timelineSelect: Record<string, unknown> = {
    id: employees.id,
    empId: employees.empId,
    onboardingCompletedAt: employees.onboardingCompletedAt,
    onboardingTokenExpiry: employees.onboardingTokenExpiry,
    onboardingTokenUsed: employees.onboardingTokenUsed,
    onboardingToken: employees.onboardingToken,
  };
  if (support.onboardingStatus) {
    timelineSelect.onboardingStatus = employees.onboardingStatus;
  }
  if (support.onboardingSubmittedAt) {
    timelineSelect.onboardingSubmittedAt = employees.onboardingSubmittedAt;
  }
  if (support.onboardingReview) {
    timelineSelect.onboardingReviewedAt = employees.onboardingReviewedAt;
    timelineSelect.onboardingReviewedBy = employees.onboardingReviewedBy;
    timelineSelect.onboardingReviewNotes = employees.onboardingReviewNotes;
  }

  const [full, tokens, documents, bankState] = await Promise.all([
    db
      .select(timelineSelect as {
        id: typeof employees.id;
        empId: typeof employees.empId;
        onboardingCompletedAt: typeof employees.onboardingCompletedAt;
        onboardingTokenExpiry: typeof employees.onboardingTokenExpiry;
        onboardingTokenUsed: typeof employees.onboardingTokenUsed;
        onboardingToken: typeof employees.onboardingToken;
        onboardingStatus?: typeof employees.onboardingStatus;
        onboardingSubmittedAt?: typeof employees.onboardingSubmittedAt;
        onboardingReviewedAt?: typeof employees.onboardingReviewedAt;
        onboardingReviewedBy?: typeof employees.onboardingReviewedBy;
        onboardingReviewNotes?: typeof employees.onboardingReviewNotes;
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .then((rows) => rows[0]),
    tokenHistoryRepo.listTokenHistory(employeeId).catch(() => []),
    documentVerification.listEmployeeDocuments(employeeId).catch(() => []),
    bankOnboarding.getBankOnboardingState(employeeId).catch(() => null),
  ]);
  const submittedAt =
    full && "onboardingSubmittedAt" in full && full.onboardingSubmittedAt
      ? full.onboardingSubmittedAt instanceof Date
        ? full.onboardingSubmittedAt.toISOString()
        : String(full.onboardingSubmittedAt)
      : null;
  const reviewedAt =
    full && "onboardingReviewedAt" in full && full.onboardingReviewedAt
      ? full.onboardingReviewedAt instanceof Date
        ? full.onboardingReviewedAt.toISOString()
        : String(full.onboardingReviewedAt)
      : null;
  return {
    employee: full,
    onboardingStatus: full ? inferOnboardingStatus(full) : emp.onboardingStatus,
    submittedAt,
    reviewedAt,
    completedAt: emp.onboardingCompletedAt?.toISOString() ?? null,
    tokenHistory: tokens,
    documents,
    bankApprovedAt: bankState?.bankApprovedAt ?? null,
    bankApprovedBy: bankState?.bankApprovedBy ?? null,
    bankValid: bankState?.bankValid ?? false,
    bank: bankState?.bank ?? [],
  };
}

export async function listPendingReview() {
  const rows = await db
    .select({
      id: employees.id,
      empId: employees.empId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      workEmail: employees.workEmail,
      onboardingStatus: employees.onboardingStatus,
      onboardingSubmittedAt: employees.onboardingSubmittedAt,
    })
    .from(employees)
    .where(
      and(
        isNotNull(employees.onboardingSubmittedAt),
        eq(employees.onboardingStatus, "IN_PROGRESS"),
      ),
    );
  return rows;
}

export async function approveOnboarding(params: {
  employeeId: number;
  reviewerEmployeeId: number;
  actorUserId: string;
  notes?: string;
  audit?: AuditCtx;
}) {
  const emp = await ensureInvitationStatusFresh(params.employeeId);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  if (!emp.onboardingSubmittedAt) {
    throw new ApiError(400, "NOT_SUBMITTED", "Employee has not submitted onboarding.");
  }
  if (emp.onboardingStatus === "COMPLETED") {
    throw new ApiError(400, "ALREADY_COMPLETED", "Onboarding already completed.");
  }

  const support = await getEmployeeColumnSupport();
  const docs = await documentVerification.listEmployeeDocuments(params.employeeId);
  const missingVerified = HR_REQUIRED_VERIFIED_DOCUMENTS.filter((type) => {
    const row = docs.find((d) => d.documentType === type);
    return !row || row.status !== "Verified";
  });
  if (missingVerified.length > 0) {
    throw new ApiError(
      400,
      "DOCUMENTS_NOT_VERIFIED",
      `Required verified documents missing: ${missingVerified.join(", ")}.`,
    );
  }

  if (support.onboardingBankApproval) {
    const [bankApproval] = await db
      .select({
        onboardingBankApprovedAt: employees.onboardingBankApprovedAt,
      })
      .from(employees)
      .where(eq(employees.id, params.employeeId))
      .limit(1);
    if (!bankApproval?.onboardingBankApprovedAt) {
      throw new ApiError(
        400,
        "BANK_NOT_APPROVED",
        "Bank account details must be added and approved before completing onboarding.",
      );
    }
  }

  const now = new Date();
  const completePatch: Record<string, unknown> = {
    updatedAt: now,
  };
  if (support.onboardingStatus) {
    completePatch.onboardingStatus = "COMPLETED";
  }
  if (support.onboardingCompletedAt) {
    completePatch.onboardingCompletedAt = now;
  }
  if (support.onboardingReview) {
    completePatch.onboardingReviewedBy = params.reviewerEmployeeId;
    completePatch.onboardingReviewedAt = now;
    completePatch.onboardingReviewNotes = params.notes?.trim() || null;
  }

  const returning: Record<string, unknown> = {};
  if (support.onboardingStatus) {
    returning.onboardingStatus = employees.onboardingStatus;
  }
  if (support.onboardingCompletedAt) {
    returning.onboardingCompletedAt = employees.onboardingCompletedAt;
  }

  const [updated] = await db
    .update(employees)
    .set(completePatch as Partial<typeof employees.$inferInsert>)
    .where(eq(employees.id, params.employeeId))
    .returning(returning as Record<string, typeof employees.id>);

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      actorEmployeeId: params.reviewerEmployeeId,
      action: "ONBOARDING_COMPLETED",
      entityType: "employee",
      entityId: String(params.employeeId),
      metadata: { notes: params.notes ?? null },
    },
    params.audit,
  );

  return {
    onboardingStatus: updated?.onboardingStatus ?? "COMPLETED",
    completedAt: updated?.onboardingCompletedAt?.toISOString() ?? now.toISOString(),
  };
}
