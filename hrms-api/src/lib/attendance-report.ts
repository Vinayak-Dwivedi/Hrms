import { type SQL, sql } from "drizzle-orm";
import { resolveWorkingMinutes } from "@/lib/attendance-import";
import {
  emptyAttendanceDayContext,
  resolveAttendanceStatusForDate,
  type AttendanceDayContext,
} from "@/lib/attendance-status";
import { attendanceUploads, employees } from "@/db/schema/hrms";
import { formatEmployeeFullName } from "@/lib/employee";

/** attendance_uploads.employee_code = employees.emp_id (trim + case-insensitive) */
export function attendanceUploadToEmployeeJoin(): SQL {
  return sql`lower(trim(${attendanceUploads.employeeCode})) = lower(trim(${employees.empId}))`;
}

/** Filter attendance_uploads rows for a single employee emp_id value. */
export function attendanceUploadMatchesEmpId(empId: string): SQL {
  return sql`lower(trim(${attendanceUploads.employeeCode})) = lower(trim(${empId}))`;
}

export type AttendanceReportShiftInfo = {
  name: string;
  shiftTiming: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
};

export type AttendanceReportRowInput = {
  attendanceDate: string | null;
  employeeCode: string;
  inTime: string | null;
  outTime: string | null;
  totalHours: string | null;
  hasUploadRecord: boolean;
  firstName: string;
  middleName: string | null;
  lastName: string;
  departmentName: string | null;
  subDepartmentName: string | null;
  designationName: string | null;
  locationName: string | null;
  reportingManagerL2: string | null;
  reportingManagerL3: string | null;
  shift?: AttendanceReportShiftInfo | null;
  dayContext?: AttendanceDayContext | null;
};

export type AttendanceReportRow = {
  date: string | null;
  day: string | null;
  employeeId: string;
  employeeName: string;
  department: string | null;
  subDepartment: string | null;
  designation: string | null;
  location: string | null;
  reportingManagerL2: string | null;
  reportingManagerL3: string | null;
  shiftName: string | null;
  shiftTiming: string | null;
  attendanceStatus: string | null;
  firstLoginTime: string | null;
  lastLogoutTime: string | null;
  grossWorkingHours: string | null;
  breakTime: string | null;
  netWorkingHours: string | null;
  lateBy: string | null;
  earlyExit: string | null;
  overtimeHours: string | null;
  missPunch: string | null;
  regularizationStatus: string | null;
};

export function formatDayName(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export function formatDurationFromMinutes(minutes: number): string | null {
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function formatTimeHms(t: string | null): string | null {
  if (!t) return null;
  const parts = t.split(":");
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  const ss = (parts[2] ?? "00").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function computeMissPunch(
  inTime: string | null,
  outTime: string | null,
): string {
  return !inTime || !outTime ? "Yes" : "No";
}

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  const hh = Number(parts[0] ?? 0);
  const mm = Number(parts[1] ?? 0);
  return hh * 60 + mm;
}

export function computeShiftDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return end - start;
}

function computeLateBy(
  inTime: string | null,
  shift: AttendanceReportShiftInfo | null | undefined,
): string | null {
  if (!inTime || !shift) return null;
  const login = timeToMinutes(inTime);
  const expected = timeToMinutes(shift.startTime) + shift.graceMinutes;
  if (login <= expected) return null;
  return formatDurationFromMinutes(login - expected);
}

function computeEarlyExit(
  outTime: string | null,
  shift: AttendanceReportShiftInfo | null | undefined,
): string | null {
  if (!outTime || !shift) return null;
  const logout = timeToMinutes(outTime);
  const expected = timeToMinutes(shift.endTime);
  if (logout >= expected) return null;
  return formatDurationFromMinutes(expected - logout);
}

function formatBreakMinutes(minutes: number): string | null {
  if (minutes <= 0) return null;
  return `${minutes}m`;
}

export function computeNetLoginMinutes(
  workingMinutes: number,
  breakMinutes: number,
): number {
  return Math.max(0, workingMinutes - breakMinutes);
}

/** Productive time after deducting configured lunch break. */
export function computeProductiveMinutes(
  workingMinutes: number,
  breakMinutes: number,
): number {
  return Math.max(0, workingMinutes - breakMinutes);
}

/** @deprecated Use computeProductiveMinutes for break-adjusted time. */
export function computeNetWorkingMinutes(
  workingMinutes: number,
  breakMinutes: number,
): number {
  return computeProductiveMinutes(workingMinutes, breakMinutes);
}

export function computeOvertimeMinutes(
  workingMinutes: number,
  breakMinutes: number,
  shiftMinutes: number,
): number {
  if (shiftMinutes <= 0) return 0;
  const productive = computeProductiveMinutes(workingMinutes, breakMinutes);
  const expectedProductive = Math.max(0, shiftMinutes - breakMinutes);
  return Math.max(0, productive - expectedProductive);
}

export function shapeAttendanceReportRow(
  input: AttendanceReportRowInput,
): AttendanceReportRow {
  if (!input.hasUploadRecord || !input.attendanceDate) {
    return {
      date: null,
      day: null,
      employeeId: input.employeeCode,
      employeeName: formatEmployeeFullName(input),
      department: input.departmentName,
      subDepartment: input.subDepartmentName,
      designation: input.designationName,
      location: input.locationName,
      reportingManagerL2: input.reportingManagerL2,
      reportingManagerL3: input.reportingManagerL3,
      shiftName: input.shift?.name ?? null,
      shiftTiming: input.shift?.shiftTiming ?? null,
      attendanceStatus: null,
      firstLoginTime: null,
      lastLogoutTime: null,
      grossWorkingHours: null,
      breakTime: null,
      netWorkingHours: null,
      lateBy: null,
      earlyExit: null,
      overtimeHours: null,
      missPunch: null,
      regularizationStatus: null,
    };
  }

  const workingMinutes = resolveWorkingMinutes(
    input.inTime,
    input.outTime,
    input.totalHours ?? undefined,
  );
  const breakMinutes = input.shift?.breakMinutes ?? 0;
  const shiftMinutes = input.shift
    ? computeShiftDurationMinutes(input.shift.startTime, input.shift.endTime)
    : 0;
  const shiftHours = input.shift
    ? formatDurationFromMinutes(shiftMinutes)
    : null;
  const net = formatDurationFromMinutes(
    computeNetLoginMinutes(workingMinutes, breakMinutes),
  );
  const overtime = formatDurationFromMinutes(
    computeOvertimeMinutes(workingMinutes, breakMinutes, shiftMinutes),
  );
  const dayContext = input.dayContext ?? emptyAttendanceDayContext();
  const attendanceStatus = resolveAttendanceStatusForDate(
    input.attendanceDate,
    {
      inTime: input.inTime,
      outTime: input.outTime,
      totalHours: input.totalHours,
    },
    dayContext,
  );

  return {
    date: input.attendanceDate,
    day: formatDayName(input.attendanceDate),
    employeeId: input.employeeCode,
    employeeName: formatEmployeeFullName(input),
    department: input.departmentName,
    subDepartment: input.subDepartmentName,
    designation: input.designationName,
    location: input.locationName,
    reportingManagerL2: input.reportingManagerL2,
    reportingManagerL3: input.reportingManagerL3,
    shiftName: input.shift?.name ?? null,
    shiftTiming: input.shift?.shiftTiming ?? null,
    attendanceStatus,
    firstLoginTime: formatTimeHms(input.inTime),
    lastLogoutTime: formatTimeHms(input.outTime),
    grossWorkingHours: shiftHours,
    breakTime: formatBreakMinutes(breakMinutes),
    netWorkingHours: net,
    lateBy: computeLateBy(input.inTime, input.shift),
    earlyExit: computeEarlyExit(input.outTime, input.shift),
    overtimeHours: overtime,
    missPunch: computeMissPunch(input.inTime, input.outTime),
    regularizationStatus: null,
  };
}
