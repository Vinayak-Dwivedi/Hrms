import type { NextFunction, Request, Response } from "express";
import { loadCurrentEmployee } from "@/lib/employee";
import { approveOnboardingSchema } from "@/modules/hr-onboarding/schemas/document-verify.schema";
import { employeeIdParamSchema } from "@/modules/hr-onboarding/schemas/employee-list.schema";
import * as employeeAdmin from "@/modules/hr-onboarding/services/employee-admin.service";
import * as docVerification from "@/modules/hr-onboarding/services/document-verification.service";

export async function getEmployeeOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const timeline = await employeeAdmin.getOnboardingTimeline(id);
    res.json(timeline);
  } catch (e) {
    next(e);
  }
}

export async function getEmployeeDocuments(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const documents = await docVerification.listEmployeeDocuments(id);
    res.json({ documents });
  } catch (e) {
    next(e);
  }
}

export async function listPendingReview(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const rows = await employeeAdmin.listPendingReview();
    res.json({ employees: rows });
  } catch (e) {
    next(e);
  }
}

export async function approveOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const body = approveOnboardingSchema.parse(req.body ?? {});
    const reviewer = await loadCurrentEmployee(req.user!.id);
    const result = await employeeAdmin.approveOnboarding({
      employeeId: id,
      reviewerEmployeeId: reviewer.id,
      actorUserId: req.user!.id,
      notes: body.notes,
      audit: req.auditContext,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
