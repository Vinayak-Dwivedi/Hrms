import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeDocuments } from "@/db/schema/hrms";
import {
  buildDocumentListSelect,
  buildDocumentSelect,
  documentStorageSelect,
  enrichDocumentRow,
  getDocumentColumnSupport,
} from "@/lib/document-schema-compat";
import type { SupportedDocumentType } from "@/modules/onboarding/constants";

export async function listDocumentsByEmployeeId(employeeId: number) {
  const support = await getDocumentColumnSupport();
  const selectFields = buildDocumentListSelect(support);
  const rows = await db
    .select(selectFields as Record<string, typeof employeeDocuments.id>)
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, employeeId));
  return rows.map((row) =>
    enrichDocumentRow(row as Record<string, unknown>, support),
  );
}

export async function findDocumentById(documentId: string) {
  const support = await getDocumentColumnSupport();
  const selectFields = buildDocumentSelect(support);
  const [row] = await db
    .select(selectFields as Record<string, typeof employeeDocuments.id>)
    .from(employeeDocuments)
    .where(eq(employeeDocuments.id, documentId))
    .limit(1);
  return row
    ? enrichDocumentRow(row as Record<string, unknown>, support)
    : null;
}

export async function insertDocument(params: {
  employeeId: number;
  documentType: SupportedDocumentType;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  status?: "Uploaded" | "Verified";
  verifiedBy?: number | null;
  verifiedAt?: Date | null;
}) {
  const support = await getDocumentColumnSupport();
  const now = new Date();
  const status = params.status ?? "Uploaded";
  const verified =
    support.verification && status === "Verified" && params.verifiedBy != null;

  const values: Record<string, unknown> = {
    employeeId: params.employeeId,
    documentType: params.documentType,
    originalFilename: params.originalFilename,
    storedFilename: params.storedFilename,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    storagePath: params.storagePath,
    status: verified ? "Verified" : "Uploaded",
  };

  if (support.verification) {
    values.verifiedBy = verified ? params.verifiedBy! : null;
    values.verifiedAt = verified ? (params.verifiedAt ?? now) : null;
  }

  const [row] = await db
    .insert(employeeDocuments)
    .values(values as typeof employeeDocuments.$inferInsert)
    .returning({
      id: employeeDocuments.id,
      documentType: employeeDocuments.documentType,
      status: employeeDocuments.status,
      createdAt: employeeDocuments.createdAt,
    });
  return row!;
}

export async function deleteDocumentById(documentId: string) {
  const [row] = await db
    .delete(employeeDocuments)
    .where(eq(employeeDocuments.id, documentId))
    .returning({ id: employeeDocuments.id });
  return row ?? null;
}

export async function listDocumentTypesForEmployee(employeeId: number) {
  const rows = await db
    .select({ documentType: employeeDocuments.documentType })
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, employeeId));
  return new Set(rows.map((r) => r.documentType));
}

export async function hasDocumentType(
  employeeId: number,
  documentType: SupportedDocumentType,
) {
  const [row] = await db
    .select({ id: employeeDocuments.id })
    .from(employeeDocuments)
    .where(
      and(
        eq(employeeDocuments.employeeId, employeeId),
        eq(employeeDocuments.documentType, documentType),
      ),
    )
    .limit(1);
  return !!row;
}

export async function listDocumentsByEmployeeAndType(
  employeeId: number,
  documentType: SupportedDocumentType,
) {
  return db
    .select(documentStorageSelect())
    .from(employeeDocuments)
    .where(
      and(
        eq(employeeDocuments.employeeId, employeeId),
        eq(employeeDocuments.documentType, documentType),
      ),
    );
}
