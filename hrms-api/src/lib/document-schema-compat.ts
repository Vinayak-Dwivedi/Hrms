import { sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeDocuments } from "@/db/schema/hrms";

export type DocumentColumnSupport = {
  verification: boolean;
  rejection: boolean;
};

const TRACKED_COLUMNS = [
  "verified_by",
  "verified_at",
  "rejected_by",
  "rejected_at",
  "rejection_reason",
] as const;

let cachedColumns: DocumentColumnSupport | null = null;

function normalizeExecuteRows(
  result: unknown,
): Array<{ column_name: string }> {
  if (Array.isArray(result)) {
    return result as Array<{ column_name: string }>;
  }
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Array<{ column_name: string }> }).rows;
  }
  return [];
}

export function clearDocumentColumnSupportCache(): void {
  cachedColumns = null;
}

export async function getDocumentColumnSupport(): Promise<DocumentColumnSupport> {
  if (cachedColumns) return cachedColumns;

  const result = await db.execute<{ column_name: string }>(sql`
    SELECT column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_documents'
      AND column_name IN (${sql.join(
        TRACKED_COLUMNS.map((c) => sql`${c}`),
        sql`, `,
      )})
  `);

  const cols = new Set(
    normalizeExecuteRows(result).map((r) => r.column_name),
  );

  cachedColumns = {
    verification: cols.has("verified_by") && cols.has("verified_at"),
    rejection:
      cols.has("rejected_by") &&
      cols.has("rejected_at") &&
      cols.has("rejection_reason"),
  };

  return cachedColumns;
}

export function documentCoreSelect() {
  return {
    id: employeeDocuments.id,
    employeeId: employeeDocuments.employeeId,
    documentType: employeeDocuments.documentType,
    originalFilename: employeeDocuments.originalFilename,
    storedFilename: employeeDocuments.storedFilename,
    mimeType: employeeDocuments.mimeType,
    sizeBytes: employeeDocuments.sizeBytes,
    storagePath: employeeDocuments.storagePath,
    status: employeeDocuments.status,
    createdAt: employeeDocuments.createdAt,
    updatedAt: employeeDocuments.updatedAt,
  };
}

export function documentStorageSelect() {
  return {
    id: employeeDocuments.id,
    storagePath: employeeDocuments.storagePath,
  };
}

export function buildDocumentSelect(support: DocumentColumnSupport) {
  const fields: Record<string, unknown> = {
    ...documentCoreSelect(),
  };
  if (support.verification) {
    fields.verifiedBy = employeeDocuments.verifiedBy;
    fields.verifiedAt = employeeDocuments.verifiedAt;
  }
  if (support.rejection) {
    fields.rejectedBy = employeeDocuments.rejectedBy;
    fields.rejectedAt = employeeDocuments.rejectedAt;
    fields.rejectionReason = employeeDocuments.rejectionReason;
  }
  return fields;
}

export function buildDocumentListSelect(support: DocumentColumnSupport) {
  const fields: Record<string, unknown> = {
    id: employeeDocuments.id,
    documentType: employeeDocuments.documentType,
    originalFilename: employeeDocuments.originalFilename,
    mimeType: employeeDocuments.mimeType,
    sizeBytes: employeeDocuments.sizeBytes,
    status: employeeDocuments.status,
    createdAt: employeeDocuments.createdAt,
  };
  if (support.verification) {
    fields.verifiedBy = employeeDocuments.verifiedBy;
    fields.verifiedAt = employeeDocuments.verifiedAt;
  }
  if (support.rejection) {
    fields.rejectedBy = employeeDocuments.rejectedBy;
    fields.rejectedAt = employeeDocuments.rejectedAt;
    fields.rejectionReason = employeeDocuments.rejectionReason;
  }
  return fields;
}

export function enrichDocumentRow<T extends Record<string, unknown>>(
  row: T,
  support: DocumentColumnSupport,
): T & {
  verifiedBy: number | null;
  verifiedAt: Date | null;
  rejectedBy: number | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
} {
  return {
    ...row,
    verifiedBy:
      support.verification && "verifiedBy" in row
        ? ((row.verifiedBy as number | null) ?? null)
        : null,
    verifiedAt:
      support.verification && "verifiedAt" in row
        ? ((row.verifiedAt as Date | null) ?? null)
        : null,
    rejectedBy:
      support.rejection && "rejectedBy" in row
        ? ((row.rejectedBy as number | null) ?? null)
        : null,
    rejectedAt:
      support.rejection && "rejectedAt" in row
        ? ((row.rejectedAt as Date | null) ?? null)
        : null,
    rejectionReason:
      support.rejection && "rejectionReason" in row
        ? ((row.rejectionReason as string | null) ?? null)
        : null,
  };
}
