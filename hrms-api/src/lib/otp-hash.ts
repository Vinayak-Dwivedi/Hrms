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

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}
