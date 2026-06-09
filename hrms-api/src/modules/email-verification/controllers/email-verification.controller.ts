import type { NextFunction, Request, Response } from "express";
import { verifyEmailOtpSchema } from "@/modules/email-verification/schemas/email-verification.schema";
import * as emailVerificationService from "@/modules/email-verification/services/email-verification.service";

export async function sendEmailVerificationOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await emailVerificationService.sendPersonalEmailOtp(
      req.user!.id,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function resendEmailVerificationOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await emailVerificationService.resendPersonalEmailOtp(
      req.user!.id,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function verifyEmailOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = verifyEmailOtpSchema.parse(req.body);
    const result = await emailVerificationService.verifyPersonalEmailOtp(
      req.user!.id,
      body.otp,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}
