"use client";

import { useMemo, useState } from "react";
import type { AttendanceStatus, DayAttendance } from "@/lib/dashboard";
import { enterpriseCardTitleClass } from "@/lib/branding";

interface Props {
  data: DayAttendance[];
  year: number;
  month0: number; // 0-based
  shiftLabel?: string; // e.g. "General [ 9:00 AM – 6:00 PM ]"
}

// ─── helpers ────────────────────────────────────────────────────────────────

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eachDayInMonth(year: number, month0: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month0 + 1, 0).getDate();
  for (let d = 1; d <= last; d++) days.push(new Date(year, month0, d));
  return days;
}

function formatRowDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatHours(s?: string): string {
  if (!s) return "—";
  return s;
}

// "8h 30m" / "0h 0m" → minutes
function hmToMinutes(s?: string): number {
  if (!s) return 0;
  const m = s.match(/(\d+)\s*h\s*(\d+)\s*m/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToHm(mins: number): string {
  if (mins <= 0) return "00:00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type StatusVisual = {
  label: string;
  dot: string;
  text: string;
};

function statusVisual(s: AttendanceStatus): StatusVisual {
  switch (s) {
    case "Present":
      return { label: "Present", dot: "bg-emerald-500", text: "text-gray-700" };
    case "HalfDay":
      return { label: "Half Day", dot: "bg-orange-500", text: "text-gray-700" };
    case "Absent":
      return { label: "Absent", dot: "bg-red-500", text: "text-slate-700" };
    case "Leave":
      return { label: "Leave", dot: "bg-blue-500", text: "text-gray-700" };
    case "LeavePending":
      return {
        label: "Leave (pending)",
        dot: "bg-amber-400",
        text: "text-gray-700",
      };
    case "Holiday":
      return { label: "Holiday", dot: "bg-violet-500", text: "text-gray-700" };
    case "Weekend":
      return { label: "Weekend", dot: "bg-gray-300", text: "text-gray-500" };
    default:
      return { label: "—", dot: "bg-gray-200", text: "text-gray-400" };
  }
}

// ─── stat tile (Days / Hours footer) ───────────────────────────────────────

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string; // tailwind text-* class for the value
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold tracking-wider text-gray-400">
        {label.toUpperCase()}
      </span>
      <span className={`text-[14px] font-bold ${accent}`}>{value}</span>
    </div>
  );
}

// ─── main ──────────────────────────────────────────────────────────────────

export default function AttendanceTable({
  data,
  year,
  month0,
  shiftLabel = "General [ 9:00 AM – 6:00 PM ]",
}: Props) {
  const [unit, setUnit] = useState<"Days" | "Hours">("Days");
  const monthLabel = new Date(year, month0).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Map records by date for fast lookup
  const recordsByDate = useMemo(() => {
    const m = new Map<string, DayAttendance>();
    for (const d of data) m.set(d.date, d);
    return m;
  }, [data]);

  // Build a row per day of the month
  const today = new Date();
  const todayKey = ymd(today);
  const rows = useMemo(() => {
    return eachDayInMonth(year, month0).map((d) => {
      const k = ymd(d);
      const rec = recordsByDate.get(k);

      let status: AttendanceStatus;
      if (rec) status = rec.status;
      else if (k > todayKey) status = "Future";
      else status = "Absent";

      return {
        date: d,
        key: k,
        status,
        punchIn: rec?.punchIn ?? null,
        punchOut: rec?.punchOut ?? null,
        hoursWorked: rec?.hoursWorked,
      };
    });
  }, [year, month0, recordsByDate, todayKey]);

  // Aggregates for the footer strip
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let holidayCount = 0;
  let weekendCount = 0;
  let workedMinutes = 0;
  for (const r of rows) {
    if (r.status === "Future") continue;
    if (r.status === "Present") presentCount += 1;
    else if (r.status === "HalfDay") presentCount += 0.5;
    else if (r.status === "Absent") absentCount += 1;
    else if (r.status === "Leave" || r.status === "LeavePending") leaveCount += 1;
    else if (r.status === "Holiday") holidayCount += 1;
    else if (r.status === "Weekend") weekendCount += 1;
    workedMinutes += hmToMinutes(r.hoursWorked);
  }
  const payableDays = presentCount + leaveCount + holidayCount;
  const onDutyDays = presentCount;
  const paidLeaveDays = leaveCount;
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={enterpriseCardTitleClass}>
          Attendance Summary
        </h3>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-[12px] font-medium text-slate-700">
          {monthLabel}
        </div>
      </div>

      {/* Table — scrolls inside its container so the card height stays fixed */}
      <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-md">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200">
              {[
                "Date",
                "First In",
                "Last Out",
                "Total Hours",
                "Status",
                "Regularization",
              ].map((c) => (
                <th
                  key={c}
                  className="text-left py-2.5 px-3 text-[10px] font-bold tracking-wider text-gray-500"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = statusVisual(r.status);
              const isFuture = r.status === "Future";
              const dim = isFuture ? "opacity-50" : "";
              const payable =
                r.status === "Present" ||
                r.status === "Leave" ||
                r.status === "LeavePending" ||
                r.status === "Holiday"
                  ? "08:00"
                  : r.status === "HalfDay"
                    ? "04:00"
                    : "—";
              return (
                <tr
                  key={r.key}
                  className={`border-b border-gray-100 ${dim}`}
                >
                  <td className="py-2.5 px-3 text-[12px] text-gray-800 whitespace-nowrap">
                    {formatRowDate(r.date)}
                  </td>
                  <td className="py-2.5 px-3 text-[12px] text-gray-600 whitespace-nowrap">
                    {r.punchIn ?? "—"}
                  </td>
                  <td className="py-2.5 px-3 text-[12px] text-gray-600 whitespace-nowrap">
                    {r.punchOut ?? "—"}
                  </td>
                  <td className="py-2.5 px-3 text-[12px] text-gray-600 whitespace-nowrap">
                    {formatHours(r.hoursWorked)}
                  </td>
                  
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${v.dot}`}
                      />
                      <span className={`text-[12px] ${v.text}`}>
                        {v.label}
                      </span>
                    </span>
                  </td>
              
                  <td className="py-2.5 px-3 text-[12px] text-gray-400 whitespace-nowrap">
                    {r.status === "Absent" ||
                    r.status === "HalfDay" ||
                    r.status === "LeavePending"
                      ? "Apply →"
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

     
    </div>
  );
}
