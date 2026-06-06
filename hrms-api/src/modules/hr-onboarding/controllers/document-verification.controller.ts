import type { NextFunction, Request, Response } from "express";
import { loadCurrentEmployee } from "@/lib/employee";
import {
  documentIdParamSchema,
  rejectDocumentSchema,
} from "@/modules/hr-onboarding/schemas/document-verify.schema";
import * as docVerification from "@/modules/hr-onboarding/services/document-verification.service";

export async function verifyDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const reviewer = await loadCurrentEmployee(req.user!.id);
    const row = await docVerification.verifyDocument({
      documentId: id,
      reviewerEmployeeId: reviewer.id,
      actorUserId: req.user!.id,
      audit: req.auditContext,
    });
    res.json({ document: row });
  } catch (e) {
    next(e);
  }
}

export async function rejectDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const body = rejectDocumentSchema.parse(req.body);
    const reviewer = await loadCurrentEmployee(req.user!.id);
    const row = await docVerification.rejectDocument({
      documentId: id,
      reason: body.reason,
      reviewerEmployeeId: reviewer.id,
      actorUserId: req.user!.id,
      audit: req.auditContext,
    });
    res.json({ document: row });
  } catch (e) {
    next(e);
  }
}

export async function downloadDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    let hrEmployeeId = 0;
    try {
      const hr = await loadCurrentEmployee(req.user!.id);
      hrEmployeeId = hr.id;
    } catch {
      // admin without employee row
    }
    const isAdmin = req.user?.role === "admin";
    const { stream, mimeType, originalFilename } =
      await docVerification.downloadDocumentAsHr({
        documentId: id,
        hrEmployeeId,
        isAdmin,
      });
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(originalFilename)}"`,
    );
    stream.pipe(res);
  } catch (e) {
    next(e);
  }
}
