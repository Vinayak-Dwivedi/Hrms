import type { NextFunction, Request, Response } from "express";
import * as auditService from "@/modules/hr-onboarding/services/audit.service";
import * as reportingService from "@/modules/hr-onboarding/services/reporting.service";
import { auditLogQuerySchema } from "@/modules/hr-onboarding/schemas/reporting.schema";

export async function completionStats(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json(await reportingService.getCompletionStats());
  } catch (e) {
    next(e);
  }
}

export async function pendingReport(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({ items: await reportingService.getPendingOnboarding() });
  } catch (e) {
    next(e);
  }
}

export async function expiredInvitations(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({
      items: await reportingService.getExpiredInvitations(),
    });
  } catch (e) {
    next(e);
  }
}

export async function auditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const q = auditLogQuerySchema.parse(req.query);
    const result = await auditService.queryAuditLogs(q);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
