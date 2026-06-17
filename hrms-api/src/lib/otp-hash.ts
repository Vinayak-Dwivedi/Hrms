import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export function hashOtp(otp: string): string {
  return createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(otp.trim())
    .digest("hex");
}

export function verifyOtpHash(otp: string, storedHash: string): boolean {
  const computed = hashOtp(otp);
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// TEMP: SES/SMS sending is disabled (AWS not configured), so emails/texts with
// a random OTP can't reach the user. Use a fixed code so the email/phone
// verification flow still works locally — enter 123456 to verify.
// Restore `String(randomInt(100000, 1000000))` once email/SMS delivery is live.
export const DEV_CONSTANT_OTP = "123456";
export function generateOtpCode(): string {
  return DEV_CONSTANT_OTP;
  // return String(randomInt(100000, 1000000));
}
