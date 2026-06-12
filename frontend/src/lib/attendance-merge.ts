import type { DayAttendance, LeaveRequest } from "@/lib/dashboard";
import type { UpcomingHoliday } from "@/lib/hrms-client";

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const NON_LEAVE_STATUSES = new Set<DayAttendance["status"]>([
  "Holiday",
  "Weekend",
  "Present",
  "HalfDay",
]);

export function mergeHolidaysIntoDays(
  attendance: DayAttendance[],
  holidays: UpcomingHoliday[],
): DayAttendance[] {
  const map = new Map<string, DayAttendance>(
    attendance.map((d) => [d.date, d]),
  );
  for (const h of holidays) {
    const existing = map.get(h.date);
    if (existing && NON_LEAVE_STATUSES.has(existing.status)) continue;
    map.set(h.date, {
      ...existing,
      date: h.date,
      status: "Holiday",
      holidayName: h.name,
    });
  }
  return Array.from(map.values());
}

export function mergeLeavesIntoDays(
  attendance: DayAttendance[],
  leaves: LeaveRequest[],
  monthStart: Date,
  monthEnd: Date,
): DayAttendance[] {
  const map = new Map<string, DayAttendance>(
    attendance.map((d) => [d.date, d]),
  );
  const ranked = [...leaves]
    .filter((lr) => lr.status === "Pending" || lr.status === "Approved")
    .sort(
      (a, b) =>
        (a.status === "Approved" ? 1 : 0) - (b.status === "Approved" ? 1 : 0),
    );
  for (const lr of ranked) {
    const start = new Date(lr.startDate);
    const end = new Date(lr.endDate);
    const lower = start < monthStart ? monthStart : start;
    const upper = end > monthEnd ? monthEnd : end;
    const cur = new Date(lower);
    while (cur <= upper) {
      const key = ymd(cur);
      const existing = map.get(key);
      if (existing && NON_LEAVE_STATUSES.has(existing.status)) {
        cur.setDate(cur.getDate() + 1);
        continue;
      }
      map.set(key, {
        date: key,
        status: lr.status === "Approved" ? "Leave" : "LeavePending",
        leaveType: lr.leaveType,
      });
      cur.setDate(cur.getDate() + 1);
    }
  }
  return Array.from(map.values());
}

export function countLeaveDays(
  from: string,
  to: string,
  holidayDates: ReadonlySet<string>,
): number {
  if (!from || !to) return 0;
  const s = new Date(from);
  const e = new Date(to);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (!holidayDates.has(ymd(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function holidayDateSet(
  holidays: ReadonlyArray<{ date: string }>,
): Set<string> {
  return new Set(holidays.map((h) => h.date));
}
