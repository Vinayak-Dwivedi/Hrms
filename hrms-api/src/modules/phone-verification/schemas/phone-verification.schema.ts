import { z } from "zod";

export const verifyPhoneOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit verification code."),
});
