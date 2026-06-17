"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import HrDashboardSection, {
  type HrDashboardData,
} from "@/components/dashboard/HrDashboardSection";
import type {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  LeaveType,
} from "@/lib/dashboard";
import type { Role } from "@/lib/roles";
import {
  dashboardModulesFor,
  quickLinksFor,
} from "@/lib/role-config";
import { useAuth } from "@/lib/auth-context";
import { fetchEmployees } from "@/features/employees/api/employees.client";
import {
  fetchCompletionStats,
  fetchPendingReviewEmployees,
  type PendingReviewEmployee,
} from "@/features/employees/api/hr-onboarding.client";
import { EmployeeEmailSummary } from "@/features/employees/components/EmployeeEmailStatus";
import {
  enterpriseAccentTextClass,
  enterpriseAvatarClass,
  enterpriseBtnGhostClass,
  enterpriseCardClass,
  enterpriseCardTitleClass,
  enterpriseChipActiveClass,
  enterpriseChipClass,
  enterpriseIconTileClass,
  enterpriseLinkClass,
  enterpriseMutedPanelClass,
} from "@/lib/branding";
import {
  employeeErrorBannerClass,
} from "@/features/employees/employee-theme";
import {
  type ApprovalLeaveRequest,
  type AttendanceWindow,
  fetchCurrentEmployee,
  fetchCurrentManager,
  fetchLeaveApprovals,
  fetchManagerLeaveBalances,
  fetchManagerTodayAttendance,
  fetchMyLeaveBalances,
  fetchMyLeaveRequests,
  fetchOrgLeaveRequests,
  fetchTodayAttendance,
  fetchUpcomingHolidays,
  fetchWeekAttendance,
  type UpcomingHoliday,
  type WeekAttendance,
  type WeekChartPoint,
} from "@/lib/hrms-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDayCount } from "@/lib/format-day-count";

const SHIFT_MINUTES = 540;

const dashboardCardClass = cn(enterpriseCardClass, "p-5");
const gradientCardClass = cn(
  enterpriseCardClass,
  "p-5 flex flex-col h-full w-full min-w-0",
);
const topRowCardClass = gradientCardClass;
const dashboardGridClass =
  "grid w-full min-w-0 gap-4 grid-cols-1 md:grid-cols-3 items-stretch";
const linkAccentClass = enterpriseLinkClass;
const cardTitleClass = enterpriseCardTitleClass;

const CHART_COLORS = [
  { stroke: "#10b981", dot: "bg-emerald-500" },
  { stroke: "#3b82f6", dot: "bg-blue-500" },
  { stroke: "#f59e0b", dot: "bg-amber-500" },
  { stroke: "#ef4444", dot: "bg-red-500" },
  { stroke: "#8b5cf6", dot: "bg-violet-500" },
] as const;

const AVATAR_SIZE_CLASS: Record<number, string> = {
  64: "w-16 h-16 text-xl tracking-wide",
  72: "w-[72px] h-[72px] text-2xl tracking-wide",
  84: "w-[84px] h-[84px] text-[27px] tracking-wide",
};

const RING_WRAP_CLASS: Record<number, string> = {
  72: "w-[72px] h-[72px]",
  84: "w-[84px] h-[84px]",
  96: "w-[96px] h-[96px]",
  100: "w-[100px] h-[100px]",
};

const DONUT_WRAP_CLASS: Record<number, string> = {
  160: "w-[160px] h-[160px]",
  180: "w-[180px] h-[180px]",
  200: "w-[200px] h-[200px]",
  220: "w-[220px] h-[220px]",
};

// Role type lives in @/lib/roles — shared with AppShell.
// Each role contributes:
//   - which identity / leave-balance / attendance endpoints to call,
//   - what tiles show in Quick Links,
//   - what the bottom table renders (own leaves, team approvals, etc.).

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
      className={cn(
        "rounded-full overflow-hidden flex items-center justify-center font-semibold text-white shrink-0 shadow-sm",
        showImg
          ? "bg-white border-2 border-slate-100"
          : enterpriseAvatarClass,
        AVATAR_SIZE_CLASS[size] ?? "w-16 h-16 text-xl tracking-wide",
      )}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover block"
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
  const centerFontSize = Math.round(size * 0.17);

  return (
    <div
      className={cn("relative mx-auto shrink-0", RING_WRAP_CLASS[size])}
      style={
        RING_WRAP_CLASS[size] ? undefined : { width: size, height: size }
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto block"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-gray-100"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-[lab(52%_28_-70)]"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="block w-full text-center font-bold text-gray-900 leading-none tabular-nums"
          style={{ fontSize: centerFontSize }}
        >
          {used}/{total}
        </span>
      </div>
    </div>
  );
}

function Donut({
  segments,
  size = 200,
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
      className={cn(
        "relative shrink-0",
        DONUT_WRAP_CLASS[size] ?? "w-[200px] h-[200px]",
      )}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-gray-100"
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="font-bold text-gray-900 leading-none"
          style={{ fontSize: Math.round(size * 0.12) }}
        >
          {center.label}
        </p>
        <p
          className="text-gray-400 mt-1"
          style={{ fontSize: Math.round(size * 0.055) }}
        >
          {center.sub}
        </p>
      </div>
    </div>
  );
}

function WeekChart({ points }: { points: WeekChartPoint[] }) {
  const w = 600;
  const h = 150;
  const padL = 32;
  const padR = 16;
  const padT = 14;
  const padB = 24;

  // One absent/leave day is visualized as a 480-minute marker so the dotted-day
  // signal sits on the same axis as the working-minutes line.
  const present = points.map((p) => p.presentMins);
  const absent = points.map((p) => p.absentCount * 480);
  const onLeave = points.map((p) => p.leaveCount * 480);

  // yMax adapts to the window: a 7-day view rarely exceeds 1200, but a 30-day
  // bucket can stack 6 × ~540 working minutes, so we round up to the nearest 600.
  const maxVal = Math.max(...present, ...absent, ...onLeave, 1200);
  const yMax = Math.ceil(maxVal / 600) * 600;
  const ySteps = 6;
  const yLabels = Array.from(
    { length: ySteps + 1 },
    (_, i) => (yMax / ySteps) * i,
  );

  function path(values: number[], yMax: number) {
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

  const xStep = (w - padL - padR) / Math.max(1, points.length - 1);

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full min-w-0"
    >
      {yLabels.map((g, i) => {
        const y = padT + (h - padT - padB) * (1 - g / yMax);
        return (
          <g key={`y-${i}-${g}`}>
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
              {g >= 1000 ? `${(g / 1000).toFixed(1)}k` : Math.round(g)}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => {
        const x = padL + i * xStep;
        return (
          <text
            key={`${p.label}-${i}`}
            x={x}
            y={h - 8}
            fontSize={10}
            textAnchor="middle"
            fill="#9ca3af"
          >
            {p.label}
          </text>
        );
      })}
      <path d={path(present, yMax)} stroke="#3b82f6" strokeWidth={2.5} fill="none" />
      <path d={path(absent, yMax)} stroke="#10b981" strokeWidth={2.5} fill="none" />
      <path d={path(onLeave, yMax)} stroke="#f59e0b" strokeWidth={2.5} fill="none" />
    </svg>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTimeLong(t: string | null | undefined): string {
  if (!t) return "--:--";
  return t;
}

function fmtHm(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m}m`;
}


function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftWeekAnchor(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) {
    const monthYear = e.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    return `${s.getUTCDate()} – ${e.getUTCDate()} ${monthYear}`;
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(s)} – ${fmt(e)}`;
}

function isCurrentWeek(weekStart: string, weekEnd: string): boolean {
  const today = todayYmd();
  return today >= weekStart && today <= weekEnd;
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

type StatusKey = "Approved" | "Rejected" | "Cancelled" | "Pending" | "Forwarded";
const STATUS_PILL: Record<StatusKey, { bg: string; text: string }> = {
  Approved: { bg: "bg-[#dcfce7]", text: "text-[#166534]" },
  Rejected: { bg: "bg-[#fee2e2]", text: "text-[#991b1b]" },
  Cancelled: { bg: "bg-gray-100", text: "text-gray-500" },
  Forwarded: { bg: "bg-[#dbeafe]", text: "text-[#1d4ed8]" },
  Pending: { bg: "bg-[#ffedd5]", text: "text-[#9a3412]" },
};

function leaveHref(_role: Role): string {
  return "/leave";
}

function approvalsHref(): string {
  return "/manager/approvals";
}

// ─── role-specific data plumbing ────────────────────────────────────────────
type RoleAdapters = {
  fetchIdentity: () => Promise<Employee>;
  fetchAttendanceToday: () => Promise<AttendanceRecord>;
  fetchLeaveBalances: () => Promise<LeaveType[]>;
};

const employeeAdapters: RoleAdapters = {
  fetchIdentity: fetchCurrentEmployee,
  fetchAttendanceToday: fetchTodayAttendance,
  fetchLeaveBalances: fetchMyLeaveBalances,
};

const managerAdapters: RoleAdapters = {
  fetchIdentity: fetchCurrentManager,
  fetchAttendanceToday: fetchManagerTodayAttendance,
  fetchLeaveBalances: fetchManagerLeaveBalances,
};

function adaptersFor(role: Role, managerApisAvailable: boolean): RoleAdapters {
  if (role === "manager" && managerApisAvailable) {
    return managerAdapters;
  }
  return employeeAdapters;
}

// ─── Bottom table — switches by role ────────────────────────────────────────
type OwnLeaveRows = { kind: "own"; rows: LeaveRequest[] | null };
type TeamLeaveRows = { kind: "team"; rows: ApprovalLeaveRequest[] | null };
type AdminLeaveRows = { kind: "admin"; rows: ApprovalLeaveRequest[] | null };
type HrOnboardingRows = { kind: "hr"; rows: PendingReviewEmployee[] | null };
type BottomData =
  | OwnLeaveRows
  | TeamLeaveRows
  | AdminLeaveRows
  | HrOnboardingRows;

function RoleBottomTable({
  data,
  role,
}: {
  data: BottomData;
  role: Role;
}) {
  const headers =
    data.kind === "team" || data.kind === "admin"
      ? ["EMPLOYEE", "LEAVE TYPE", "FROM", "DAYS", "STATUS"]
      : data.kind === "hr"
        ? ["EMPLOYEE", "SUBMITTED", "STATUS", "ACTION"]
        : ["LEAVE TYPE", "FROM", "DAYS", "STATUS"];
  const colSpan = headers.length;

  const title =
    data.kind === "team"
      ? "Recent Team Leave Requests"
      : data.kind === "admin"
        ? "Recent Leave Requests"
        : data.kind === "hr"
          ? "Onboarding Pending Review"
          : "Recent Leave Requests";

  const viewHref =
    data.kind === "team"
      ? approvalsHref()
      : data.kind === "admin"
        ? "/manager/approvals"
        : data.kind === "hr"
          ? "/employees"
          : leaveHref(role);
  const viewLabel =
    data.kind === "team"
      ? "Review all →"
      : data.kind === "hr"
        ? "All employees →"
        : "View all →";

  const pendingCount =
    data.kind === "team"
      ? (data.rows?.filter((r) => r.status === "Pending").length ?? 0)
      : data.kind === "admin"
        ? (data.rows?.filter((r) => r.status === "Pending").length ?? 0)
        : data.kind === "hr"
          ? (data.rows?.length ?? 0)
          : 0;

  return (
    <div className={cn(dashboardCardClass, "w-full min-w-0")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className={cardTitleClass}>{title}</h3>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">
              {pendingCount} pending
            </span>
          )}
        </div>
        <a
          href={viewHref}
          className={cn(linkAccentClass, "inline-flex items-center gap-0.5")}
        >
          {viewLabel}
          <ChevronRight size={12} className="shrink-0" aria-hidden />
        </a>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((c) => (
              <th
                key={c}
                className="text-left py-2 text-[10px] font-bold tracking-wider text-gray-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows === null && (
            <tr>
              <td
                colSpan={colSpan}
                className="py-4 text-center text-[12px] text-gray-400"
              >
                Loading…
              </td>
            </tr>
          )}

          {data.rows !== null && data.rows.length === 0 && (
            <tr>
              <td
                colSpan={colSpan}
                className="py-4 text-center text-[12px] text-gray-400"
              >
                {data.kind === "team"
                  ? "No team leave requests yet."
                  : data.kind === "admin"
                    ? "No company leave requests yet."
                    : data.kind === "hr"
                      ? "No onboarding submissions awaiting review."
                      : "No leave requests yet."}
              </td>
            </tr>
          )}

          {data.kind === "own" &&
            data.rows?.slice(0, 5).map((req) => {
              const pill = STATUS_PILL[req.status as StatusKey];
              return (
                <tr key={req.id} className="border-b border-gray-100">
                  <td className="py-2.5 text-[13px] text-gray-800">
                    {req.leaveType}
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-600">
                    {new Date(
                      `${req.startDate}T00:00:00`,
                    ).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-600">
                    {formatDayCount(req.duration)}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded ${pill.bg} ${pill.text}`}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              );
            })}

          {(data.kind === "team" || data.kind === "admin") &&
            data.rows?.slice(0, 5).map((req) => {
              const pill = STATUS_PILL[req.status as StatusKey];
              return (
                <tr key={req.id} className="border-b border-gray-100">
                  <td className="py-2.5 text-[13px] text-gray-800">
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {req.firstName} {req.lastName}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {req.empId}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-700">
                    {req.leaveTypeName}
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-600">
                    {new Date(
                      `${req.fromDate}T00:00:00`,
                    ).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 text-[13px] text-gray-600">
                    {formatDayCount(Number(req.days))}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded ${pill.bg} ${pill.text}`}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              );
            })}

          {data.kind === "hr" &&
            data.rows?.slice(0, 5).map((emp) => (
              <tr key={emp.id} className="border-b border-gray-100">
                <td className="py-2.5 text-[13px] text-gray-800">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {emp.firstName} {emp.lastName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {emp.empId}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-[13px] text-gray-600">
                  {emp.onboardingSubmittedAt
                    ? new Date(emp.onboardingSubmittedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "—"}
                </td>
                <td className="py-2.5 text-[13px] text-gray-600">
                  {emp.onboardingStatus.replace(/_/g, " ")}
                </td>
                <td className="py-2.5 text-right">
                  <Link
                    href={`/employees/${emp.id}/onboarding`}
                    className={enterpriseLinkClass + " text-[11px] hover:underline"}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RoleDashboard({ role }: { role: Role }) {
  const { hasPermission } = useAuth();
  const [managerApisAvailable, setManagerApisAvailable] = useState(
    role === "manager",
  );
  const adapters = useMemo(
    () => adaptersFor(role, managerApisAvailable),
    [role, managerApisAvailable],
  );

  const [identity, setIdentity] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [balances, setBalances] = useState<LeaveType[] | null>(null);
  const [holidays, setHolidays] = useState<UpcomingHoliday[] | null>(null);
  const [week, setWeek] = useState<WeekAttendance | null>(null);
  const [weekAnchor, setWeekAnchor] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const weekAnchorRef = useRef<string | null>(null);
  weekAnchorRef.current = weekAnchor;
  const [ownLeaves, setOwnLeaves] = useState<LeaveRequest[] | null>(null);
  const [teamLeaves, setTeamLeaves] = useState<
    ApprovalLeaveRequest[] | null
  >(null);
  const [orgLeaves, setOrgLeaves] = useState<ApprovalLeaveRequest[] | null>(
    null,
  );
  const [hrPendingReview, setHrPendingReview] = useState<
    PendingReviewEmployee[] | null
  >(null);
  const [hrData, setHrData] = useState<HrDashboardData>({
    completionStats: null,
    employeeCount: null,
    pendingReview: null,
  });
  const [hrSectionLoading, setHrSectionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [punchBusy, setPunchBusy] = useState(false);
  // Resolved Comp-Off policy for the current user — read from
  // /api/me/leave-policy. Drives the "Your Comp Off rules" mini-card below
  // the Leave Balance rings.
  const [compOffPolicy, setCompOffPolicy] = useState<{
    name: string;
    weekendUnits: number;
    holidayUnits: number;
    expiryMode: string;
    expiryDays: number;
    matchedReason: string;
  } | null>(null);

  // Attendance Overview window: "7d" (Mon–Sun) or "30d" (rolling 30 days
  // grouped into 5 buckets). Drives both the chart and the totals row.
  const [attWindow, setAttWindow] = useState<AttendanceWindow>("7d");
  const [winMenuOpen, setWinMenuOpen] = useState(false);
  const winMenuRef = useRef<HTMLDivElement | null>(null);
  // Skip the first run of the window-change effect — reload() already
  // fetched the default 7d view on mount.
  const skipFirstWindowFetch = useRef(true);

  async function loadWeek(anchor?: string | null) {
    const resolved = anchor ?? weekAnchorRef.current ?? undefined;
    setWeekLoading(true);
    try {
      const w = await fetchWeekAttendance(resolved ?? undefined, attWindow);
      setWeek(w);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setWeekLoading(false);
    }
  }


  async function reload() {
    try {
      if (role === "manager" && managerApisAvailable) {
        try {
          await fetchCurrentManager();
        } catch {
          setManagerApisAvailable(false);
          return;
        }
      }

      const baseTasks: Array<Promise<unknown>> = [
        adapters.fetchIdentity().then(setIdentity),
        adapters.fetchAttendanceToday().then(setAttendance),
        adapters.fetchLeaveBalances().then(setBalances),
        fetchUpcomingHolidays(5).then(setHolidays),
        loadWeek(weekAnchorRef.current),
      ];

      if (role === "manager" && managerApisAvailable) {
        baseTasks.push(fetchLeaveApprovals("all").then(setTeamLeaves));
      } else if (role === "admin") {
        baseTasks.push(
          fetchOrgLeaveRequests({ limit: 10 }).then((r) => {
            setOrgLeaves(r.requests);
          }),
        );
      } else if (role === "hr") {
        setHrSectionLoading(true);
        if (hasPermission("onboarding.view")) {
          baseTasks.push(
            fetchCompletionStats().then((stats) =>
              setHrData((prev) => ({ ...prev, completionStats: stats })),
            ),
            fetchPendingReviewEmployees().then((r) => {
              setHrPendingReview(r.employees);
              setHrData((prev) => ({
                ...prev,
                pendingReview: r.employees,
              }));
            }),
          );
        } else {
          baseTasks.push(fetchMyLeaveRequests().then(setOwnLeaves));
        }
        if (hasPermission("employees.view")) {
          baseTasks.push(
            fetchEmployees().then((emps) =>
              setHrData((prev) => ({
                ...prev,
                employeeCount: emps.length,
              })),
            ),
          );
        }
      } else {
        baseTasks.push(fetchMyLeaveRequests().then(setOwnLeaves));
      }

      await Promise.all(baseTasks);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setHrSectionLoading(false);
    }
  }

  useEffect(() => {
    setManagerApisAvailable(role === "manager");
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    setWeekAnchor(null);
    weekAnchorRef.current = null;
    (async () => {
      await reload();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, managerApisAvailable]);

  // Re-fetch the Attendance Overview when the window dropdown changes.
  // The initial-mount value is already covered by reload() above.
  useEffect(() => {
    if (skipFirstWindowFetch.current) {
      skipFirstWindowFetch.current = false;
      return;
    }
    let cancelled = false;
    setWeekLoading(true);
    fetchWeekAttendance(weekAnchorRef.current ?? undefined, attWindow)
      .then((w) => {
        if (!cancelled) {
          setWeek(w);
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setWeekLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attWindow]);

  // Close the window-picker dropdown on outside-click / Escape.
  useEffect(() => {
    if (!winMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (!winMenuRef.current?.contains(e.target as Node)) setWinMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setWinMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [winMenuOpen]);

  const totalLeaves = (balances ?? []).reduce((s, l) => s + l.total, 0);
  const usedLeaves = (balances ?? []).reduce((s, l) => s + l.used, 0);
  const balLeaves = totalLeaves - usedLeaves;

  // Leave Distribution shows every leave type the employee currently holds a
  // balance for — their assigned-policy allocation plus any earned comp-off —
  // by available days. Any leave added to their policy shows up automatically.
  const grantedByType = (balances ?? [])
    .filter((b) => b.available > 0)
    .map((b, i) => {
      const palette = CHART_COLORS[i % CHART_COLORS.length];
      return {
        label: b.name,
        value: b.available,
        stroke: palette.stroke,
        dotClass: palette.dot,
      };
    });
  const grantedTotal = grantedByType.reduce((s, x) => s + x.value, 0);

  const initials = identity?.initials ?? "··";

  const totalMins = week?.totals.totalWorkingMinutes ?? 0;
  const presentMins =
    week?.days.reduce(
      (s, d) =>
        d.record?.status === "Present"
          ? s + (d.record.workingMinutes ?? 0)
          : s,
      0,
    ) ?? 0;
  const absentDays = week?.totals.absent ?? 0;
  const onLeaveDays = week?.totals.onLeave ?? 0;
  const lateMins =
    week?.days.reduce((s, d) => s + (d.record?.lateByMinutes ?? 0), 0) ?? 0;

  const weekStatPlaceholder = weekLoading ? "—" : null;
  const attendanceStatCards = [
    {
      label: "PRESENT",
      display: weekStatPlaceholder ?? fmtHm(presentMins),
      text: "text-[#3b82f6]",
    },
    {
      label: "ABSENT",
      display: weekStatPlaceholder ?? formatDayCount(absentDays),
      text: "text-[#10b981]",
    },
    {
      label: "ON LEAVE",
      display: weekStatPlaceholder ?? formatDayCount(onLeaveDays),
      text: "text-[#f59e0b]",
    },
    {
      label: "LATE",
      display: weekStatPlaceholder ?? fmtHm(lateMins),
      text: "text-[#8b5cf6]",
    },
  ];

  const onCurrentWeek =
    week != null && isCurrentWeek(week.weekStart, week.weekEnd);
  const weekNavAnchor = weekAnchor ?? todayYmd();

  function goPrevWeek() {
    const anchor = shiftWeekAnchor(weekNavAnchor, -7);
    setWeekAnchor(anchor);
    weekAnchorRef.current = anchor;
    void loadWeek(anchor);
  }

  function goNextWeek() {
    if (onCurrentWeek) return;
    const anchor = shiftWeekAnchor(weekNavAnchor, 7);
    setWeekAnchor(anchor);
    weekAnchorRef.current = anchor;
    void loadWeek(anchor);
  }

  function goToWeekPreset(weeksAgo: number) {
    const anchor =
      weeksAgo === 0 ? null : shiftWeekAnchor(todayYmd(), -7 * weeksAgo);
    setWeekAnchor(anchor);
    weekAnchorRef.current = anchor;
    void loadWeek(anchor);
  }

  const modules = useMemo(
    () => dashboardModulesFor(role, hasPermission),
    [role, hasPermission],
  );

  const bottomData: BottomData =
    modules.bottomTableKind === "team" && managerApisAvailable
      ? { kind: "team", rows: teamLeaves }
      : modules.bottomTableKind === "admin"
        ? { kind: "admin", rows: orgLeaves }
        : modules.bottomTableKind === "hr"
          ? { kind: "hr", rows: hrPendingReview }
          : { kind: "own", rows: ownLeaves };

  const quickLinks = quickLinksFor(role, hasPermission);

  return (
    <div className="w-full min-w-0 space-y-6">
      {modules.hrSection && (
        <HrDashboardSection
          data={hrData}
          loading={hrSectionLoading}
          showEmployees={hasPermission("employees.view")}
          showOnboarding={hasPermission("onboarding.view")}
        />
      )}

      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load iLeads HRMS data: {loadError}
        </div>
      )}

      {/* Row 1 — Profile | Leave Balance | Upcoming Holidays */}
      <div className={dashboardGridClass}>
        {/* My Profile */}
        <div className={cn(gradientCardClass, "min-h-0")}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className={cardTitleClass}>
              My Profile
            </h3>
            <Link
              aria-label="My Profile"
              className={cn(enterpriseBtnGhostClass, "w-8 h-8")}
              href="/profile"
              title="My Profile"
            >
              <UserRound size={15} />
            </Link>
          </div>

          <div className="flex items-start gap-3">
            <Avatar
              initials={initials}
              size={64}
              src={identity?.avatarUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-gray-900 m-0 truncate">
                {identity?.name ?? "Loading…"}
              </p>
              <p className="text-xs text-gray-500 m-0 mt-0.5 truncate">
                {identity?.role ?? ""}
              </p>
              {identity?.employeeId && (
                <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  {identity.employeeId}
                </span>
              )}
              <div className="flex flex-col gap-1.5 mt-2 min-w-0">
                <EmployeeEmailSummary
                  className="space-y-1"
                  fallbackEmail={identity?.email}
                  phone={identity?.phone}
                  phoneVerified={identity?.phoneVerified}
                  phoneVerifyHref="/profile"
                  rowClassName="mt-0"
                  showPersonalEmail={false}
                  verifyHref="/profile"
                  workEmail={identity?.workEmail}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div
              className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1.5 min-w-0"
              title={attendance?.punchIn ? "Punched in today" : "Not punched in"}
            >
              <Clock
                size={12}
                className={cn(
                  "shrink-0",
                  attendance?.punchIn ? "text-green-600" : "text-gray-400",
                )}
              />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold tracking-wider text-gray-400 m-0 leading-none">
                  PUNCH IN
                </p>
                <p className="text-xs font-semibold text-slate-900 m-0 mt-0.5 leading-none whitespace-nowrap">
                  {formatTimeLong(attendance?.punchIn)}
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1.5 min-w-0"
              title={attendance?.punchOut ? "Punched out today" : "Not punched out"}
            >
              <Clock size={12} className="text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold tracking-wider text-gray-400 m-0 leading-none">
                  PUNCH OUT
                </p>
                <p className="text-xs font-semibold text-slate-900 m-0 mt-0.5 leading-none whitespace-nowrap">
                  {attendance?.punchOut ?? "--:--"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balance */}
        <div className={topRowCardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cardTitleClass}>
              Leave Balance
            </h3>
            <a href={leaveHref(role)} className={linkAccentClass}>
              View all →
            </a>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="grid w-full grid-cols-2 gap-3 justify-items-center">
              {[
                {
                  key: "used",
                  label: "Used Leaves",
                  used: usedLeaves,
                  total: totalLeaves,
                  days: usedLeaves,
                },
                {
                  key: "balance",
                  label: "Balance Leaves",
                  used: balLeaves,
                  total: totalLeaves,
                  days: balLeaves,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex w-full max-w-[140px] flex-col items-center justify-center text-center"
                >
                  <Ring used={item.used} total={item.total} size={96} />
                  <p className="mt-2 text-sm font-semibold leading-tight text-gray-800">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[13px] text-gray-400">
                    {formatDayCount(item.days)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Resolved Comp-Off policy strip — only shown when a policy is
              actually active. Driven by /api/me/leave-policy?leaveTypeCode=CO. */}
          {compOffPolicy && (
            <div className={cn("mt-3 px-3 py-2.5 flex items-center gap-2.5", enterpriseMutedPanelClass)}>
              <div className={cn("w-7 h-7 rounded-md text-white flex items-center justify-center text-[10px] font-semibold tracking-wider shrink-0", enterpriseAvatarClass)}>
                CO
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[11.5px] font-semibold text-slate-800 leading-tight truncate")}>
                  {compOffPolicy.name}
                </p>
                <p className="text-[10.5px] text-[#be185d]/80 leading-snug mt-0.5">
                  Earn {compOffPolicy.weekendUnits} unit/weekend ·{" "}
                  {compOffPolicy.holidayUnits} unit/holiday ·{" "}
                  {compOffPolicy.expiryMode === "yearEnd"
                    ? "expires year-end"
                    : `expires in ${compOffPolicy.expiryDays} days`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Holidays */}
        <div className={topRowCardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cardTitleClass}>
              Upcoming Holidays
            </h3>
            <a href="/holidays" className={linkAccentClass}>
              All →
            </a>
          </div>
          <div className="flex flex-col gap-2.5 flex-1">
            {holidays === null && (
              <p className="text-[11px] text-gray-400">Loading…</p>
            )}
            {holidays !== null && holidays.length === 0 && (
              <p className="text-[11px] text-gray-400">
                No upcoming holidays.
              </p>
            )}
            {holidays?.slice(0, 3).map((h) => {
              const { month, day, year } = formatDateMonthDay(h.date);
              const typeChip =
                h.type === "National"
                  ? "bg-[#dbeafe] text-[#1d4ed8]"
                  : h.type === "Regional"
                    ? "bg-[#dcfce7] text-[#15803d]"
                    : "bg-gray-100 text-gray-500";
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50/80 border border-slate-100"
                >
                  <div className="flex flex-col items-center justify-center rounded-md text-center shrink-0 w-11 h-11 bg-white border border-slate-200">
                    <p className="text-[9px] font-semibold text-slate-500 uppercase">
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
                    <p className="text-[10px] text-gray-400">{year}</p>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 ${typeChip}`}
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
      <div className={dashboardGridClass}>
        {/* Attendance Overview */}
        <div className={gradientCardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cardTitleClass}>
              Attendance Overview
            </h3>
            <div className="relative" ref={winMenuRef}>
              <button
                type="button"
                onClick={() => setWinMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={winMenuOpen}
                className={enterpriseChipClass}
              >
                {attWindow === "7d" ? "Week" : "30 days"}
                <ChevronDown
                  size={12}
                  className={cn(
                    "transition-transform duration-150",
                    winMenuOpen && "rotate-180",
                  )}
                />
              </button>
              {winMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-20 w-32 rounded-lg bg-white border border-gray-200 shadow-lg overflow-hidden"
                >
                  {([
                    { value: "7d" as AttendanceWindow, label: "Week" },
                    { value: "30d" as AttendanceWindow, label: "30 days" },
                  ]).map((opt) => {
                    const active = attWindow === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAttWindow(opt.value);
                          setWinMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-[12px] cursor-pointer",
                          active
                            ? enterpriseChipActiveClass
                            : "text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {attWindow === "7d" && week && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                type="button"
                onClick={goPrevWeek}
                aria-label="Previous week"
                className="rounded-lg p-1.5 border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-gray-700 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                  >
                    {formatWeekRange(week.weekStart, week.weekEnd)}
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onSelect={() => goToWeekPreset(0)}>
                    This week
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => goToWeekPreset(1)}>
                    Last week
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => goToWeekPreset(2)}>
                    2 weeks ago
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => goToWeekPreset(3)}>
                    3 weeks ago
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={goNextWeek}
                disabled={onCurrentWeek}
                aria-label="Next week"
                className={cn(
                  "rounded-lg p-1.5 border border-gray-200 bg-white",
                  onCurrentWeek
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-gray-50 cursor-pointer",
                )}
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 mb-3 w-full">
            <div className="col-span-2 sm:col-span-3 xl:col-span-1 rounded-md p-2.5 bg-slate-50 border border-slate-100 min-w-0">
              <p className="text-[9px] font-bold tracking-wider text-gray-400 m-0">
                TOTAL
              </p>
              <p className="text-sm font-bold leading-tight mt-0.5 text-gray-900 m-0">
                {weekStatPlaceholder ?? fmtHm(totalMins)}
              </p>
            </div>
            {attendanceStatCards.map((it) => (
              <div
                key={it.label}
                className="rounded-md p-2.5 bg-slate-50 border border-slate-100 min-w-0"
              >
                <p className="text-[9px] font-bold tracking-wider text-gray-400 m-0 truncate">
                  {it.label}
                </p>
                <p
                  className={cn(
                    "text-sm font-bold leading-tight mt-0.5 m-0",
                    it.text,
                  )}
                >
                  {it.display}
                </p>
              </div>
            ))}
          </div>

          {week ? (
            <WeekChart points={week.chartPoints} />
          ) : (
            <p className="text-center text-[11px] py-8 text-gray-400">
              Loading attendance overview…
            </p>
          )}

          <div className="flex items-center justify-center gap-5 mt-2">
            {[
              { label: "Present", bar: "bg-[#3b82f6]" },
              { label: "Absent", bar: "bg-[#10b981]" },
              { label: "On Leave", bar: "bg-[#f59e0b]" },
            ].map((l) => (
              <div
                key={l.label}
                className="flex items-center gap-1.5 text-[11px] text-gray-500"
              >
                <span className={`inline-block w-4 h-0.5 ${l.bar}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Leave Distribution */}
        <div className={gradientCardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cardTitleClass}>
              Leave Distribution
            </h3>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-full p-1 bg-white border border-gray-200 cursor-pointer"
              aria-label="Refresh"
            >
              <RefreshCw size={12} className="text-gray-500" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 flex-1 w-full min-h-[220px]">
            <Donut
              size={220}
              segments={
                grantedTotal > 0
                  ? grantedByType.map((s) => ({ value: s.value, color: s.stroke }))
                  : [{ value: 1, color: "#e5e7eb" }]
              }
              center={{
                label: grantedTotal > 0 ? String(grantedTotal) : "0",
                sub: "Available",
              }}
            />
            <div className="w-full sm:flex-1 min-w-0 flex flex-col justify-center gap-2">
              {grantedByType.length === 0 && (
                <p className="text-xs text-gray-400 text-center m-0">
                  No leaves granted yet.
                </p>
              )}
              {grantedByType.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "rounded-full shrink-0 w-2.5 h-2.5",
                        s.dotClass,
                      )}
                    />
                    <span className="text-xs text-gray-700 truncate">
                      {s.label}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 font-semibold tabular-nums shrink-0">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links — role-driven */}
        <div className={gradientCardClass}>
          <h3 className={cn(cardTitleClass, "mb-3")}>
            Quick Links
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 w-full content-stretch">
            {quickLinks.map(({ icon: Icon, label, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="flex flex-col items-center justify-center text-center no-underline text-slate-800 rounded-md border border-slate-100 bg-slate-50/40 px-2 py-3 hover:bg-white hover:border-slate-200 transition-colors min-h-[88px]"
              >
                <span className={enterpriseIconTileClass}>
                  <Icon size={18} className={enterpriseAccentTextClass} />
                </span>
                <p className="text-[11px] font-medium mt-2 leading-tight text-slate-700 m-0">
                  {label}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — bottom table (own / team / admin) */}
      <RoleBottomTable data={bottomData} role={role} />
    </div>
  );
}
