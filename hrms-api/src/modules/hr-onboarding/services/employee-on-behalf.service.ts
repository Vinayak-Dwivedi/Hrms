import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";
import * as profileService from "@/modules/onboarding/services/employee-profile.service";
import * as submitService from "@/modules/onboarding/services/onboarding-submit.service";
import { ensureInvitationStatusFresh } from "@/modules/hr-onboarding/services/onboarding-status.service";
import { ApiError } from "@/middleware/error";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };

export type OnBehalfEditScope = "profile" | "documents" | "submit";

export async function ensureEditableOnBehalf(
  employeeId: number,
  scope: OnBehalfEditScope = "profile",
) {
  const emp = await ensureInvitationStatusFresh(employeeId);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  if (emp.onboardingStatus === "COMPLETED" || emp.onboardingCompletedAt) {
    throw new ApiError(
      400,
      "ALREADY_COMPLETED",
      "Onboarding is already completed for this employee.",
    );
  }

  const submitted = emp.onboardingSubmittedAt != null;

  if (scope === "submit" && submitted) {
    throw new ApiError(
      400,
      "ALREADY_SUBMITTED",
      "Onboarding has already been submitted for HR review.",
    );
  }

  if ((scope === "profile" || scope === "documents") && submitted) {
    throw new ApiError(
      400,
      "SUBMITTED_LOCKED",
      "Onboarding is locked while awaiting HR review. If documents were rejected, update them and submit again.",
    );
  }

  return emp;
}

export async function getProfileOnBehalf(employeeId: number) {
  const emp = await ensureInvitationStatusFresh(employeeId);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  return profileService.getProfile(employeeId);
}

export async function updateProfileOnBehalf(params: {
  employeeId: number;
  input: UpsertProfileInput;
  actorUserId: string;
  audit?: AuditCtx;
}) {
  await ensureEditableOnBehalf(params.employeeId, "profile");
  const profile = await profileService.upsertProfile(
    params.employeeId,
    params.input,
    params.actorUserId,
  );

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      action: "ONBOARDING_PROFILE_UPDATED_ON_BEHALF",
      entityType: "employee",
      entityId: String(params.employeeId),
    },
    params.audit,
  );

  return profile;
}

export async function submitOnboardingOnBehalf(params: {
  employeeId: number;
  actorUserId: string;
  audit?: AuditCtx;
}) {
  await ensureEditableOnBehalf(params.employeeId, "submit");
  const result = await submitService.submitOnboarding(params.employeeId);

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      action: "ONBOARDING_SUBMITTED_ON_BEHALF",
      entityType: "employee",
      entityId: String(params.employeeId),
    },
    params.audit,
  );

  return result;
}

export async function getEmployeeOnboardingCompleted(
  employeeId: number,
): Promise<boolean> {
  const [row] = await db
    .select({
      onboardingStatus: employees.onboardingStatus,
      onboardingCompletedAt: employees.onboardingCompletedAt,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  return (
    row?.onboardingStatus === "COMPLETED" || row?.onboardingCompletedAt != null
  );
}
