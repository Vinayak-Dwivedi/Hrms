import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeDocuments } from "@/db/schema/hrms";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import * as documentRepo from "@/modules/onboarding/repositories/document.repository";
import * as documentService from "@/modules/onboarding/services/document.service";
import { ApiError } from "@/middleware/error";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };

export async function verifyDocument(params: {
  documentId: string;
  reviewerEmployeeId: number;
  actorUserId: string;
  audit?: AuditCtx;
}) {
  const doc = await documentRepo.findDocumentById(params.documentId);
  if (!doc) {
    throw new ApiError(404, "NOT_FOUND", "Document not found.");
  }

  const [updated] = await db
    .update(employeeDocuments)
    .set({
      status: "Verified",
      verifiedBy: params.reviewerEmployeeId,
      verifiedAt: new Date(),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(employeeDocuments.id, params.documentId))
    .returning();

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      actorEmployeeId: params.reviewerEmployeeId,
      action: "DOCUMENT_VERIFIED",
      entityType: "document",
      entityId: params.documentId,
      metadata: { employeeId: doc.employeeId, documentType: doc.documentType },
    },
    params.audit,
  );

  return updated!;
}

export async function rejectDocument(params: {
  documentId: string;
  reason: string;
  reviewerEmployeeId: number;
  actorUserId: string;
  audit?: AuditCtx;
}) {
  const doc = await documentRepo.findDocumentById(params.documentId);
  if (!doc) {
    throw new ApiError(404, "NOT_FOUND", "Document not found.");
  }

  const [updated] = await db
    .update(employeeDocuments)
    .set({
      status: "Rejected",
      rejectedBy: params.reviewerEmployeeId,
      rejectedAt: new Date(),
      rejectionReason: params.reason,
      verifiedBy: null,
      verifiedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(employeeDocuments.id, params.documentId))
    .returning();

  writeAuditLogAsync(
    {
      actorUserId: params.actorUserId,
      actorEmployeeId: params.reviewerEmployeeId,
      action: "DOCUMENT_REJECTED",
      entityType: "document",
      entityId: params.documentId,
      metadata: {
        employeeId: doc.employeeId,
        documentType: doc.documentType,
        reason: params.reason,
      },
    },
    params.audit,
  );

  return updated!;
}

export async function downloadDocumentAsHr(params: {
  documentId: string;
  hrEmployeeId: number;
  isAdmin: boolean;
}) {
  return documentService.getDocumentStream({
    employeeId: params.hrEmployeeId,
    documentId: params.documentId,
    isAdmin: params.isAdmin,
    allowHrAccess: true,
  });
}

export async function listEmployeeDocuments(employeeId: number) {
  return db
    .select({
      id: employeeDocuments.id,
      documentType: employeeDocuments.documentType,
      originalFilename: employeeDocuments.originalFilename,
      mimeType: employeeDocuments.mimeType,
      sizeBytes: employeeDocuments.sizeBytes,
      status: employeeDocuments.status,
      verifiedBy: employeeDocuments.verifiedBy,
      verifiedAt: employeeDocuments.verifiedAt,
      rejectedBy: employeeDocuments.rejectedBy,
      rejectedAt: employeeDocuments.rejectedAt,
      rejectionReason: employeeDocuments.rejectionReason,
      createdAt: employeeDocuments.createdAt,
    })
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, employeeId));
}
