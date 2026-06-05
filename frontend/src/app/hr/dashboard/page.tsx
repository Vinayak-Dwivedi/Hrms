"use client";

import {
  CalendarPlus,
  Clock,
  FileText,
  GraduationCap,
  History,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  LeaveType,
} from "@/lib/dashboard";
import {
  fetchCurrentEmployee,
  fetchMyLeaveBalances,
  fetchMyLeaveRequests,
  fetchTodayAttendance,
  fetchUpcomingHolidays,
  fetchWeekAttendance,
  punchIn,
  punchOut,
  type UpcomingHoliday,
  type WeekAttendance,
} from "@/lib/hrms-client";

// ─── primitives ─────────────────────────────────────────────────────────────

function Avatar({
  initials,
  size = 64,
  src,
}: {
  initials: string;
  size?: number;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: showImg
          ? "#fff"
          : "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)",
        border: "2px solid rgba(255,255,255,0.3)",
        fontSize: Math.max(14, Math.round(size * 0.32)),
        letterSpacing: 0.5,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function Ring({
  used,
  total,
  size = 84,
}: {
  used: number;
  total: number;
  size?: number;
}) {
  const stroke = 4;
  const r = size / 2 - stroke / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? used / total : 0;
  const dash = pct * c;
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#dc143c"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#111827",
          letterSpacing: -0.2,
        }}
      >
        {used}/{total}
      </div>
    </div>
  );
}

function Donut({
  segments,
  size = 180,
  center,
}: {
  segments: Array<{ value: number; color: string }>;
  size?: number;
  center: { label: string; sub: string };
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size * 0.4;
  const stroke = size * 0.16;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const dasharray = `${len} ${c - len}`;
            const dashoffset = -offset;
            offset += len;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
          {center.label}
        </p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
          {center.sub}
        </p>
      </div>
    </div>
  );
}

// Weekly attendance line chart — Present (blue) / Absent (green) / On Leave (yellow).
function WeekChart({ week }: { week: WeekAttendance }) {
  const w = 600;
  const h = 170;
  const padL = 36;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const yMax = 1200;

  function path(values: number[]) {
    if (!values.length) return "";
    const xStep = (w - padL - padR) / Math.max(1, values.length - 1);
    return values
      .map((v, i) => {
        const x = padL + i * xStep;
        const clamped = Math.min(Math.max(v, 0), yMax);
        const y = padT + (h - padT - padB) * (1 - clamped / yMax);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const present = week.days.map((d) =>
    d.record?.status === "Present" ? (d.record.workingMinutes ?? 0) : 0,
  );
  const absent = week.days.map((d) =>
    d.record?.status === "Absent" ? 480 : 0,
  );
  const onLeave = week.days.map((d) =>
    d.record?.status === "Leave" ? 480 : 0,
  );

  const xStep = (w - padL - padR) / Math.max(1, week.days.length - 1);
  const yLabels = [0, 200, 400, 600, 800, 1000, 1200];

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block" }}
    >
      {/* y grid + labels */}
      {yLabels.map((g) => {
        const y = padT + (h - padT - padB) * (1 - g / yMax);
        return (
          <g key={g}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y + 3}
              fontSize={9}
              fill="#9ca3af"
              textAnchor="end"
            >
              {g >= 1000 ? `${(g / 1000).toFixed(1)}k` : g}
            </text>
          </g>
        );
      })}
      {/* x labels */}
      {week.days.map((d, i) => {
        const x = padL + i * xStep;
        return (
          <text
            key={d.date}
            x={x}
            y={h - 8}
            fontSize={10}
            textAnchor="middle"
            fill="#9ca3af"
          >
            {d.dayLabel}
          </text>
        );
      })}
      {/* series */}
      <path d={path(present)} stroke="#3b82f6" strokeWidth={2.5} fill="none" />
      <path d={path(absent)} stroke="#10b981" strokeWidth={2.5} fill="none" />
      <path d={path(onLeave)} stroke="#f59e0b" strokeWidth={2.5} fill="none" />
    </svg>
  );
}

// ─── format helpers ─────────────────────────────────────────────────────────

function formatTimeLong(t: string | null | undefined): string {
  if (!t) return "--:--";
  return t;
}

function formatDateMonthDay(iso: string): {
  month: string;
  day: string;
  year: string;
} {
  const d = new Date(`${iso}T00:00:00`);
  const month = d.toLocaleString(undefined, { month: "short" }).toUpperCase();
  const day = String(d.getDate());
  const year = String(d.getFullYear());
  return { month, day, year };
}

function statusPill(status: LeaveRequest["status"]): {
  bg: string;
  color: string;
  label: string;
} {
  switch (status) {
    case "Approved":
      return { bg: "#dcfce7", color: "#166534", label: "Approved" };
    case "Rejected":
      return { bg: "#fee2e2", color: "#991b1b", label: "Rejected" };
    case "Cancelled":
      return { bg: "#f3f4f6", color: "#6b7280", label: "Cancelled" };
    default:
      return { bg: "#ffedd5", color: "#9a3412", label: "Pending" };
  }
}

function fmtHm(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m}m`;
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function HRDashboardPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [balances, setBalances] = useState<LeaveType[] | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[] | null>(null);
  const [holidays, setHolidays] = useState<UpcomingHoliday[] | null>(null);
  const [week, setWeek] = useState<WeekAttendance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [punchBusy, setPunchBusy] = useState(false);

  async function reload() {
    try {
      const [emp, att, bal, leaves, hol, wk] = await Promise.all([
        fetchCurrentEmployee(),
        fetchTodayAttendance(),
        fetchMyLeaveBalances(),
        fetchMyLeaveRequests(),
        fetchUpcomingHolidays(5),
        fetchWeekAttendance(),
      ]);
      setEmployee(emp);
      setAttendance(att);
      setBalances(bal);
      setRecentLeaves(leaves);
      setHolidays(hol);
      setWeek(wk);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePunchToggle() {
    if (punchBusy || !attendance) return;
    setPunchBusy(true);
    setLoadError(null);
    try {
      const next = attendance.punchIn ? await punchOut() : await punchIn();
      setAttendance(next);
      fetchWeekAttendance()
        .then(setWeek)
        .catch(() => {});
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setPunchBusy(false);
    }
  }

  const totalLeaves = (balances ?? []).reduce((s, l) => s + l.total, 0);
  const usedLeaves = (balances ?? []).reduce((s, l) => s + l.used, 0);
  const balLeaves = totalLeaves - usedLeaves;

  const PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  const usedByType = (balances ?? []).map((b, i) => ({
    label: b.name,
    value: b.used,
    color: PALETTE[i % PALETTE.length] ?? "#9ca3af",
  }));
  const usedTotal = usedByType.reduce((s, x) => s + x.value, 0);

  const initials = employee?.initials ?? "··";

  const totalMins = week?.totals.totalWorkingMinutes ?? 0;
  const presentMins = totalMins;
  const absentMins = (week?.totals.absent ?? 0) * 540;
  const onLeaveMins = (week?.totals.onLeave ?? 0) * 540;
  const lateMins =
    week?.days.reduce((s, d) => s + (d.record?.lateByMinutes ?? 0), 0) ?? 0;

  return (
    <>
      {loadError && (
        <div
          className="mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Failed to load HRMS data: {loadError}
        </div>
      )}

      {/* Row 1 — Punch hero | Leave Balance | Upcoming Holidays */}
      <div
        className="grid gap-4 mb-4"
        style={{
          gridTemplateColumns:
            "minmax(0,2.2fr) minmax(0,1.7fr) minmax(0,1.1fr)",
        }}
      >
        {/* Punch hero card */}
        <div
          className="relative rounded-2xl overflow-hidden text-white"
          style={{
            background: "linear-gradient(135deg, #9b1747 0%, #6b0f30 100%)",
          }}
        >
          <button
            type="button"
            onClick={handlePunchToggle}
            disabled={punchBusy || !attendance}
            className="absolute top-3 right-3 px-3 py-1 rounded-lg text-[11px] font-bold"
            style={{
              border: "1px solid rgba(255,255,255,0.45)",
              background: "rgba(0,0,0,0.18)",
              color: "#fff",
              cursor: punchBusy || !attendance ? "not-allowed" : "pointer",
              opacity: punchBusy || !attendance ? 0.6 : 1,
              zIndex: 1,
            }}
          >
            {punchBusy ? "…" : attendance?.punchIn ? "Punch Out" : "Punch In"}
          </button>

          <div className="flex items-stretch px-5 py-4 gap-4">
            <div className="flex flex-col items-center shrink-0 gap-2">
              <Avatar initials={initials} size={84} src={employee?.avatarUrl} />
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: "rgba(0,0,0,0.28)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: attendance?.punchIn ? "#4ade80" : "#9ca3af",
                  }}
                />
                {attendance?.punchIn ? "Checked In" : "Checked Out"}
              </span>
            </div>

            <div className="flex flex-col justify-center flex-1 min-w-0">
              <p
                className="text-[18px] font-bold leading-tight"
                style={{ wordBreak: "break-word" }}
              >
                {employee?.name ?? "Loading…"}
              </p>
              <p
                className="text-[12px] mt-0.5 leading-tight"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                {employee?.role ?? ""}
              </p>
              {employee?.employeeId && (
                <div
                  className="inline-block self-start mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: "rgba(0,0,0,0.28)",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {employee.employeeId}
                </div>
              )}
            </div>

            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "rgba(255,255,255,0.15)",
              }}
            />

            <div
              className="flex flex-col justify-center shrink-0"
              style={{ minWidth: 88 }}
            >
              <p
                className="text-[10px] font-bold tracking-widest"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                PUNCH IN
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock size={13} style={{ color: "#4ade80" }} />
                <p className="text-[15px] font-bold whitespace-nowrap">
                  {formatTimeLong(attendance?.punchIn)}
                </p>
              </div>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {attendance?.punchIn ? "Today" : "Not punched in"}
              </p>
            </div>

            <div
              className="flex flex-col justify-center shrink-0"
              style={{ minWidth: 100, paddingRight: 88 }}
            >
              <p
                className="text-[10px] font-bold tracking-widest"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                PUNCH OUT
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock size={13} style={{ color: "rgba(255,255,255,0.45)" }} />
                <p
                  className="text-[15px] font-bold whitespace-nowrap"
                  style={{
                    color: attendance?.punchOut
                      ? "#fff"
                      : "rgba(255,255,255,0.7)",
                  }}
                >
                  {attendance?.punchOut ?? "--:--"}
                </p>
              </div>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {attendance?.punchOut ? "Today" : "Not punched out"}
              </p>
            </div>
          </div>
        </div>

        {/* Leave Balance */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Leave Balance
            </h3>
            <a
              href="/hr/leave"
              className="text-[12px] font-medium no-underline"
              style={{ color: "#dc143c" }}
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Total Leaves",
                used: totalLeaves,
                total: totalLeaves,
                days: totalLeaves,
                code: "TOT",
              },
              {
                label: "Used Leaves",
                used: usedLeaves,
                total: totalLeaves,
                days: usedLeaves,
                code: "USD",
              },
              {
                label: "Balance Leaves",
                used: balLeaves,
                total: totalLeaves,
                days: balLeaves,
                code: "BAL",
              },
            ].map((item) => (
              <div
                key={item.code}
                className="flex flex-col items-center text-center"
              >
                <Ring used={item.used} total={item.total} size={84} />
                <p className="text-[11px] font-semibold text-gray-800 mt-2 leading-tight">
                  {item.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>
                  {item.days} days
                </p>
                <span
                  className="mt-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}
                >
                  {item.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Upcoming Holidays
            </h3>
            <a
              href="/hr/leave"
              className="text-[12px] font-medium no-underline"
              style={{ color: "#dc143c" }}
            >
              All →
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            {holidays === null && (
              <p className="text-[11px]" style={{ color: "#9ca3af" }}>
                Loading…
              </p>
            )}
            {holidays !== null && holidays.length === 0 && (
              <p className="text-[11px]" style={{ color: "#9ca3af" }}>
                No upcoming holidays.
              </p>
            )}
            {holidays?.slice(0, 2).map((h) => {
              const { month, day, year } = formatDateMonthDay(h.date);
              const typeColor =
                h.type === "National"
                  ? { bg: "#dbeafe", color: "#1d4ed8" }
                  : h.type === "Regional"
                    ? { bg: "#dcfce7", color: "#15803d" }
                    : { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #f3f4f6",
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center rounded-lg text-center shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      className="text-[9px] font-bold"
                      style={{ color: "#dc143c" }}
                    >
                      {month}
                    </p>
                    <p className="text-[15px] font-bold text-gray-900 leading-none">
                      {day}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                      {h.name}
                    </p>
                    <p className="text-[10px]" style={{ color: "#9ca3af" }}>
                      {year}
                    </p>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: typeColor.bg,
                      color: typeColor.color,
                    }}
                  >
                    {h.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2 — Attendance Overview | Leave Distribution | Quick Links */}
      <div
        className="grid gap-4 mb-4"
        style={{
          gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1.4fr) minmax(0,1fr)",
        }}
      >
        {/* Attendance Overview */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Employee Attendance Overview
            </h3>
            <button
              type="button"
              className="text-[11px] font-semibold rounded px-2 py-1 flex items-center gap-1"
              style={{
                background: "#fff1f2",
                color: "#be185d",
                border: "1px solid #fecdd3",
              }}
            >
              Today ▾
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg p-2" style={{ background: "#f9fafb" }}>
              <p
                className="text-[9px] font-bold tracking-wider"
                style={{ color: "#9ca3af" }}
              >
                TOTAL
              </p>
              <p
                className="text-[16px] font-bold leading-tight mt-0.5"
                style={{ color: "#111827" }}
              >
                {fmtHm(totalMins)}
              </p>
              <p className="text-[10px]" style={{ color: "#9ca3af" }}>
                Working Hours Today
              </p>
              <p className="text-[10px]" style={{ color: "#9ca3af" }}>
                Shift: 9:00 - 6:00
              </p>
            </div>
            {[
              { label: "PRESENT", value: presentMins, color: "#3b82f6" },
              { label: "ABSENT", value: absentMins, color: "#10b981" },
              { label: "ON LEAVE", value: onLeaveMins, color: "#f59e0b" },
              { label: "LATE ARRIVALS", value: lateMins, color: "#8b5cf6" },
            ].map((it) => (
              <div
                key={it.label}
                className="rounded-lg p-2"
                style={{ background: "#f9fafb" }}
              >
                <p
                  className="text-[9px] font-bold tracking-wider"
                  style={{ color: "#9ca3af" }}
                >
                  {it.label}
                </p>
                <p
                  className="text-[16px] font-bold leading-tight mt-0.5"
                  style={{ color: it.color }}
                >
                  {fmtHm(it.value)}
                </p>
              </div>
            ))}
          </div>

          {week ? (
            <WeekChart week={week} />
          ) : (
            <p
              className="text-center text-[11px] py-8"
              style={{ color: "#9ca3af" }}
            >
              Loading weekly attendance…
            </p>
          )}

          <div className="flex items-center justify-center gap-5 mt-2">
            {[
              { label: "Present", color: "#3b82f6" },
              { label: "Absent", color: "#10b981" },
              { label: "On Leave", color: "#f59e0b" },
            ].map((l) => (
              <div
                key={l.label}
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: "#6b7280" }}
              >
                <span
                  style={{
                    width: 18,
                    height: 2,
                    background: l.color,
                    display: "inline-block",
                  }}
                />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Leave Distribution */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Leave Distribution
            </h3>
            <button
              type="button"
              onClick={reload}
              className="rounded-full p-1.5"
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
              aria-label="Refresh"
            >
              <RefreshCw size={13} style={{ color: "#6b7280" }} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Donut
              size={200}
              segments={
                usedTotal > 0 ? usedByType : [{ value: 1, color: "#e5e7eb" }]
              }
              center={{
                label: usedTotal > 0 ? String(usedTotal) : "0",
                sub: "Total",
              }}
            />
            <div className="flex-1 min-w-0">
              {usedByType.length === 0 && (
                <p className="text-[11px]" style={{ color: "#9ca3af" }}>
                  Loading balances…
                </p>
              )}
              {usedByType.map((s) => {
                const pct =
                  usedTotal > 0
                    ? ((s.value / usedTotal) * 100).toFixed(1)
                    : "0.0";
                return (
                  <div
                    key={s.label}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 9,
                          height: 9,
                          background: s.color,
                        }}
                      />
                      <span className="text-[12px] text-gray-700 truncate">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-[12px] text-gray-500 font-medium tabular-nums">
                      {s.value}{" "}
                      <span style={{ color: "#9ca3af" }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {[
              { icon: CalendarPlus, label: "Apply Leave", href: "/hr/leave" },
              { icon: FileText, label: "My Requests", href: "/hr/leave" },
              { icon: Wallet, label: "My Payslips", href: "/hr/dashboard" },
              { icon: History, label: "Punch History", href: "/hr/attendance" },
              {
                icon: Users,
                label: "Company Directory",
                href: "/hr/dashboard",
              },
              {
                icon: GraduationCap,
                label: "L&D Portal",
                href: "/hr/dashboard",
              },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="flex flex-col items-center text-center no-underline"
                style={{ color: "#111827" }}
              >
                <span
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: 56,
                    height: 56,
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                  }}
                >
                  <Icon size={22} style={{ color: "#e91e8c" }} />
                </span>
                <p
                  className="text-[11px] font-semibold mt-2 leading-tight"
                  style={{ color: "#111827" }}
                >
                  {label}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — Recent Leave Requests (full-width table) */}
      <div
        className="rounded-2xl bg-white p-5"
        style={{ border: "1px solid #e5e7eb" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-gray-900">
            Recent Leave Requests
          </h3>
          <a
            href="/hr/leave"
            className="text-[12px] font-medium no-underline"
            style={{ color: "#dc143c" }}
          >
            View all →
          </a>
        </div>

        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              {["LEAVE TYPE", "FROM", "DAYS", "STATUS"].map((c) => (
                <th
                  key={c}
                  className="text-left py-2 text-[10px] font-bold tracking-wider"
                  style={{ color: "#9ca3af" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentLeaves === null && (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-[12px]"
                  style={{ color: "#9ca3af" }}
                >
                  Loading…
                </td>
              </tr>
            )}
            {recentLeaves !== null && recentLeaves.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-[12px]"
                  style={{ color: "#9ca3af" }}
                >
                  No leave requests yet.
                </td>
              </tr>
            )}
            {recentLeaves?.slice(0, 5).map((req) => {
              const pill = statusPill(req.status);
              return (
                <tr key={req.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="py-2.5 text-[13px] text-gray-800">
                    {req.leaveType}
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-600">
                    {new Date(`${req.startDate}T00:00:00`).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-600">
                    {req.duration}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="px-2.5 py-0.5 text-[10px] font-bold rounded"
                      style={{ background: pill.bg, color: pill.color }}
                    >
                      {pill.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
