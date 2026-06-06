import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeDocuments } from "@/db/schema/hrms";
import type { SupportedDocumentType } from "@/modules/onboarding/constants";

export async function listDocumentsByEmployeeId(employeeId: number) {
  return db
    .select({
      id: employeeDocuments.id,
      documentType: employeeDocuments.documentType,
      originalFilename: employeeDocuments.originalFilename,
      mimeType: employeeDocuments.mimeType,
      sizeBytes: employeeDocuments.sizeBytes,
      status: employeeDocuments.status,
      createdAt: employeeDocuments.createdAt,
    })
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, employeeId));
}

export async function findDocumentById(documentId: string) {
  const [row] = await db
    .select()
    .from(employeeDocuments)
    .where(eq(employeeDocuments.id, documentId))
    .limit(1);
  return row ?? null;
}

export async function insertDocument(params: {
  employeeId: number;
  documentType: SupportedDocumentType;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}) {
  const [row] = await db
    .insert(employeeDocuments)
    .values({
      employeeId: params.employeeId,
      documentType: params.documentType,
      originalFilename: params.originalFilename,
      storedFilename: params.storedFilename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storagePath: params.storagePath,
      status: "Uploaded",
    })
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
    .returning();
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
    .select()
    .from(employeeDocuments)
    .where(
      and(
        eq(employeeDocuments.employeeId, employeeId),
        eq(employeeDocuments.documentType, documentType),
      ),
    );
}
