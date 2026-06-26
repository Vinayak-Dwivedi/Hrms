import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/runtime";
import { attendanceUploads, leaveRequests } from "@/db/schema/hrms";
import {
  deriveAttendanceStatus,
  resolveWorkingMinutes,
  type AttendanceStatus,
} from "@/lib/attendance-import";
import { attendanceUploadMatchesEmpId } from "@/lib/attendance-report";
import {
  holidaysForEmployee,
  loadEmployeeDimensions,
} from "@/services/holiday-calendar-resolver";
import { weeklyOffDatesForEmployee } from "@/services/weekly-off-resolver";

export type ApprovedLeaveDay = "full" | "half";

export type AttendanceDayContext = {
  approvedLeave: Map<string, ApprovedLeaveDay>;
  holidays: Set<string>;
  weeklyOff: Set<string>;
};

export type PunchInput = {
  inTime: string | null;
  outTime: string | null;
  totalHours?: string | null;
};

export type DayStatusFlags = {
  approvedLeaveFull: boolean;
  approvedLeaveHalf: boolean;
  isHoliday: boolean;
  isWeeklyOff: boolean;
};

export function emptyAttendanceDayContext(): AttendanceDayContext {
  return {
    approvedLeave: new Map(),
    holidays: new Set(),
    weeklyOff: new Set(),
  };
}

function expandDateRangeYmd(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function flagsForDate(
  context: AttendanceDayContext,
  date: string,
): DayStatusFlags {
  const leave = context.approvedLeave.get(date);
  return {
    approvedLeaveFull: leave === "full",
    approvedLeaveHalf: leave === "half",
    isHoliday: context.holidays.has(date),
    isWeeklyOff: context.weeklyOff.has(date),
  };
}

/** Fixed precedence: approved leave → holiday → weekly off → punch rules. */
export function resolveAttendanceStatus(
  punch: PunchInput,
  flags: DayStatusFlags,
): AttendanceStatus {
  if (flags.approvedLeaveFull) return "Leave";
  if (flags.approvedLeaveHalf) return "Half Day";
  if (flags.isHoliday) return "Holiday";
  if (flags.isWeeklyOff) return "Weekend";

  const workingMinutes = resolveWorkingMinutes(
    punch.inTime,
    punch.outTime,
    punch.totalHours ?? undefined,
  );
  const bothPunchesMissing = !punch.inTime && !punch.outTime;

  if (bothPunchesMissing && workingMinutes === 0) {
    return "Absent";
  }

  return deriveAttendanceStatus(workingMinutes);
}

export function resolveAttendanceStatusForDate(
  date: string,
  punch: PunchInput,
  context: AttendanceDayContext,
): AttendanceStatus {
  return resolveAttendanceStatus(punch, flagsForDate(context, date));
}

export async function loadAttendanceDayContext(
  employeeId: number,
  fromDate: string,
  toDate: string,
): Promise<AttendanceDayContext> {
  const emp = await loadEmployeeDimensions(employeeId);
  if (!emp) return emptyAttendanceDayContext();

  const [leaveRows, holidayList, weeklyOffSet] = await Promise.all([
    db
      .select({
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        durationType: leaveRequests.durationType,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.status, "Approved"),
          lte(leaveRequests.fromDate, toDate),
          gte(leaveRequests.toDate, fromDate),
        ),
      ),
    holidaysForEmployee(employeeId, fromDate, toDate),
    weeklyOffDatesForEmployee(emp, fromDate, toDate),
  ]);

  const approvedLeave = new Map<string, ApprovedLeaveDay>();
  for (const lr of leaveRows) {
    const isHalf = lr.durationType !== "Full Day";
    for (const d of expandDateRangeYmd(lr.fromDate, lr.toDate)) {
      if (d < fromDate || d > toDate) continue;
      const next: ApprovedLeaveDay = isHalf ? "half" : "full";
      const existing = approvedLeave.get(d);
      if (existing === "full") continue;
      approvedLeave.set(d, next);
    }
  }

  return {
    approvedLeave,
    holidays: new Set(holidayList.map((h) => h.date)),
    weeklyOff: weeklyOffSet,
  };
}

/** Load context for multiple employees in parallel (upload list, team report). */
export async function loadAttendanceDayContextBatch(
  employeeIds: number[],
  fromDate: string,
  toDate: string,
): Promise<Map<number, AttendanceDayContext>> {
  const unique = [...new Set(employeeIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await loadAttendanceDayContext(id, fromDate, toDate)] as const),
  );
  return new Map(entries);
}

/** Dates in range that are leave/holiday/weekly-off but may lack upload rows. */
export function specialStatusDatesInRange(
  context: AttendanceDayContext,
  fromDate: string,
  toDate: string,
): string[] {
  const dates = new Set<string>();
  for (const d of context.approvedLeave.keys()) {
    if (d >= fromDate && d <= toDate) dates.add(d);
  }
  for (const d of context.holidays) {
    if (d >= fromDate && d <= toDate) dates.add(d);
  }
  for (const d of context.weeklyOff) {
    if (d >= fromDate && d <= toDate) dates.add(d);
  }
  return [...dates].sort();
}

export type MonthAttendanceRecord = {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  workingMinutes: number;
  lateByMinutes: number;
  earlyExitMinutes: number;
  status: AttendanceStatus;
  location: null;
};

/** Build calendar month rows from uploads + leave/holiday/weekly-off context. */
export async function buildMonthAttendanceFromUploads(
  employeeInternalId: number,
  empId: string,
  fromDate: string,
  toDate: string,
): Promise<MonthAttendanceRecord[]> {
  const [uploadRows, dayContext] = await Promise.all([
    db
      .select({
        attendanceDate: attendanceUploads.attendanceDate,
        inTime: attendanceUploads.inTime,
        outTime: attendanceUploads.outTime,
        totalHours: attendanceUploads.totalHours,
      })
      .from(attendanceUploads)
      .where(
        and(
          attendanceUploadMatchesEmpId(empId),
          gte(attendanceUploads.attendanceDate, fromDate),
          lte(attendanceUploads.attendanceDate, toDate),
        ),
      )
      .orderBy(asc(attendanceUploads.attendanceDate)),
    loadAttendanceDayContext(employeeInternalId, fromDate, toDate),
  ]);

  const uploadByDate = new Map(
    uploadRows.map((row) => [row.attendanceDate, row]),
  );

  const records: MonthAttendanceRecord[] = uploadRows.map((row) => ({
    date: row.attendanceDate,
    punchIn: row.inTime,
    punchOut: row.outTime,
    workingMinutes: resolveWorkingMinutes(
      row.inTime,
      row.outTime,
      row.totalHours ?? undefined,
    ),
    lateByMinutes: 0,
    earlyExitMinutes: 0,
    status: resolveAttendanceStatusForDate(
      row.attendanceDate,
      {
        inTime: row.inTime,
        outTime: row.outTime,
        totalHours: row.totalHours,
      },
      dayContext,
    ),
    location: null,
  }));

  for (const date of specialStatusDatesInRange(dayContext, fromDate, toDate)) {
    if (uploadByDate.has(date)) continue;
    const status = resolveAttendanceStatusForDate(
      date,
      { inTime: null, outTime: null, totalHours: null },
      dayContext,
    );
    if (status === "Absent") continue;
    records.push({
      date,
      punchIn: null,
      punchOut: null,
      workingMinutes: 0,
      lateByMinutes: 0,
      earlyExitMinutes: 0,
      status,
      location: null,
    });
  }

  records.sort((a, b) => a.date.localeCompare(b.date));
  return records;
}
