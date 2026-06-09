import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import {
  getEmployeeColumnSupport,
  inferOnboardingStatus,
} from "@/lib/employee-schema-compat";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import * as profileService from "@/modules/onboarding/services/employee-profile.service";
import { HR_REQUIRED_VERIFIED_DOCUMENTS } from "@/modules/hr-onboarding/constants";
import * as employeeAdminRepo from "@/modules/hr-onboarding/repositories/employee-admin.repository";
import * as tokenHistoryRepo from "@/modules/hr-onboarding/repositories/token-history.repository";
import * as documentVerification from "@/modules/hr-onboarding/services/document-verification.service";
import { ensureInvitationStatusFresh } from "@/modules/hr-onboarding/services/onboarding-status.service";
import { ApiError } from "@/middleware/error";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };

export async function listEmployees(params: {
  search?: string;
  departmentId?: number;
  onboardingStatus?: string;
  limit: number;
  offset: number;
  sort?: "createdAt" | "joiningDate" | "lastName";
}) {
  return employeeAdminRepo.listEmployeesAdmin(params);
}

export async function getEmployeeAdminById(employeeId: number) {
  return employeeAdminRepo.getEmployeeAdminById(employeeId);
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
  return { ...row, profile };
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
  if (support.onboardingStatus) {
    timelineSelect.onboardingReviewedAt = employees.onboardingReviewedAt;
    timelineSelect.onboardingReviewedBy = employees.onboardingReviewedBy;
    timelineSelect.onboardingReviewNotes = employees.onboardingReviewNotes;
  }

  const [full, tokens, documents] = await Promise.all([
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

  const now = new Date();
  const [updated] = await db
    .update(employees)
    .set({
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: now,
      onboardingReviewedBy: params.reviewerEmployeeId,
      onboardingReviewedAt: now,
      onboardingReviewNotes: params.notes?.trim() || null,
      updatedAt: now,
    })
    .where(eq(employees.id, params.employeeId))
    .returning({
      onboardingStatus: employees.onboardingStatus,
      onboardingCompletedAt: employees.onboardingCompletedAt,
    });

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
