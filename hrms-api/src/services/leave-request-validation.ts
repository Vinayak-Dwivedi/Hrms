import { and, eq, inArray, lte, gte } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  holidays,
  leaveBalances,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/hrms";
import { todayYmd } from "@/lib/employee";
import {
  fetchEmployeeLeaveBalances,
  loadLeaveTypeRulesById,
  type LeaveBalanceRow,
} from "@/lib/leave-type-schema-compat";
import { ApiError } from "@/middleware/error";

export type LeaveDurationType = "Full Day" | "First Half" | "Second Half";

export interface ValidateLeaveRequestInput {
  employeeId: number;
  branchId: number | null;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  durationType: LeaveDurationType;
}

export interface ValidatedLeaveRequest {
  days: number;
  leaveTypeId: number;
}

export type { LeaveBalanceRow };

export { fetchEmployeeLeaveBalances };

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function holidayDatesForBranch(
  fromDate: string,
  toDate: string,
  branchId: number | null,
): Promise<Set<string>> {
  const rows = await db
    .select({ date: holidays.date, branchId: holidays.branchId })
    .from(holidays)
    .where(and(gte(holidays.date, fromDate), lte(holidays.date, toDate)));

  const set = new Set<string>();
  for (const r of rows) {
    if (r.branchId === null || r.branchId === branchId) {
      set.add(r.date);
    }
  }
  return set;
}

function countWorkingDays(
  fromDate: string,
  toDate: string,
  holidayDates: ReadonlySet<string>,
): number {
  const s = parseYmd(fromDate);
  const e = parseYmd(toDate);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (!holidayDates.has(key)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function validateLeaveRequest(
  input: ValidateLeaveRequestInput,
): Promise<ValidatedLeaveRequest> {
  const { employeeId, branchId, leaveTypeId, fromDate, toDate, durationType } =
    input;

  if (toDate < fromDate) {
    throw new ApiError(400, "INVALID_DATE_RANGE", "To date must be on or after from date.");
  }

  const [typeExists] = await db
    .select({ id: leaveTypes.id })
    .from(leaveTypes)
    .where(eq(leaveTypes.id, leaveTypeId))
    .limit(1);

  if (!typeExists) {
    throw new ApiError(400, "UNKNOWN_LEAVE_TYPE", "Leave type not found.");
  }

  const type = await loadLeaveTypeRulesById(leaveTypeId);
  if (!type) {
    throw new ApiError(400, "UNKNOWN_LEAVE_TYPE", "Leave type not found.");
  }
  if (!type.isActive) {
    throw new ApiError(400, "INACTIVE_LEAVE_TYPE", "This leave type is not active.");
  }

  const isHalfDay = durationType !== "Full Day";
  if (isHalfDay && !type.allowHalfDay) {
    throw new ApiError(
      400,
      "HALF_DAY_NOT_ALLOWED",
      "Half-day leave is not allowed for this leave type.",
    );
  }

  const today = todayYmd();
  const noticeDays = Math.floor(
    (parseYmd(fromDate).getTime() - parseYmd(today).getTime()) / 86_400_000,
  );
  if (noticeDays < type.minNoticeDays) {
    throw new ApiError(
      400,
      "MIN_NOTICE_VIOLATION",
      `This leave type requires at least ${type.minNoticeDays} day(s) notice.`,
    );
  }

  const holidaySet = await holidayDatesForBranch(fromDate, toDate, branchId);
  const days = isHalfDay
    ? 0.5
    : countWorkingDays(fromDate, toDate, holidaySet);

  if (days <= 0) {
    throw new ApiError(
      400,
      "NO_WORKING_DAYS",
      "The selected date range has no working days.",
    );
  }

  if (type.maxContinuousDays != null && days > type.maxContinuousDays) {
    throw new ApiError(
      400,
      "MAX_CONTINUOUS_EXCEEDED",
      `This leave type allows at most ${type.maxContinuousDays} continuous day(s).`,
    );
  }

  const [balance] = await db
    .select({ closingBalance: leaveBalances.closingBalance })
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
      ),
    )
    .limit(1);

  if (!balance) {
    throw new ApiError(400, "NO_LEAVE_BALANCE", "No leave balance found for this type.");
  }

  const available = Number(balance.closingBalance);
  if (!type.allowNegativeBalance && days > available) {
    throw new ApiError(
      400,
      "INSUFFICIENT_BALANCE",
      `Insufficient balance. Available: ${available}, requested: ${days}.`,
    );
  }

  const overlapping = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, employeeId),
        inArray(leaveRequests.status, ["Pending", "Approved"]),
        lte(leaveRequests.fromDate, toDate),
        gte(leaveRequests.toDate, fromDate),
      ),
    )
    .limit(1);

  if (overlapping.length > 0) {
    throw new ApiError(
      400,
      "OVERLAPPING_LEAVE",
      "You already have a pending or approved leave request for overlapping dates.",
    );
  }

  return { days, leaveTypeId };
}
