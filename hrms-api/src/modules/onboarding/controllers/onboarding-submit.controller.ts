import type { Request, Response, NextFunction } from "express";
import * as submitService from "@/modules/onboarding/services/onboarding-submit.service";

export async function submitOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await submitService.submitOnboarding(req.employee!.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
