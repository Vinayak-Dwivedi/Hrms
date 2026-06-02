"use client";

import { Check, Send, SlidersHorizontal } from "lucide-react";
import type { TeamAttendanceResponse } from "@/lib/hrms-client";

type AttCellStatus = "P" | "A" | "L" | "HD" | "W" | "—";

interface Props {
  data: TeamAttendanceResponse | null;
  loading?: boolean;
  pendingApprovals?: number;
  managerName?: string;
  managerRole?: string;
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

function mapStatus(s: string): AttCellStatus {
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
      return "W";
    default:
      return "—";
  }
}

const STATUS_STYLE: Record<AttCellStatus, { bg: string; color: string; label: string }> = {
  P: { bg: "#16a34a", color: "#fff", label: "P" },
  A: { bg: "#dc2626", color: "#fff", label: "A" },
  L: { bg: "#dc143c", color: "#fff", label: "L" },
  HD: { bg: "#f97316", color: "#fff", label: "HD" },
  W: { bg: "#e5e7eb", color: "#9ca3af", label: "W" },
  "—": { bg: "#f9fafb", color: "#d1d5db", label: "—" },
};

function StatusBadge({ status }: { status: AttCellStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold select-none"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </div>
  );
}

function RingProgress({ pct }: { pct: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="#dc143c"
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827">
        {pct}%
      </text>
    </svg>
  );
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

function labelForDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const mon = dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${mon} ${String(d).padStart(2, "0")}`;
}

export default function TeamDashboard({
  data,
  loading,
  pendingApprovals,
  managerName = "Manager",
  managerRole = "Process Manager",
}: Props) {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-xl p-10 border text-center text-sm" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
        Loading team data…
      </div>
    );
  }

  const dates = eachDateInRange(data.from, data.to);
  const todayYmd = new Date().toISOString().slice(0, 10);

  // Build index: employeeId → date → status
  const cellStatus = new Map<number, Map<string, AttCellStatus>>();
  for (const member of data.team) cellStatus.set(member.id, new Map());
  for (const rec of data.records) {
    const m = cellStatus.get(rec.employeeId);
    if (m) m.set(rec.date, mapStatus(rec.status));
  }
  // Fill in weekends and missing days
  function statusFor(empId: number, ymd: string): AttCellStatus {
    const m = cellStatus.get(empId);
    const s = m?.get(ymd);
    if (s) return s;
    const [y, mo, d] = ymd.split("-").map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    if (dow === 0 || dow === 6) return "W";
    return ymd > todayYmd ? "—" : "—";
  }

  // Stats
  const todayCounts = data.team.reduce(
    (acc, m) => {
      const s = statusFor(m.id, todayYmd);
      if (s === "P" || s === "HD") acc.present++;
      else if (s === "L") acc.leave++;
      return acc;
    },
    { present: 0, leave: 0 },
  );
  const teamSize = data.team.length;
  let presentCells = 0;
  let workdayCells = 0;
  for (const ymd of dates) {
    const [y, mo, d] = ymd.split("-").map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    if (ymd > todayYmd) continue;
    for (const m of data.team) {
      workdayCells++;
      const s = statusFor(m.id, ymd);
      if (s === "P" || s === "HD") presentCells++;
    }
  }
  const avgPct = workdayCells > 0 ? Math.round((presentCells / workdayCells) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Team &nbsp;·&nbsp; {teamSize} {teamSize === 1 ? "Member" : "Members"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            <span className="font-semibold" style={{ color: "#dc143c" }}>
              {managerName}
            </span>
            {` · ${managerRole}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#d1d5db", color: "#374151" }}
          >
            <SlidersHorizontal size={14} /> Filter
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-red-50"
            style={{ borderColor: "#dc143c", color: "#dc143c" }}
          >
            <Send size={14} /> Notify Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6b7280" }}>
              TEAM PRESENT TODAY
            </span>
            <Check size={16} style={{ color: "#16a34a" }} />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {todayCounts.present} / {teamSize}
          </p>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            On floor
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6b7280" }}>
              ON LEAVE TODAY
            </span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#dc2626", display: "inline-block" }} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{todayCounts.leave}</p>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            Approved leaves
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6b7280" }}>
              PENDING APPROVALS
            </span>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "#f59e0b" }}
            >
              !
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pendingApprovals ?? 0}</p>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            Leave + regularisation
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6b7280" }}>
              AVG ATTENDANCE
            </span>
            <RingProgress pct={avgPct} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgPct}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Team Attendance — {dates.length} day{dates.length === 1 ? "" : "s"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
              {data.from} → {data.to}
            </p>
          </div>
          <a href="/manager/team-attendance-report" className="text-sm font-medium no-underline" style={{ color: "#dc143c" }}>
            View full report →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th
                  className="text-left px-6 py-3 text-[11px] font-semibold tracking-wider"
                  style={{ color: "#6b7280", width: "220px" }}
                >
                  EMPLOYEE
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="px-3 py-3 text-[11px] font-semibold tracking-wider text-center"
                    style={{ color: d === todayYmd ? "#dc143c" : "#6b7280" }}
                  >
                    {labelForDate(d)}
                    {d === todayYmd ? " ·" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.team.map((m) => (
                <tr key={m.id} className="border-t" style={{ borderColor: "#f3f4f6" }}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: colorFor(m.empId) }}
                      >
                        {initials(m.firstName, m.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-xs" style={{ color: "#9ca3af" }}>
                          {m.designation ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  {dates.map((d) => (
                    <td key={d} className="px-3 py-3 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={statusFor(m.id, d)} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
