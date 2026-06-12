import type { NextFunction, Request, Response } from "express";
import { loadCurrentEmployee } from "@/lib/employee";
import { upsertBankDetailsSchema } from "@/modules/onboarding/schemas/profile.schema";
import { employeeIdParamSchema } from "@/modules/hr-onboarding/schemas/employee-list.schema";
import * as bankOnboarding from "@/modules/hr-onboarding/services/bank-onboarding.service";

export async function getOnboardingBank(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const state = await bankOnboarding.getBankOnboardingState(id);
    res.json(state);
  } catch (e) {
    next(e);
  }
}

export async function putOnboardingBank(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const body = upsertBankDetailsSchema.parse(req.body);
    const state = await bankOnboarding.updateBankDuringOnboarding({
      employeeId: id,
      input: body,
      actorUserId: req.user!.id,
      audit: req.auditContext,
    });
    res.json(state);
  } catch (e) {
    next(e);
  }
}

export async function approveOnboardingBank(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const reviewer = await loadCurrentEmployee(req.user!.id);
    const result = await bankOnboarding.approveBankDuringOnboarding({
      employeeId: id,
      reviewerEmployeeId: reviewer.id,
      actorUserId: req.user!.id,
      audit: req.auditContext,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
