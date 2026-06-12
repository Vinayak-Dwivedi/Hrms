import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import {
  employeeDetailSelect,
  employeeListSelect,
  enrichEmployeeRow,
  getEmployeeColumnSupport,
  onboardingStatusWhere,
  type OnboardingPipelineStatus,
} from "@/lib/employee-schema-compat";
import { decryptEmployeeLegacyRow } from "@/lib/sensitive-employee-fields";

const SENSITIVE_KEYS = new Set(["passwordHash", "onboardingToken"]);

export function redactEmployeeRow<T extends Record<string, unknown>>(row: T) {
  const out = { ...row };
  for (const key of SENSITIVE_KEYS) {
    delete out[key];
  }
  return out;
}

export async function listEmployeesAdmin(params: {
  search?: string;
  departmentId?: number;
  employeeStatus?: string;
  onboardingStatus?: string;
  limit: number;
  offset: number;
  sort?: "id" | "createdAt" | "joiningDate" | "lastName";
}) {
  const support = await getEmployeeColumnSupport();
  const conditions = [];
  if (params.departmentId) {
    conditions.push(eq(employees.departmentId, params.departmentId));
  }
  if (params.employeeStatus) {
    conditions.push(
      eq(
        employees.employeeStatus,
        params.employeeStatus as (typeof employees.employeeStatus.enumValues)[number],
      ),
    );
  }
  if (params.onboardingStatus) {
    conditions.push(
      onboardingStatusWhere(
        params.onboardingStatus as OnboardingPipelineStatus,
        support,
      ),
    );
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(employees.firstName, q),
        ilike(employees.lastName, q),
        ilike(employees.empId, q),
        ilike(employees.workEmail, q),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const order =
    params.sort === "joiningDate"
      ? desc(employees.joiningDate)
      : params.sort === "lastName"
        ? asc(employees.lastName)
        : params.sort === "createdAt"
          ? desc(employees.createdAt)
          : desc(employees.id);

  const selectFields = employeeListSelect(support);
  const rows = await db
    .select(selectFields as Record<string, typeof employees.id>)
    .from(employees)
    .where(where)
    .orderBy(order)
    .limit(params.limit)
    .offset(params.offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employees)
    .where(where);

  return {
    rows: rows.map((r) =>
      redactEmployeeRow(enrichEmployeeRow(r, support) as Record<string, unknown>),
    ),
    total: countRow?.count ?? 0,
  };
}

export async function getEmployeeAdminById(id: number) {
  const support = await getEmployeeColumnSupport();
  const selectFields = employeeDetailSelect(support);
  const [row] = await db
    .select(selectFields as Record<string, typeof employees.id>)
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return row
    ? redactEmployeeRow(
        decryptEmployeeLegacyRow(
          enrichEmployeeRow(row, support) as Record<string, unknown>,
        ),
      )
    : null;
}
