import { eq, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { leaveTypes } from "@/db/schema/hrms";

const TRACKED_COLUMNS = [
  "is_active",
  "allow_half_day",
  "min_notice_days",
  "allow_negative_balance",
  "requires_proof_after_days",
  "max_continuous_days",
] as const;

export type LeaveTypeColumnSupport = {
  isActive: boolean;
  allowHalfDay: boolean;
  minNoticeDays: boolean;
  allowNegativeBalance: boolean;
  requiresProofAfterDays: boolean;
  maxContinuousDays: boolean;
};

export type LeaveTypeRules = {
  allowHalfDay: boolean;
  minNoticeDays: number;
  allowNegativeBalance: boolean;
  requiresProofAfterDays: number | null;
  maxContinuousDays: number | null;
  isActive: boolean;
};

export const DEFAULT_LEAVE_TYPE_RULES: LeaveTypeRules = {
  allowHalfDay: true,
  minNoticeDays: 0,
  allowNegativeBalance: false,
  requiresProofAfterDays: null,
  maxContinuousDays: null,
  isActive: true,
};

export type LeaveBalanceRow = {
  leaveTypeId: number;
  name: string;
  code: string;
  openingBalance: string;
  used: string;
  closingBalance: string;
} & LeaveTypeRules;

type RawBalanceRow = {
  leave_type_id: number;
  name: string;
  code: string;
  opening_balance: string;
  used: string;
  closing_balance: string;
  allow_half_day: boolean;
  min_notice_days: number;
  allow_negative_balance: boolean;
  requires_proof_after_days: number | null;
  max_continuous_days: number | null;
  is_active: boolean;
};

let cachedSupport: LeaveTypeColumnSupport | null = null;

function normalizeExecuteRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export function clearLeaveTypeColumnSupportCache(): void {
  cachedSupport = null;
}

export async function getLeaveTypeColumnSupport(): Promise<LeaveTypeColumnSupport> {
  if (cachedSupport) return cachedSupport;

  const result = await db.execute<{ column_name: string }>(sql`
    SELECT column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leave_types'
      AND column_name IN (${sql.join(
        TRACKED_COLUMNS.map((c) => sql`${c}`),
        sql`, `,
      )})
  `);

  const cols = new Set(
    normalizeExecuteRows(result).map((r) => r.column_name),
  );

  cachedSupport = {
    isActive: cols.has("is_active"),
    allowHalfDay: cols.has("allow_half_day"),
    minNoticeDays: cols.has("min_notice_days"),
    allowNegativeBalance: cols.has("allow_negative_balance"),
    requiresProofAfterDays: cols.has("requires_proof_after_days"),
    maxContinuousDays: cols.has("max_continuous_days"),
  };
  return cachedSupport;
}

function mapBalanceRow(row: RawBalanceRow): LeaveBalanceRow {
  return {
    leaveTypeId: row.leave_type_id,
    name: row.name,
    code: row.code,
    openingBalance: row.opening_balance,
    used: row.used,
    closingBalance: row.closing_balance,
    allowHalfDay: row.allow_half_day,
    minNoticeDays: row.min_notice_days,
    allowNegativeBalance: row.allow_negative_balance,
    requiresProofAfterDays: row.requires_proof_after_days,
    maxContinuousDays: row.max_continuous_days,
    isActive: row.is_active,
  };
}

/** Leave balances joined with leave-type rules; safe before leave_types extend migration. */
export async function fetchEmployeeLeaveBalances(
  employeeId: number,
): Promise<LeaveBalanceRow[]> {
  const support = await getLeaveTypeColumnSupport();

  const activeFilter = support.isActive ? sql`AND lt.is_active = true` : sql``;

  const result = await db.execute<RawBalanceRow>(sql`
    SELECT
      lt.id AS leave_type_id,
      lt.name,
      lt.code,
      lb.opening_balance,
      lb.used,
      lb.closing_balance,
      ${support.allowHalfDay ? sql`lt.allow_half_day` : sql`true`} AS allow_half_day,
      ${support.minNoticeDays ? sql`lt.min_notice_days` : sql`0`} AS min_notice_days,
      ${
        support.allowNegativeBalance
          ? sql`lt.allow_negative_balance`
          : sql`false`
      } AS allow_negative_balance,
      ${
        support.requiresProofAfterDays
          ? sql`lt.requires_proof_after_days`
          : sql`NULL::integer`
      } AS requires_proof_after_days,
      ${
        support.maxContinuousDays
          ? sql`lt.max_continuous_days`
          : sql`NULL::integer`
      } AS max_continuous_days,
      ${support.isActive ? sql`lt.is_active` : sql`true`} AS is_active
    FROM leave_balances lb
    INNER JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.employee_id = ${employeeId}
    ${activeFilter}
    ORDER BY lt.name ASC
  `);

  return normalizeExecuteRows<RawBalanceRow>(result).map(mapBalanceRow);
}

export async function loadLeaveTypeRules(
  leaveTypeId: number,
): Promise<LeaveTypeRules> {
  const [base] = await db
    .select({ id: leaveTypes.id })
    .from(leaveTypes)
    .where(eq(leaveTypes.id, leaveTypeId))
    .limit(1);

  if (!base) {
    return { ...DEFAULT_LEAVE_TYPE_RULES };
  }

  const support = await getLeaveTypeColumnSupport();
  const hasExtended = Object.values(support).some(Boolean);
  if (!hasExtended) {
    return { ...DEFAULT_LEAVE_TYPE_RULES };
  }

  const result = await db.execute<{
    allow_half_day: boolean;
    min_notice_days: number;
    allow_negative_balance: boolean;
    requires_proof_after_days: number | null;
    max_continuous_days: number | null;
    is_active: boolean;
  }>(sql`
    SELECT
      ${support.allowHalfDay ? sql`lt.allow_half_day` : sql`true`} AS allow_half_day,
      ${support.minNoticeDays ? sql`lt.min_notice_days` : sql`0`} AS min_notice_days,
      ${
        support.allowNegativeBalance
          ? sql`lt.allow_negative_balance`
          : sql`false`
      } AS allow_negative_balance,
      ${
        support.requiresProofAfterDays
          ? sql`lt.requires_proof_after_days`
          : sql`NULL::integer`
      } AS requires_proof_after_days,
      ${
        support.maxContinuousDays
          ? sql`lt.max_continuous_days`
          : sql`NULL::integer`
      } AS max_continuous_days,
      ${support.isActive ? sql`lt.is_active` : sql`true`} AS is_active
    FROM leave_types lt
    WHERE lt.id = ${leaveTypeId}
    LIMIT 1
  `);

  const row = normalizeExecuteRows(result)[0];
  if (!row) return { ...DEFAULT_LEAVE_TYPE_RULES };

  return {
    allowHalfDay: row.allow_half_day,
    minNoticeDays: row.min_notice_days,
    allowNegativeBalance: row.allow_negative_balance,
    requiresProofAfterDays: row.requires_proof_after_days,
    maxContinuousDays: row.max_continuous_days,
    isActive: row.is_active,
  };
}

export async function loadLeaveTypeRulesById(
  leaveTypeId: number,
): Promise<LeaveTypeRules | null> {
  const [base] = await db
    .select({ id: leaveTypes.id })
    .from(leaveTypes)
    .where(eq(leaveTypes.id, leaveTypeId))
    .limit(1);
  if (!base) return null;
  return loadLeaveTypeRules(leaveTypeId);
}
