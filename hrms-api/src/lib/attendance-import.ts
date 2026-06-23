export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Half Day"
  | "Leave"
  | "Holiday"
  | "Weekend";

/** Convert a time cell into "HH:mm:ss". Accepts text ("9:15") or Excel serial datetimes. */
export function parseTime(timeVal: string | number | undefined): string | null {
  if (timeVal === undefined || timeVal === null || timeVal === "") return null;
  if (typeof timeVal === "number") {
    const frac = timeVal - Math.floor(timeVal);
    const totalSeconds = Math.round(frac * 86400);
    const hh = Math.floor(totalSeconds / 3600) % 24;
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  const parts = String(timeVal).trim().split(":");
  if (parts.length >= 2) {
    const hh = (parts[0] ?? "").padStart(2, "0");
    const mm = (parts[1] ?? "").padStart(2, "0");
    return `${hh}:${mm}:00`;
  }
  return null;
}

/** Parse "HH:mm:ss" into minutes since midnight. */
export function timeStringToMinutes(timeVal: string): number {
  const parts = timeVal.split(":");
  const hh = parseInt(parts[0] ?? "", 10) || 0;
  const mm = parseInt(parts[1] ?? "", 10) || 0;
  const ss = parseInt(parts[2] ?? "", 10) || 0;
  return hh * 60 + mm + Math.round(ss / 60);
}

/** Convert worked hours (e.g. "10:55") or an Excel serial into integer minutes. */
export function parseWorkingMinutes(workedHoursStr: string | number | undefined): number {
  if (workedHoursStr === undefined || workedHoursStr === null || workedHoursStr === "") return 0;
  if (typeof workedHoursStr === "number") {
    const frac = workedHoursStr - Math.floor(workedHoursStr);
    return Math.round(frac * 1440);
  }
  const parts = String(workedHoursStr).trim().split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0] ?? "", 10) || 0;
    const mins = parseInt(parts[1] ?? "", 10) || 0;
    return hours * 60 + mins;
  }
  return 0;
}

/** Derive duration from punch times, treating out <= in as an overnight shift. */
export function computeWorkingMinutesFromPunches(
  inTime: string | null,
  outTime: string | null,
): number {
  if (!inTime || !outTime) return 0;
  const inM = timeStringToMinutes(inTime);
  const outM = timeStringToMinutes(outTime);
  let diff = outM - inM;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** Prefer explicit worked-hours from the sheet; fall back to punch-time duration. */
export function resolveWorkingMinutes(
  inTime: string | null,
  outTime: string | null,
  workedHoursRaw: string | number | undefined,
): number {
  const fromSheet = parseWorkingMinutes(workedHoursRaw);
  if (fromSheet > 0) return fromSheet;
  return computeWorkingMinutesFromPunches(inTime, outTime);
}

/**
 * attendance_records enforces punch_out > punch_in (same calendar day).
 * Overnight out-times are stored as NULL; duration is kept in working_minutes.
 */
export function punchOutForRecord(
  inTime: string | null,
  outTime: string | null,
): string | null {
  if (!inTime || !outTime) return outTime;
  if (timeStringToMinutes(outTime) <= timeStringToMinutes(inTime)) return null;
  return outTime;
}

/** Handle Excel serial date numbers or date strings. */
export function parseExcelDate(dateVal: string | number): Date {
  if (typeof dateVal === "number") {
    return new Date((dateVal - 25569) * 86400 * 1000);
  }
  return new Date(dateVal);
}

export function formatDateYmd(dateObj: Date): string {
  return dateObj.toISOString().slice(0, 10);
}

export function deriveAttendanceStatus(workingMinutes: number): AttendanceStatus {
  if (workingMinutes < 4 * 60) return "Absent";
  if (workingMinutes < 8 * 60) return "Half Day";
  return "Present";
}
