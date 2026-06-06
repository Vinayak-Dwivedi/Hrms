import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { accounts } from "@/db/schema/auth";
import { employees } from "@/db/schema/hrms";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { sendOnboardingInvitation } from "@/lib/mailer";
import {
  buildOnboardingUrl,
  formatEmployeeDisplayName,
  generateOnboardingToken,
  onboardingTokenExpiryDate,
} from "@/lib/onboarding-token";
import { generatePassword } from "@/lib/generate-password";
import { hashPassword } from "@/lib/password";
import * as tokenHistoryRepo from "@/modules/hr-onboarding/repositories/token-history.repository";
import { ApiError } from "@/middleware/error";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };

async function loadEmployeeForInvite(employeeId: number) {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  if (employee.employeeStatus !== "Active") {
    throw new ApiError(400, "INACTIVE_EMPLOYEE", "Employee is not active.");
  }
  if (!employee.userId || !employee.workEmail) {
    throw new ApiError(400, "MISSING_ACCOUNT", "Employee has no linked account.");
  }
  return employee;
}

export async function issueOnboardingToken(params: {
  employeeId: number;
  plainPassword?: string;
  sendEmail?: boolean;
  issuedBy?: string;
  issueReason: "CREATE" | "RESEND" | "REGENERATE";
  audit?: AuditCtx;
  resetPassword?: boolean;
}) {
  const employee = await loadEmployeeForInvite(params.employeeId);
  const { rawToken, tokenHash } = generateOnboardingToken();
  const expiresAt = onboardingTokenExpiryDate();

  await tokenHistoryRepo.invalidateActiveTokens(params.employeeId);

  let plainPassword = params.plainPassword;
  if (params.resetPassword !== false && !plainPassword) {
    plainPassword = generatePassword();
  }

  await db.transaction(async (tx) => {
    if (plainPassword && employee.userId) {
      const passwordHash = await hashPassword(plainPassword);
      await tx
        .update(accounts)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(accounts.userId, employee.userId!));
      await tx
        .update(employees)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(employees.id, params.employeeId));
    }

    await tx
      .update(employees)
      .set({
        onboardingToken: tokenHash,
        onboardingTokenExpiry: expiresAt,
        onboardingTokenUsed: false,
        onboardingStatus: params.sendEmail === false ? "PENDING" : "INVITATION_SENT",
        updatedAt: new Date(),
      })
      .where(eq(employees.id, params.employeeId));
  });

  await tokenHistoryRepo.insertTokenHistory({
    employeeId: params.employeeId,
    tokenHash,
    expiresAt,
    issuedBy: params.issuedBy ?? null,
    issueReason: params.issueReason,
  });

  if (params.sendEmail !== false && plainPassword) {
    const to = employee.personalEmail || employee.workEmail!;
    await sendOnboardingInvitation({
      to,
      employeeName: formatEmployeeDisplayName(employee),
      workEmail: employee.workEmail!,
      tempPassword: plainPassword,
      onboardingUrl: buildOnboardingUrl(rawToken),
      expiresAt,
    });
  }

  const auditAction =
    params.issueReason === "CREATE"
      ? "INVITATION_SENT"
      : params.issueReason === "RESEND"
        ? "INVITATION_RESENT"
        : "INVITATION_REGENERATED";

  writeAuditLogAsync(
    {
      actorUserId: params.issuedBy,
      action: auditAction,
      entityType: "invitation",
      entityId: String(params.employeeId),
      metadata: { expiresAt: expiresAt.toISOString() },
    },
    params.audit ?? undefined,
  );

  return { expiresAt };
}

export async function invalidateInvitation(params: {
  employeeId: number;
  issuedBy?: string;
  audit?: AuditCtx;
}) {
  await loadEmployeeForInvite(params.employeeId);
  await tokenHistoryRepo.invalidateActiveTokens(params.employeeId);

  await db
    .update(employees)
    .set({
      onboardingToken: null,
      onboardingTokenExpiry: null,
      onboardingTokenUsed: false,
      onboardingStatus: "EXPIRED",
      updatedAt: new Date(),
    })
    .where(eq(employees.id, params.employeeId));

  await tokenHistoryRepo.insertTokenHistory({
    employeeId: params.employeeId,
    tokenHash: "invalidated",
    expiresAt: new Date(),
    issuedBy: params.issuedBy ?? null,
    issueReason: "INVALIDATE",
  });

  writeAuditLogAsync(
    {
      actorUserId: params.issuedBy,
      action: "INVITATION_INVALIDATED",
      entityType: "invitation",
      entityId: String(params.employeeId),
    },
    params.audit ?? undefined,
  );

  return { invalidated: true };
}

export async function resendInvitation(params: {
  employeeId: number;
  issuedBy?: string;
  audit?: AuditCtx;
}) {
  return issueOnboardingToken({
    employeeId: params.employeeId,
    issuedBy: params.issuedBy,
    issueReason: "RESEND",
    sendEmail: true,
    resetPassword: true,
    audit: params.audit,
  });
}

export async function regenerateToken(params: {
  employeeId: number;
  issuedBy?: string;
  resetPassword?: boolean;
  sendEmail?: boolean;
  audit?: AuditCtx;
}) {
  return issueOnboardingToken({
    employeeId: params.employeeId,
    issuedBy: params.issuedBy,
    issueReason: "REGENERATE",
    sendEmail: params.sendEmail ?? false,
    resetPassword: params.resetPassword ?? false,
    audit: params.audit,
  });
}
