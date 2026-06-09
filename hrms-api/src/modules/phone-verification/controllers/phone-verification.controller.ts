import type { NextFunction, Request, Response } from "express";
import { verifyPhoneOtpSchema } from "@/modules/phone-verification/schemas/phone-verification.schema";
import * as phoneVerificationService from "@/modules/phone-verification/services/phone-verification.service";

export async function sendPhoneVerificationOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await phoneVerificationService.sendPersonalPhoneOtp(
      req.user!.id,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function resendPhoneVerificationOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await phoneVerificationService.resendPersonalPhoneOtp(
      req.user!.id,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function verifyPhoneOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = verifyPhoneOtpSchema.parse(req.body);
    const result = await phoneVerificationService.verifyPersonalPhoneOtp(
      req.user!.id,
      body.otp,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}
