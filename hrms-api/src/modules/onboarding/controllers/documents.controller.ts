import type { Request, Response, NextFunction } from "express";
import * as documentService from "@/modules/onboarding/services/document.service";
import {
  documentIdParamSchema,
  documentTypeSchema,
} from "@/modules/onboarding/schemas/document.schema";
import { ApiError } from "@/middleware/error";

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
    const isAdmin = req.user?.role === "admin";
    const { stream, mimeType, originalFilename } =
      await documentService.getDocumentStream({
        employeeId: req.employee!.id,
        documentId: id,
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

export async function deleteDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const isAdmin = req.user?.role === "admin";
    const result = await documentService.deleteDocument({
      employeeId: req.employee!.id,
      documentId: id,
      isAdmin,
      onboardingCompleted: req.employee!.onboardingStatus === "COMPLETED",
      actorUserId: req.user?.id,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
