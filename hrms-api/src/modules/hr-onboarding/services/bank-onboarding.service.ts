import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import type { UpsertBankDetailsInput } from "@/modules/onboarding/schemas/profile.schema";
import * as bankRepo from "@/modules/onboarding/repositories/bank.repository";
import * as profileService from "@/modules/onboarding/services/employee-profile.service";
import { ensureInvitationStatusFresh } from "@/modules/hr-onboarding/services/onboarding-status.service";
import { ApiError } from "@/middleware/error";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };

function hasValidBankAccounts(
  rows: Awaited<ReturnType<typeof bankRepo.listBankByEmployeeId>>,
) {
  return (
    rows.length >= 1 &&
    (rows.length === 1 || rows.some((b) => b.isPrimary))
  );
}

async function loadOnboardingEmployee(employeeId: number) {
  const support = await getEmployeeColumnSupport();
  const selectShape: Record<string, unknown> = {
    id: employees.id,
    onboardingStatus: employees.onboardingStatus,
    onboardingSubmittedAt: employees.onboardingSubmittedAt,
    onboardingCompletedAt: employees.onboardingCompletedAt,
  };
  if (support.onboardingBankApproval) {
    selectShape.onboardingBankApprovedAt = employees.onboardingBankApprovedAt;
    selectShape.onboardingBankApprovedBy = employees.onboardingBankApprovedBy;
  }

  const [row] = await db
    .select(selectShape as {
      id: typeof employees.id;
      onboardingStatus: typeof employees.onboardingStatus;
      onboardingSubmittedAt: typeof employees.onboardingSubmittedAt;
      onboardingCompletedAt: typeof employees.onboardingCompletedAt;
      onboardingBankApprovedAt?: typeof employees.onboardingBankApprovedAt;
      onboardingBankApprovedBy?: typeof employees.onboardingBankApprovedBy;
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  return {
    ...row,
    onboardingBankApprovedAt: row.onboardingBankApprovedAt ?? null,
    onboardingBankApprovedBy: row.onboardingBankApprovedBy ?? null,
  };
}

export async function getBankOnboardingState(employeeId: number) {
  await ensureInvitationStatusFresh(employeeId);
  const emp = await loadOnboardingEmployee(employeeId);
  const bank = await bankRepo.listBankByEmployeeId(employeeId);
  return {
    bankApprovedAt: emp.onboardingBankApprovedAt?.toISOString() ?? null,
    bankApprovedBy: emp.onboardingBankApprovedBy ?? null,
    bankValid: hasValidBankAccounts(bank),
    bank: bank.map((row) => ({
      id: row.id,
      accountNumber: row.accountNumber,
      accountName: row.accountName,
      bankName: row.bankName,
      branchName: row.branchName,
      ifscCode: row.ifscCode,
      isPrimary: row.isPrimary,
    })),
  };
}

export async function updateBankDuringOnboarding(params: {
  employeeId: number;
  input: UpsertBankDetailsInput;
  actorUserId: string;
  audit?: AuditCtx;
}) {
  await ensureInvitationStatusFresh(params.employeeId);
  const emp = await loadOnboardingEmployee(params.employeeId);
  if (!emp.onboardingSubmittedAt) {
    throw new ApiError(
      400,
      "NOT_SUBMITTED",
      "Employee data must be submitted before bank details can be added.",
    );
  }
  if (emp.onboardingStatus === "COMPLETED" || emp.onboardingCompletedAt) {
    throw new ApiError(
      400,
      "ALREADY_COMPLETED",
      "Onboarding is already completed for this employee.",
    );
  }

  await bankRepo.syncBankDetails(params.employeeId, params.input.bank);
  const support = await getEmployeeColumnSupport();
  if (support.onboardingBankApproval) {
    await db
      .update(employees)
      .set({
        onboardingBankApprovedAt: null,
        onboardingBankApprovedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, params.employeeId));
  }

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      action: "ONBOARDING_BANK_UPDATED",
      entityType: "employee",
      entityId: String(params.employeeId),
    },
    params.audit,
  );

  return getBankOnboardingState(params.employeeId);
}

export async function approveBankDuringOnboarding(params: {
  employeeId: number;
  reviewerEmployeeId: number;
  actorUserId: string;
  audit?: AuditCtx;
}) {
  await ensureInvitationStatusFresh(params.employeeId);
  const emp = await loadOnboardingEmployee(params.employeeId);
  if (!emp.onboardingSubmittedAt) {
    throw new ApiError(
      400,
      "NOT_SUBMITTED",
      "Employee data must be submitted before bank details can be approved.",
    );
  }
  if (emp.onboardingStatus === "COMPLETED" || emp.onboardingCompletedAt) {
    throw new ApiError(
      400,
      "ALREADY_COMPLETED",
      "Onboarding is already completed for this employee.",
    );
  }

  const bankRows = await bankRepo.listBankByEmployeeId(params.employeeId);
  if (!hasValidBankAccounts(bankRows)) {
    throw new ApiError(
      400,
      "BANK_INCOMPLETE",
      "Add at least one bank account and mark one as primary before approval.",
    );
  }

  const support = await getEmployeeColumnSupport();
  if (!support.onboardingBankApproval) {
    throw new ApiError(
      503,
      "SCHEMA_OUTDATED",
      "Bank approval is unavailable until database migrations are applied.",
    );
  }

  const now = new Date();
  await db
    .update(employees)
    .set({
      onboardingBankApprovedAt: now,
      onboardingBankApprovedBy: params.reviewerEmployeeId,
      updatedAt: now,
    })
    .where(eq(employees.id, params.employeeId));

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      actorEmployeeId: params.reviewerEmployeeId,
      action: "ONBOARDING_BANK_APPROVED",
      entityType: "employee",
      entityId: String(params.employeeId),
    },
    params.audit,
  );

  return {
    bankApprovedAt: now.toISOString(),
    bankApprovedBy: params.reviewerEmployeeId,
    profile: await profileService.getProfile(params.employeeId),
  };
}
