import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { emailVerificationOtps } from "@/db/schema/auth";
import { employees } from "@/db/schema/hrms";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { sendPersonalEmailVerificationOtp } from "@/lib/mailer";
import { generateOtpCode, hashOtp, verifyOtpHash } from "@/lib/otp-hash";
import { ApiError } from "@/middleware/error";
import * as otpRepo from "@/modules/email-verification/repositories/otp.repository";

function otpExpiresAt(): Date {
  return new Date(Date.now() + otpRepo.OTP_EXPIRY_MINUTES * 60 * 1000);
}

function resendCooldownRemainingSeconds(createdAt: Date): number {
  const elapsedMs = Date.now() - createdAt.getTime();
  const cooldownMs = otpRepo.RESEND_COOLDOWN_SECONDS * 1000;
  if (elapsedMs >= cooldownMs) return 0;
  return Math.ceil((cooldownMs - elapsedMs) / 1000);
}

async function ensureEmailVerificationSchema() {
  const support = await getEmployeeColumnSupport();
  if (!support.personalEmailVerified || !support.emailVerificationOtps) {
    throw new ApiError(
      503,
      "SCHEMA_NOT_READY",
      "Email verification requires a database migration. Run: npm run db:migrate-personal-email-verification",
    );
  }
}

async function loadEmployeeVerificationState(userId: string) {
  await ensureEmailVerificationSchema();

  const [row] = await db
    .select({
      id: employees.id,
      personalEmail: employees.personalEmail,
      personalEmailVerified: employees.personalEmailVerified,
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  if (!row) {
    throw new ApiError(
      404,
      "NO_EMPLOYEE_FOR_USER",
      "Authenticated user has no linked employee record.",
    );
  }
  return row;
}

async function issueOtp(userId: string, enforceCooldown: boolean) {
  const emp = await loadEmployeeVerificationState(userId);

  if (emp.personalEmailVerified) {
    throw new ApiError(
      409,
      "ALREADY_VERIFIED",
      "Personal email is already verified.",
    );
  }

  if (enforceCooldown) {
    const latest = await otpRepo.findLatestOtpForUser(userId);
    if (latest) {
      const retryAfterSeconds = resendCooldownRemainingSeconds(latest.createdAt);
      if (retryAfterSeconds > 0) {
        throw new ApiError(
          429,
          "RESEND_COOLDOWN",
          `Please wait ${retryAfterSeconds} seconds before requesting a new code.`,
          { retryAfterSeconds },
        );
      }
    }
  }

  const otp = generateOtpCode();
  const otpHash = hashOtp(otp);
  const expiresAt = otpExpiresAt();
  const targetEmail = emp.personalEmail.toLowerCase();

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationOtps)
      .set({ isUsed: true })
      .where(
        and(
          eq(emailVerificationOtps.userId, userId),
          eq(emailVerificationOtps.isUsed, false),
        ),
      );

    await tx.insert(emailVerificationOtps).values({
      userId,
      targetEmail,
      otpHash,
      expiresAt,
    });
  });

  await sendPersonalEmailVerificationOtp({
    to: emp.personalEmail,
    employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
    otp,
    expiresInMinutes: otpRepo.OTP_EXPIRY_MINUTES,
  });

  return {
    sent: true,
    expiresInSeconds: otpRepo.OTP_EXPIRY_MINUTES * 60,
    resendCooldownSeconds: otpRepo.RESEND_COOLDOWN_SECONDS,
  };
}

export async function sendPersonalEmailOtp(userId: string) {
  return issueOtp(userId, false);
}

export async function resendPersonalEmailOtp(userId: string) {
  return issueOtp(userId, true);
}

export async function verifyPersonalEmailOtp(userId: string, otp: string) {
  const emp = await loadEmployeeVerificationState(userId);

  if (emp.personalEmailVerified) {
    throw new ApiError(
      409,
      "ALREADY_VERIFIED",
      "Personal email is already verified.",
    );
  }

  const activeOtp = await otpRepo.findActiveOtpForUser(userId);
  if (!activeOtp) {
    throw new ApiError(
      400,
      "OTP_INVALID_OR_EXPIRED",
      "Verification code is invalid or has expired.",
    );
  }

  if (!verifyOtpHash(otp, activeOtp.otpHash)) {
    await otpRepo.incrementOtpAttemptCount(
      activeOtp.id,
      activeOtp.attemptCount,
    );
    throw new ApiError(
      400,
      "OTP_INVALID_OR_EXPIRED",
      "Verification code is invalid or has expired.",
    );
  }

  const currentEmail = emp.personalEmail.toLowerCase();
  if (activeOtp.targetEmail.toLowerCase() !== currentEmail) {
    await otpRepo.markOtpUsed(activeOtp.id);
    throw new ApiError(
      400,
      "OTP_INVALID_OR_EXPIRED",
      "Verification code is invalid or has expired.",
    );
  }

  const verifiedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationOtps)
      .set({ isUsed: true })
      .where(eq(emailVerificationOtps.id, activeOtp.id));

    await tx
      .update(employees)
      .set({
        personalEmailVerified: true,
        personalEmailVerifiedAt: verifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, emp.id));
  });

  return {
    verified: true,
    personalEmailVerifiedAt: verifiedAt.toISOString(),
  };
}
