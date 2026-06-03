"use client";

import { ChevronDown, Download, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TeamAttendanceResponse } from "@/lib/hrms-client";

type S = "P" | "A" | "L" | "HD" | "W" | "H" | "—";

interface Props {
  data: TeamAttendanceResponse | null;
  loading?: boolean;
  monthLabel?: string;
}

const AVATAR_PALETTE = [
  "#7c3aed",
  "#0f766e",
  "#4338ca",
  "#0369a1",
  "#be185d",
  "#15803d",
  "#b91c1c",
  "#92400e",
  "#1d4ed8",
  "#0d9488",
  "#6d28d9",
  "#b45309",
];

function colorFor(empId: string) {
  let h = 0;
  for (const c of empId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const STYLE: Record<S, { bg: string; color: string; label: string }> = {
  P: { bg: "#16a34a", color: "#fff", label: "P" },
  A: { bg: "#dc2626", color: "#fff", label: "A" },
  L: { bg: "#dc143c", color: "#fff", label: "L" },
  HD: { bg: "#f97316", color: "#fff", label: "HD" },
  W: { bg: "#e2e8f0", color: "#94a3b8", label: "W" },
  H: { bg: "#3b82f6", color: "#fff", label: "H" },
  "—": { bg: "#f9fafb", color: "#d1d5db", label: "—" },
};

function Badge({ s }: { s: S }) {
  const st = STYLE[s];
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold select-none mx-auto"
      style={{ background: st.bg, color: st.color }}
    >
      {st.label}
    </div>
  );
}

function mapStatus(s: string): S {
  switch (s) {
    case "Present":
      return "P";
    case "Absent":
      return "A";
    case "Leave":
      return "L";
    case "Half Day":
      return "HD";
    case "Weekend":
      return "W";
    case "Holiday":
      return "H";
    default:
      return "—";
  }
}

function formatTimeOfDay(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

function formatMinutes(min: number | null | undefined) {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

const STATUS_COLOR: Record<string, string> = {
  Present: "#16a34a",
  Holiday: "#3b82f6",
  Weekend: "#9ca3af",
  Absent: "#dc2626",
  Leave: "#dc143c",
  "Half Day": "#f97316",
  "—": "#9ca3af",
};

interface RowOut {
  date: string;
  punchIn: string;
  punchOut: string;
  workHrs: string;
  lateBy: string;
  earlyExit: string;
  status: string;
}

function detailRow(
  ymd: string,
  rec: TeamAttendanceResponse["records"][number] | undefined,
): RowOut {
  const dash = "—";
  if (rec) {
    return {
      date: ymd,
      punchIn: formatTimeOfDay(rec.punchIn),
      punchOut: formatTimeOfDay(rec.punchOut),
      workHrs: formatMinutes(rec.workingMinutes),
      lateBy: rec.lateByMinutes ? `${rec.lateByMinutes}m` : dash,
      earlyExit: rec.earlyExitMinutes ? `${rec.earlyExitMinutes}m` : dash,
      status: rec.status,
    };
  }
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  if (dow === 0 || dow === 6)
    return { date: ymd, punchIn: dash, punchOut: dash, workHrs: dash, lateBy: dash, earlyExit: dash, status: "Weekend" };
  return { date: ymd, punchIn: dash, punchOut: dash, workHrs: dash, lateBy: dash, earlyExit: dash, status: "—" };
}

function eachDateInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const cur = new Date(start);
  while (cur <= end) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function dayOfMonth(ymd: string) {
  return Number(ymd.slice(8, 10));
}

function DetailSheet({
  member,
  records,
  dates,
  onClose,
}: {
  member: TeamAttendanceResponse["team"][number];
  records: TeamAttendanceResponse["records"];
  dates: string[];
  onClose: () => void;
}) {
  const recByDate = new Map(records.filter((r) => r.employeeId === member.id).map((r) => [r.date, r]));
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.25)" }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 bg-white flex flex-col shadow-2xl" style={{ width: "680px" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
          <h2 className="text-base font-bold text-gray-900">
            Details · {member.firstName} {member.lastName}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} style={{ color: "#6b7280" }} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: colorFor(member.empId) }}
          >
            {initials(member.firstName, member.lastName)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {member.firstName} {member.lastName}
            </p>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              {member.designation ?? "—"} · {member.empId}
            </p>
          </div>
        </div>

        <div className="px-6 border-b" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex">
            <span className="py-3 text-sm font-semibold" style={{ color: "#dc143c", borderBottom: "2px solid #dc143c" }}>
              Attendance Data
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["DAY", "PUNCH IN", "PUNCH OUT", "WORKING HRS", "LATE BY", "EARLY EXIT", "STATUS"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider"
                    style={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => {
                const row = detailRow(d, recByDate.get(d));
                return (
                  <tr key={d} className="border-t" style={{ borderColor: "#f3f4f6" }}>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{d}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{row.punchIn}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{row.punchOut}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{row.workHrs}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{row.lateBy}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{row.earlyExit}</td>
                    <td
                      className="px-4 py-2.5 text-sm font-medium"
                      style={{ color: STATUS_COLOR[row.status] ?? "#374151" }}
                    >
                      {row.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function TeamAttendanceReport({ data, loading, monthLabel }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-xl p-10 border text-center text-sm" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
        Loading team report…
      </div>
    );
  }

  const dates = eachDateInRange(data.from, data.to);
  const todayYmd = new Date().toISOString().slice(0, 10);
  const TODAY_DAY = todayYmd >= data.from && todayYmd <= data.to ? dayOfMonth(todayYmd) : -1;

  // Build cell index
  const cellStatus = new Map<number, Map<string, S>>();
  for (const m of data.team) cellStatus.set(m.id, new Map());
  for (const r of data.records) {
    const m = cellStatus.get(r.employeeId);
    if (m) m.set(r.date, mapStatus(r.status));
  }
  function statusFor(empId: number, ymd: string): S {
    const s = cellStatus.get(empId)?.get(ymd);
    if (s) return s;
    const [y, mo, d] = ymd.split("-").map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    if (dow === 0 || dow === 6) return "W";
    return "—";
  }

  const selectedMember = data.team.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Attendance – Full Report</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            {monthLabel ?? `${data.from} → ${data.to}`} · {data.team.length} members
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#d1d5db", color: "#374151" }}
          >
            ← Back
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#d1d5db", color: "#374151" }}
          >
            All Members <ChevronDown size={14} />
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-red-50"
            style={{ borderColor: "#dc143c", color: "#dc143c" }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: "1400px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th
                  className="text-left px-4 py-3 text-[11px] font-semibold tracking-wider sticky left-0 z-10"
                  style={{
                    color: "#6b7280",
                    background: "#f8fafc",
                    minWidth: "220px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  EMPLOYEE
                </th>
                {dates.map((d) => {
                  const day = dayOfMonth(d);
                  return (
                    <th
                      key={d}
                      className="py-3 text-[11px] font-semibold text-center"
                      style={{
                        color: day === TODAY_DAY ? "#dc143c" : "#9ca3af",
                        minWidth: "36px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.team.map((m, ri) => (
                <tr
                  key={m.id}
                  className="border-t"
                  style={{ borderColor: "#f1f5f9", background: ri % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td
                    className="px-4 py-3 sticky left-0 z-10"
                    style={{
                      background: ri % 2 === 0 ? "#fff" : "#fafafa",
                      borderRight: "1px solid #f1f5f9",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: colorFor(m.empId) }}
                      >
                        {initials(m.firstName, m.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-xs leading-tight" style={{ color: "#9ca3af" }}>
                          {m.designation ?? "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedId(m.id)}
                        className="ml-1 px-2 py-0.5 text-xs rounded-md border shrink-0 transition-colors hover:bg-gray-50"
                        style={{ borderColor: "#d1d5db", color: "#6b7280" }}
                      >
                        Details
                      </button>
                    </div>
                  </td>
                  {dates.map((d) => (
                    <td key={d} className="py-2.5 px-0.5 text-center">
                      <div className="flex justify-center">
                        <Badge s={statusFor(m.id, d)} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <DetailSheet
          member={selectedMember}
          records={data.records}
          dates={dates}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
