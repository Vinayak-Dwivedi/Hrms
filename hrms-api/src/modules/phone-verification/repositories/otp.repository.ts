import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db/runtime";
import { phoneVerificationOtps } from "@/db/schema/auth";

export const OTP_EXPIRY_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_OTP_ATTEMPTS = 5;

export async function findLatestOtpForUser(userId: string) {
  const [row] = await db
    .select()
    .from(phoneVerificationOtps)
    .where(eq(phoneVerificationOtps.userId, userId))
    .orderBy(desc(phoneVerificationOtps.createdAt))
    .limit(1);
  return row ?? null;
}

export async function findActiveOtpForUser(userId: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(phoneVerificationOtps)
    .where(
      and(
        eq(phoneVerificationOtps.userId, userId),
        eq(phoneVerificationOtps.isUsed, false),
        gt(phoneVerificationOtps.expiresAt, now),
        lt(phoneVerificationOtps.attemptCount, MAX_OTP_ATTEMPTS),
      ),
    )
    .orderBy(desc(phoneVerificationOtps.createdAt))
    .limit(1);
  return row ?? null;
}

export async function incrementOtpAttemptCount(
  id: string,
  currentCount: number,
) {
  await db
    .update(phoneVerificationOtps)
    .set({ attemptCount: currentCount + 1 })
    .where(eq(phoneVerificationOtps.id, id));
}

export async function markOtpUsed(id: string) {
  await db
    .update(phoneVerificationOtps)
    .set({ isUsed: true })
    .where(eq(phoneVerificationOtps.id, id));
}
