import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { phoneVerificationOtps } from "@/db/schema/auth";
import { employees } from "@/db/schema/hrms";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { generateOtpCode, hashOtp, verifyOtpHash } from "@/lib/otp-hash";
import { sendPhoneVerificationOtp } from "@/lib/sms";
import { ApiError } from "@/middleware/error";
import * as otpRepo from "@/modules/phone-verification/repositories/otp.repository";

function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

function otpExpiresAt(): Date {
  return new Date(Date.now() + otpRepo.OTP_EXPIRY_MINUTES * 60 * 1000);
}

function resendCooldownRemainingSeconds(createdAt: Date): number {
  const elapsedMs = Date.now() - createdAt.getTime();
  const cooldownMs = otpRepo.RESEND_COOLDOWN_SECONDS * 1000;
  if (elapsedMs >= cooldownMs) return 0;
  return Math.ceil((cooldownMs - elapsedMs) / 1000);
}

async function ensurePhoneVerificationSchema() {
  const support = await getEmployeeColumnSupport();
  if (!support.phoneVerified || !support.phoneVerificationOtps) {
    throw new ApiError(
      503,
      "SCHEMA_NOT_READY",
      "Phone verification requires a database migration. Run: npm run db:migrate-phone-verification",
    );
  }
}

async function loadEmployeePhoneState(userId: string) {
  await ensurePhoneVerificationSchema();

  const [row] = await db
    .select({
      id: employees.id,
      phone: employees.phone,
      phoneVerified: employees.phoneVerified,
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
  const emp = await loadEmployeePhoneState(userId);

  if (emp.phoneVerified) {
    throw new ApiError(
      409,
      "ALREADY_VERIFIED",
      "Mobile number is already verified.",
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
  const targetPhone = normalizePhone(emp.phone);

  await db.transaction(async (tx) => {
    await tx
      .update(phoneVerificationOtps)
      .set({ isUsed: true })
      .where(
        and(
          eq(phoneVerificationOtps.userId, userId),
          eq(phoneVerificationOtps.isUsed, false),
        ),
      );

    await tx.insert(phoneVerificationOtps).values({
      userId,
      targetPhone,
      otpHash,
      expiresAt,
    });
  });

  try {
    await sendPhoneVerificationOtp({
      to: emp.phone,
      employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
      otp,
      expiresInMinutes: otpRepo.OTP_EXPIRY_MINUTES,
    });
  } catch (e) {
    throw new ApiError(
      503,
      "SMS_SEND_FAILED",
      (e as Error).message ?? "Could not send verification SMS.",
    );
  }

  return {
    sent: true,
    expiresInSeconds: otpRepo.OTP_EXPIRY_MINUTES * 60,
    resendCooldownSeconds: otpRepo.RESEND_COOLDOWN_SECONDS,
  };
}

export async function sendPersonalPhoneOtp(userId: string) {
  return issueOtp(userId, false);
}

export async function resendPersonalPhoneOtp(userId: string) {
  return issueOtp(userId, true);
}

export async function verifyPersonalPhoneOtp(userId: string, otp: string) {
  const emp = await loadEmployeePhoneState(userId);

  if (emp.phoneVerified) {
    throw new ApiError(
      409,
      "ALREADY_VERIFIED",
      "Mobile number is already verified.",
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

  const currentPhone = normalizePhone(emp.phone);
  if (normalizePhone(activeOtp.targetPhone) !== currentPhone) {
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
      .update(phoneVerificationOtps)
      .set({ isUsed: true })
      .where(eq(phoneVerificationOtps.id, activeOtp.id));

    await tx
      .update(employees)
      .set({
        phoneVerified: true,
        phoneVerifiedAt: verifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, emp.id));
  });

  return {
    verified: true,
    phoneVerifiedAt: verifiedAt.toISOString(),
  };
}
