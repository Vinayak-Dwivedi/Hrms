import type { Request, Response, NextFunction } from "express";
import * as profileService from "@/modules/onboarding/services/employee-profile.service";
import { upsertProfileSchema } from "@/modules/onboarding/schemas/profile.schema";

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await profileService.getProfile(req.employee!.id);
    res.json(profile);
  } catch (e) {
    next(e);
  }
}

export async function putProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const body = upsertProfileSchema.parse(req.body);
    const profile = await profileService.upsertProfile(
      req.employee!.id,
      body,
      req.user?.id,
    );
    res.json(profile);
  } catch (e) {
    next(e);
  }
}
