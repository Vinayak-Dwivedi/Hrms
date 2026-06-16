import { eq } from "drizzle-orm";

import { db } from "@/db/runtime";

import { employeeDocuments, employees } from "@/db/schema/hrms";

import {

  buildDocumentListSelect,

  getDocumentColumnSupport,

} from "@/lib/document-schema-compat";

import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";

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



  const support = await getDocumentColumnSupport();

  const patch: Record<string, unknown> = {

    status: "Verified",

    updatedAt: new Date(),

  };

  if (support.verification) {

    patch.verifiedBy = params.reviewerEmployeeId;

    patch.verifiedAt = new Date();

  }

  if (support.rejection) {

    patch.rejectedBy = null;

    patch.rejectedAt = null;

    patch.rejectionReason = null;

  }



  const returning = buildDocumentListSelect(support);

  const [updated] = await db

    .update(employeeDocuments)

    .set(patch as Partial<typeof employeeDocuments.$inferInsert>)

    .where(eq(employeeDocuments.id, params.documentId))

    .returning(returning as Record<string, typeof employeeDocuments.id>);



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



  const support = await getDocumentColumnSupport();

  if (!support.rejection) {

    throw new ApiError(

      503,

      "SCHEMA_NOT_READY",

      "Document rejection is unavailable until database migrations are applied. Run: npm run db:migrate-onboarding-pending",

    );

  }



  const patch: Record<string, unknown> = {

    status: "Rejected",

    rejectedBy: params.reviewerEmployeeId,

    rejectedAt: new Date(),

    rejectionReason: params.reason,

    updatedAt: new Date(),

  };

  if (support.verification) {

    patch.verifiedBy = null;

    patch.verifiedAt = null;

  }



  const returning = buildDocumentListSelect(support);

  const [updated] = await db

    .update(employeeDocuments)

    .set(patch as Partial<typeof employeeDocuments.$inferInsert>)

    .where(eq(employeeDocuments.id, params.documentId))

    .returning(returning as Record<string, typeof employeeDocuments.id>);



  const columnSupport = await getEmployeeColumnSupport();

  if (columnSupport.onboardingSubmittedAt) {

    await db

      .update(employees)

      .set({ onboardingSubmittedAt: null, updatedAt: new Date() })

      .where(eq(employees.id, doc.employeeId));

  }



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

  return documentRepo.listDocumentsByEmployeeId(employeeId);

}


