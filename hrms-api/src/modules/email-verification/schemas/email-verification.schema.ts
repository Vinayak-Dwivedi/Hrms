import { z } from "zod";

export const verifyEmailOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
