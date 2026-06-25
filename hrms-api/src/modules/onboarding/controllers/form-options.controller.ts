import type { Request, Response, NextFunction } from "express";
import { BLOOD_GROUP_OPTIONS } from "@/modules/onboarding/constants/blood-groups";

export function getFormOptions(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ bloodGroups: BLOOD_GROUP_OPTIONS });
  } catch (e) {
    next(e);
  }
}
