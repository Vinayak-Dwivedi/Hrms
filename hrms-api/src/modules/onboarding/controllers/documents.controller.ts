import type { Request, Response, NextFunction } from "express";
import * as documentService from "@/modules/onboarding/services/document.service";
import {
  documentIdParamSchema,
  documentTypeSchema,
} from "@/modules/onboarding/schemas/document.schema";
import { ApiError } from "@/middleware/error";
import { userHasAnyPermission } from "@/middleware/require-permission";

const HR_DOCUMENT_ACCESS = [
  "onboarding.verify_documents",
  "onboarding.manage",
  "employees.view",
];

export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      throw new ApiError(400, "NO_FILE", "No file uploaded.");
    }
    const documentType = documentTypeSchema.parse(req.body.documentType);
    const row = await documentService.uploadDocument({
      employeeId: req.employee!.id,
      documentType,
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      declaredMime: req.file.mimetype,
      actorUserId: req.user?.id,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function getDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const crossEmployeeAccess = req.user
      ? await userHasAnyPermission(req.user.role, HR_DOCUMENT_ACCESS)
      : false;
    const { stream, mimeType, originalFilename } =
      await documentService.getDocumentStream({
        employeeId: req.employee!.id,
        documentId: id,
        isAdmin: crossEmployeeAccess,
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

export async function deleteDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const crossEmployeeAccess = req.user
      ? await userHasAnyPermission(req.user.role, HR_DOCUMENT_ACCESS)
      : false;
    const result = await documentService.deleteDocument({
      employeeId: req.employee!.id,
      documentId: id,
      isAdmin: crossEmployeeAccess,
      onboardingCompleted: req.employee!.onboardingStatus === "COMPLETED",
      actorUserId: req.user?.id,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
