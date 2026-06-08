import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import {
  deletePrivateFile,
  openPrivateFileStream,
  validateAndSavePrivateFile,
} from "@/infrastructure/storage/private-file-storage";
import type { SupportedDocumentType } from "@/modules/onboarding/constants";
import * as documentRepo from "@/modules/onboarding/repositories/document.repository";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { ApiError } from "@/middleware/error";

export async function uploadDocument(params: {
  employeeId: number;
  documentType: SupportedDocumentType;
  originalName: string;
  buffer: Buffer;
  declaredMime: string;
  actorUserId?: string;
}) {
  const existing = await documentRepo.listDocumentsByEmployeeAndType(
    params.employeeId,
    params.documentType,
  );
  for (const doc of existing) {
    await deletePrivateFile(doc.storagePath);
    await documentRepo.deleteDocumentById(doc.id);
  }

  const saved = await validateAndSavePrivateFile({
    employeeId: params.employeeId,
    originalName: params.originalName,
    buffer: params.buffer,
    declaredMime: params.declaredMime,
  });

  const row = await documentRepo.insertDocument({
    employeeId: params.employeeId,
    documentType: params.documentType,
    originalFilename: params.originalName,
    storedFilename: saved.storedFilename,
    mimeType: saved.mimeType,
    sizeBytes: saved.sizeBytes,
    storagePath: saved.storagePath,
  });

  await db
    .update(employees)
    .set({ onboardingStatus: "IN_PROGRESS", updatedAt: new Date() })
    .where(eq(employees.id, params.employeeId));

  writeAuditLogAsync({
    actorUserId: params.actorUserId,
    action: "DOCUMENT_UPLOADED",
    entityType: "document",
    entityId: row.id,
    metadata: {
      employeeId: params.employeeId,
      documentType: params.documentType,
    },
  });

  return row;
}

export async function getDocumentStream(params: {
  employeeId: number;
  documentId: string;
  isAdmin: boolean;
  allowHrAccess?: boolean;
}) {
  const doc = await documentRepo.findDocumentById(params.documentId);
  if (!doc) {
    throw new ApiError(404, "NOT_FOUND", "Document not found.");
  }
  if (
    !params.isAdmin &&
    !params.allowHrAccess &&
    doc.employeeId !== params.employeeId
  ) {
    throw new ApiError(403, "FORBIDDEN", "You cannot access this document.");
  }

  return {
    stream: openPrivateFileStream(doc.storagePath),
    mimeType: doc.mimeType,
    originalFilename: doc.originalFilename,
  };
}

export async function deleteDocument(params: {
  employeeId: number;
  documentId: string;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  actorUserId?: string;
}) {
  const doc = await documentRepo.findDocumentById(params.documentId);
  if (!doc) {
    throw new ApiError(404, "NOT_FOUND", "Document not found.");
  }
  if (!params.isAdmin && doc.employeeId !== params.employeeId) {
    throw new ApiError(403, "FORBIDDEN", "You cannot delete this document.");
  }
  if (params.onboardingCompleted && !params.isAdmin) {
    throw new ApiError(
      400,
      "ONBOARDING_COMPLETED",
      "Cannot delete documents after onboarding is completed.",
    );
  }

  await deletePrivateFile(doc.storagePath);
  await documentRepo.deleteDocumentById(params.documentId);

  writeAuditLogAsync({
    actorUserId: params.actorUserId,
    action: "DOCUMENT_DELETED",
    entityType: "document",
    entityId: params.documentId,
    metadata: { employeeId: doc.employeeId },
  });

  return { deleted: true };
}
