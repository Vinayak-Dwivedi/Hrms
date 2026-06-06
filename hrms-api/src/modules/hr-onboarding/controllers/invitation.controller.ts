import type { NextFunction, Request, Response } from "express";
import { employeeIdParamSchema } from "@/modules/hr-onboarding/schemas/employee-list.schema";
import { regenerateTokenSchema } from "@/modules/hr-onboarding/schemas/invitation.schema";
import * as invitationService from "@/modules/hr-onboarding/services/invitation.service";

export async function regenerateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const body = regenerateTokenSchema.parse(req.body ?? {});
    const result = await invitationService.regenerateToken({
      employeeId: id,
      issuedBy: req.user!.id,
      resetPassword: body.resetPassword,
      sendEmail: body.sendEmail,
      audit: req.auditContext,
    });
    res.json({ message: "Token regenerated", expiresAt: result.expiresAt.toISOString() });
  } catch (e) {
    next(e);
  }
}

export async function invalidateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const result = await invitationService.invalidateInvitation({
      employeeId: id,
      issuedBy: req.user!.id,
      audit: req.auditContext,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
