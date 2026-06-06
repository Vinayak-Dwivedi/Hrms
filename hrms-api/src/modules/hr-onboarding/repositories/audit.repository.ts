import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { auditLogs } from "@/db/schema/hrms";

export async function listAuditLogs(params: {
  employeeId?: number;
  action?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}) {
  const conditions = [];
  if (params.employeeId) {
    conditions.push(
      sql`(${auditLogs.entityType} = 'employee' AND ${auditLogs.entityId} = ${String(params.employeeId)})`,
    );
  }
  if (params.action) {
    conditions.push(eq(auditLogs.action, params.action as typeof auditLogs.action.enumValues[number]));
  }
  if (params.from) {
    conditions.push(gte(auditLogs.createdAt, params.from));
  }
  if (params.to) {
    conditions.push(lte(auditLogs.createdAt, params.to));
  }

  const where =
    conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(where);

  return { rows, total: countRow?.count ?? 0 };
}
