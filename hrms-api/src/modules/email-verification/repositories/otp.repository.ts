import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db/runtime";
import { emailVerificationOtps } from "@/db/schema/auth";

export const OTP_EXPIRY_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_OTP_ATTEMPTS = 5;

export async function findLatestOtpForUser(userId: string) {
  const [row] = await db
    .select()
    .from(emailVerificationOtps)
    .where(eq(emailVerificationOtps.userId, userId))
    .orderBy(desc(emailVerificationOtps.createdAt))
    .limit(1);
  return row ?? null;
}

export async function findActiveOtpForUser(userId: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(emailVerificationOtps)
    .where(
      and(
        eq(emailVerificationOtps.userId, userId),
        eq(emailVerificationOtps.isUsed, false),
        gt(emailVerificationOtps.expiresAt, now),
        lt(emailVerificationOtps.attemptCount, MAX_OTP_ATTEMPTS),
      ),
    )
    .orderBy(desc(emailVerificationOtps.createdAt))
    .limit(1);
  return row ?? null;
}

export async function invalidateUnusedOtpsForUser(userId: string) {
  await db
    .update(emailVerificationOtps)
    .set({ isUsed: true })
    .where(
      and(
        eq(emailVerificationOtps.userId, userId),
        eq(emailVerificationOtps.isUsed, false),
      ),
    );
}

export async function insertOtp(params: {
  userId: string;
  targetEmail: string;
  otpHash: string;
  expiresAt: Date;
}) {
  const [row] = await db
    .insert(emailVerificationOtps)
    .values({
      userId: params.userId,
      targetEmail: params.targetEmail.toLowerCase(),
      otpHash: params.otpHash,
      expiresAt: params.expiresAt,
    })
    .returning();
  return row!;
}

export async function incrementOtpAttemptCount(
  id: string,
  currentCount: number,
) {
  await db
    .update(emailVerificationOtps)
    .set({ attemptCount: currentCount + 1 })
    .where(eq(emailVerificationOtps.id, id));
}

export async function markOtpUsed(id: string) {
  await db
    .update(emailVerificationOtps)
    .set({ isUsed: true })
    .where(eq(emailVerificationOtps.id, id));
}
