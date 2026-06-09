import { Router } from "express";
import * as emailVerificationController from "@/modules/email-verification/controllers/email-verification.controller";
import * as phoneVerificationController from "@/modules/phone-verification/controllers/phone-verification.controller";

export const profileEmailVerificationRouter = Router();

profileEmailVerificationRouter.post(
  "/send-email-verification-otp",
  emailVerificationController.sendEmailVerificationOtp,
);
profileEmailVerificationRouter.post(
  "/resend-email-verification-otp",
  emailVerificationController.resendEmailVerificationOtp,
);
profileEmailVerificationRouter.post(
  "/verify-email-otp",
  emailVerificationController.verifyEmailOtp,
);
profileEmailVerificationRouter.post(
  "/send-phone-verification-otp",
  phoneVerificationController.sendPhoneVerificationOtp,
);
profileEmailVerificationRouter.post(
  "/resend-phone-verification-otp",
  phoneVerificationController.resendPhoneVerificationOtp,
);
profileEmailVerificationRouter.post(
  "/verify-phone-otp",
  phoneVerificationController.verifyPhoneOtp,
);
