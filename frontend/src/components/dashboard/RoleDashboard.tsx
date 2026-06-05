"use client";

import {
  CalendarPlus,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  RefreshCw,
  Users,
} from "lucide-react";

// Slack glyph — old `lucide-react@1.x` doesn't ship the Slack icon, so we
// inline a stripped-down version. The four-hash silhouette is recognizable
// even in monochrome (we recolor via the parent's text color).
function SlackIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2.5" y="9" width="3" height="6" rx="1.5" />
      <rect x="9" y="2.5" width="6" height="3" rx="1.5" />
      <rect x="18.5" y="9" width="3" height="6" rx="1.5" />
      <rect x="9" y="18.5" width="6" height="3" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
import { useEffect, useRef, useState } from "react";
import type {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  LeaveType,
} from "@/lib/dashboard";
import type { Role } from "@/lib/roles";
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
  fetchTodayAttendance,
  fetchUpcomingHolidays,
  fetchWeekAttendance,
  type UpcomingHoliday,
  type WeekAttendance,
  type WeekChartPoint,
  punchIn,
  punchOut,
} from "@/lib/hrms-client";

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
      className={[
        "rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0 border-2 border-white/30",
        showImg
          ? "bg-white"
          : "bg-gradient-to-br from-white/25 to-white/10",
      ].join(" ")}
      style={{
        width: size,
        height: size,
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
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
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
      <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-gray-900 tracking-tight">
        {used}/{total}
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
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[24px] font-bold text-gray-900">{center.label}</p>
        <p className="text-[12px] text-gray-400 mt-0.5">{center.sub}</p>
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

  const xStep = (w - padL - padR) / Math.max(1, points.length - 1);

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="block"
    >
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
      <path d={path(present)} stroke="#3b82f6" strokeWidth={2.5} fill="none" />
      <path d={path(absent)} stroke="#10b981" strokeWidth={2.5} fill="none" />
      <path d={path(onLeave)} stroke="#f59e0b" strokeWidth={2.5} fill="none" />
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

// ─── role-specific routing for view-all/quick-link hrefs ────────────────────
function leaveHref(role: Role): string {
  return role === "manager" ? "/manager/leave" : "/leave";
}
function approvalsHref(): string {
  return "/manager/approvals";
}

// ─── role-specific Quick Links ──────────────────────────────────────────────
// Icon can be either a lucide-react component or any locally-defined SVG
// component that accepts `size` + `className` (e.g. the inline SlackIcon).
type QuickLinkIcon = React.ComponentType<{
  size?: number;
  className?: string;
}>;
type QuickLink = {
  icon: QuickLinkIcon;
  label: string;
  href: string;
  // When true, the tile renders as an external link (target=_blank, rel set).
  external?: boolean;
};

function quickLinksFor(role: Role): QuickLink[] {
  if (role === "manager") {
    return [
      { icon: CheckSquare, label: "Approvals", href: approvalsHref() },
      {
        icon: LayoutDashboard,
        label: "Team Dashboard",
        href: "/manager/team-dashboard",
      },
      { icon: History, label: "Punch History", href: "/manager/attendance" },
      { icon: Users, label: "Company Directory", href: "/directory" },
      { icon: CalendarIcon, label: "Apply Leave", href: "/leave/new" },
      { icon: FileText, label: "My Requests", href: "/requests" },
    ];
  }
  if (role === "admin") {
    return [
      { icon: Users, label: "Employees", href: "/admin/employees" },
      { icon: CheckSquare, label: "Approvals", href: "/admin/approvals" },
      { icon: LayoutDashboard, label: "Org Dashboard", href: "/admin/org" },
      { icon: FileText, label: "Reports", href: "/admin/reports" },
      { icon: GraduationCap, label: "L&D Portal", href: "/lnd" },
      { icon: Users, label: "Directory", href: "/directory" },
    ];
  }
  return [
    { icon: CalendarPlus, label: "Apply Leave", href: "/leave/new" },
    { icon: FileText, label: "My Requests", href: "/requests" },
    {
      icon: SlackIcon,
      label: "Slack",
      href: "https://slack.com/signin#/signin",
      external: true,
    },
    { icon: History, label: "Punch History", href: "/attendance" },
    { icon: Users, label: "Company Directory", href: "/directory" },
    { icon: GraduationCap, label: "L&D Portal", href: "/lnd" },
  ];
}

// ─── role-specific data plumbing ────────────────────────────────────────────
type RoleAdapters = {
  fetchIdentity: () => Promise<Employee>;
  fetchAttendanceToday: () => Promise<AttendanceRecord>;
  fetchLeaveBalances: () => Promise<LeaveType[]>;
};

function adaptersFor(role: Role): RoleAdapters {
  if (role === "manager") {
    return {
      fetchIdentity: fetchCurrentManager,
      fetchAttendanceToday: fetchManagerTodayAttendance,
      fetchLeaveBalances: fetchManagerLeaveBalances,
    };
  }
  // Employee + admin both load their own employee identity for now;
  // admin's bottom-table data source is a separate concern (see RoleBottomTable).
  return {
    fetchIdentity: fetchCurrentEmployee,
    fetchAttendanceToday: fetchTodayAttendance,
    fetchLeaveBalances: fetchMyLeaveBalances,
  };
}

// ─── Bottom table — switches by role ────────────────────────────────────────
type OwnLeaveRows = { kind: "own"; rows: LeaveRequest[] | null };
type TeamLeaveRows = { kind: "team"; rows: ApprovalLeaveRequest[] | null };
type AdminLeaveRows = { kind: "admin"; rows: null };
type BottomData = OwnLeaveRows | TeamLeaveRows | AdminLeaveRows;

function RoleBottomTable({
  data,
  role,
}: {
  data: BottomData;
  role: Role;
}) {
  const headers =
    data.kind === "team"
      ? ["TEAM MEMBER", "LEAVE TYPE", "FROM", "DAYS", "STATUS"]
      : ["LEAVE TYPE", "FROM", "DAYS", "STATUS"];
  const colSpan = headers.length;

  const title =
    data.kind === "team"
      ? "Recent Team Leave Requests"
      : data.kind === "admin"
        ? "Recent Company Leave Requests"
        : "Recent Leave Requests";

  const viewHref =
    data.kind === "team"
      ? approvalsHref()
      : data.kind === "admin"
        ? "/admin/approvals"
        : leaveHref(role);
  const viewLabel = data.kind === "team" ? "Review all →" : "View all →";

  const pendingCount =
    data.kind === "team"
      ? (data.rows?.filter((r) => r.status === "Pending").length ?? 0)
      : 0;

  return (
    <div className="rounded-2xl bg-white p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-[#ffedd5] text-[#9a3412]">
              {pendingCount} pending
            </span>
          )}
        </div>
        <a
          href={viewHref}
          className="text-[12px] font-medium no-underline text-[#dc143c]"
        >
          {viewLabel}
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
          {data.kind === "admin" && (
            <tr>
              <td
                colSpan={colSpan}
                className="py-4 text-center text-[12px] text-gray-400"
              >
                Admin view — company-wide table coming soon.
              </td>
            </tr>
          )}

          {data.kind !== "admin" && data.rows === null && (
            <tr>
              <td
                colSpan={colSpan}
                className="py-4 text-center text-[12px] text-gray-400"
              >
                Loading…
              </td>
            </tr>
          )}

          {data.kind !== "admin" &&
            data.rows !== null &&
            data.rows.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-4 text-center text-[12px] text-gray-400"
                >
                  {data.kind === "team"
                    ? "No team leave requests yet."
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
                    {req.duration}
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

          {data.kind === "team" &&
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
                    {req.days}
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
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RoleDashboard({ role }: { role: Role }) {
  const adapters = adaptersFor(role);

  const [identity, setIdentity] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [balances, setBalances] = useState<LeaveType[] | null>(null);
  const [holidays, setHolidays] = useState<UpcomingHoliday[] | null>(null);
  const [week, setWeek] = useState<WeekAttendance | null>(null);
  const [ownLeaves, setOwnLeaves] = useState<LeaveRequest[] | null>(null);
  const [teamLeaves, setTeamLeaves] = useState<
    ApprovalLeaveRequest[] | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [punchBusy, setPunchBusy] = useState(false);

  // Attendance Overview window: "7d" (Mon–Sun) or "30d" (rolling 30 days
  // grouped into 5 buckets). Drives both the chart and the totals row.
  const [attWindow, setAttWindow] = useState<AttendanceWindow>("7d");
  const [winMenuOpen, setWinMenuOpen] = useState(false);
  const winMenuRef = useRef<HTMLDivElement | null>(null);
  // Skip the first run of the window-change effect — reload() already
  // fetched the default 7d view on mount.
  const skipFirstWindowFetch = useRef(true);

  async function reload() {
    try {
      const baseTasks: Array<Promise<unknown>> = [
        adapters.fetchIdentity().then(setIdentity),
        adapters.fetchAttendanceToday().then(setAttendance),
        adapters.fetchLeaveBalances().then(setBalances),
        fetchUpcomingHolidays(5).then(setHolidays),
        fetchWeekAttendance(undefined, attWindow).then(setWeek),
      ];

      if (role === "manager") {
        baseTasks.push(fetchLeaveApprovals("all").then(setTeamLeaves));
      } else if (role === "employee") {
        baseTasks.push(fetchMyLeaveRequests().then(setOwnLeaves));
      }
      // admin role currently has no bottom-table API.

      await Promise.all(baseTasks);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Re-fetch the Attendance Overview when the window dropdown changes.
  // The initial-mount value is already covered by reload() above.
  useEffect(() => {
    if (skipFirstWindowFetch.current) {
      skipFirstWindowFetch.current = false;
      return;
    }
    let cancelled = false;
    fetchWeekAttendance(undefined, attWindow)
      .then((w) => {
        if (!cancelled) setWeek(w);
      })
      .catch((e) => {
        if (!cancelled) setLoadError((e as Error).message);
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

  async function handlePunchToggle() {
    if (punchBusy || !attendance) return;
    setPunchBusy(true);
    setLoadError(null);
    try {
      // Punch endpoints live on /me regardless of role — both employee and
      // manager are employees and own a punch record.
      const next = attendance.punchIn ? await punchOut() : await punchIn();
      setAttendance(next);
      fetchWeekAttendance(undefined, attWindow)
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
  // Leave Distribution: skip Compensatory Off entirely (it's almost always
  // 0 and clutters the legend). The Leave Balance rings above still include
  // every leave type — the filter is only for this chart.
  const usedByType = (balances ?? [])
    .filter((b) => !/^comp(ensatory)?\s*off$/i.test(b.name.trim()))
    .map((b, i) => ({
      label: b.name,
      value: b.used,
      color: PALETTE[i % PALETTE.length] ?? "#9ca3af",
    }));
  const usedTotal = usedByType.reduce((s, x) => s + x.value, 0);

  const initials = identity?.initials ?? "··";

  const totalMins = week?.totals.totalWorkingMinutes ?? 0;
  const presentMins = totalMins;
  const absentMins = (week?.totals.absent ?? 0) * 540;
  const onLeaveMins = (week?.totals.onLeave ?? 0) * 540;
  const lateMins =
    week?.days.reduce((s, d) => s + (d.record?.lateByMinutes ?? 0), 0) ?? 0;

  const bottomData: BottomData =
    role === "manager"
      ? { kind: "team", rows: teamLeaves }
      : role === "admin"
        ? { kind: "admin", rows: null }
        : { kind: "own", rows: ownLeaves };

  const quickLinks = quickLinksFor(role);

  return (
    <>
      {loadError && (
        <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-[13px] rounded-lg px-3.5 py-2.5">
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
        {/* OLD USER CARD COMMENTED OUT AS REQUESTED */}
        {false && (
          <div className="relative rounded-2xl overflow-hidden text-white bg-gradient-to-br from-[#9b1747] via-[#7a1239] to-[#5e0c2a] shadow-[0_10px_30px_-12px_rgba(123,18,57,0.35)]">
            {/* Soft top highlight — gives the card subtle depth */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />

            {/* Faint radial glow behind the avatar — adds a premium feel */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-white/[0.06] blur-2xl"
            />

            {/* Action button (glass) */}
            <button
              type="button"
              onClick={handlePunchToggle}
              disabled={punchBusy || !attendance}
              className={[
                "absolute top-4 right-4 z-10",
                "px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide",
                "bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/25",
                "text-white transition-colors",
                punchBusy || !attendance
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer",
              ].join(" ")}
            >
              {punchBusy
                ? "…"
                : attendance?.punchIn
                  ? "Punch Out"
                  : "Punch In"}
            </button>

            <div className="relative flex items-center px-6 py-7 gap-5">
              {/* Avatar with status dot in the corner */}
              <div className="relative shrink-0">
                <Avatar
                  initials={initials}
                  size={72}
                  src={identity?.avatarUrl}
                />
                <span
                  className={[
                    "absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full",
                    "ring-[3px] ring-[#7a1239]",
                    attendance?.punchIn ? "bg-emerald-400" : "bg-gray-400",
                  ].join(" ")}
                  title={attendance?.punchIn ? "Checked In" : "Checked Out"}
                />
              </div>

              {/* Identity */}
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[20px] font-bold leading-tight tracking-tight truncate">
                  {identity?.name ?? "Loading…"}
                </p>
                <p className="text-[12.5px] mt-1 leading-tight text-white/70 truncate">
                  {identity?.role ?? ""}
                </p>
                {identity?.employeeId && (
                  <div className="inline-flex self-start mt-2 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 tracking-wide">
                    {identity?.employeeId}
                  </div>
                )}
              </div>

              <div className="w-px self-stretch bg-white/15 mx-1" />

              {/* PUNCH IN */}
              <div className="flex flex-col shrink-0 min-w-[96px]">
                <p className="text-[10px] font-bold tracking-[0.18em] text-white/55">
                  PUNCH IN
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock
                    size={14}
                    className={
                      attendance?.punchIn ? "text-emerald-400" : "text-white/40"
                    }
                  />
                  <p className="text-[16px] font-bold whitespace-nowrap tracking-tight">
                    {formatTimeLong(attendance?.punchIn)}
                  </p>
                </div>
                <p className="text-[10.5px] mt-1 text-white/55">
                  {attendance?.punchIn ? "Today" : "Not punched in"}
                </p>
              </div>

              {/* PUNCH OUT — right padding clears the absolute action button */}
              <div className="flex flex-col shrink-0 min-w-[108px] pr-[88px]">
                <p className="text-[10px] font-bold tracking-[0.18em] text-white/55">
                  PUNCH OUT
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={14} className="text-white/40" />
                  <p
                    className={[
                      "text-[16px] font-bold whitespace-nowrap tracking-tight",
                      attendance?.punchOut ? "text-white" : "text-white/65",
                    ].join(" ")}
                  >
                    {attendance?.punchOut ?? "--:--"}
                  </p>
                </div>
                <p className="text-[10.5px] mt-1 text-white/55">
                  {attendance?.punchOut ? "Today" : "Not punched out"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NEW Punch hero card — premium, vertically centered, perfect padding */}
        <div className="relative rounded-2xl overflow-hidden text-white bg-gradient-to-br from-[#9b1747] via-[#7a1239] to-[#5e0c2a] shadow-[0_10px_30px_-12px_rgba(123,18,57,0.35)]">
          {/* Soft top highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          {/* Faint radial glow behind the avatar */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-white/[0.08] blur-2xl"
          />

          <div className="relative flex items-center px-6 py-6 gap-6 w-full h-full">
            {/* Avatar — status is now shown as a pill in the identity column,
                so no dot here. */}
            <div className="relative shrink-0">
              <Avatar
                initials={initials}
                size={88}
                src={identity?.avatarUrl}
              />
            </div>

            {/* Identity stack — Name → Designation → ID chip → Status pill
                (with the temporary Punch In/Out button inline beside it). */}
            <div className="flex flex-col flex-1 min-w-[140px] pr-2 gap-1.5">
              <p className="text-[19px] font-bold leading-tight tracking-tight break-words">
                {identity?.name ?? "Loading…"}
              </p>
              <p className="text-[12.5px] leading-tight text-white/75 break-words">
                {identity?.role ?? ""}
              </p>
              {identity?.employeeId && (
                <div className="inline-flex self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-sm border border-white/15 text-white/95 tracking-wide shadow-sm">
                  {identity?.employeeId}
                </div>
              )}
              {/* Status pill + temporary punch button — button disappears once
                  the matching action is done. Hidden entirely after both
                  punches are recorded. */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 tracking-wide">
                  <span
                    className={[
                      "w-1.5 h-1.5 rounded-full",
                      attendance?.punchIn ? "bg-emerald-400" : "bg-gray-400",
                    ].join(" ")}
                  />
                  {attendance?.punchIn ? "Checked In" : "Checked Out"}
                </span>
                {attendance && !attendance.punchIn && (
                  <button
                    type="button"
                    onClick={handlePunchToggle}
                    disabled={punchBusy}
                    className={[
                      "px-2.5 py-0.5 rounded-md text-[10.5px] font-bold tracking-wide",
                      "bg-emerald-500 hover:bg-emerald-600 text-white transition-colors",
                      punchBusy
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    {punchBusy ? "…" : "Punch In"}
                  </button>
                )}
                {attendance && attendance.punchIn && !attendance.punchOut && (
                  <button
                    type="button"
                    onClick={handlePunchToggle}
                    disabled={punchBusy}
                    className={[
                      "px-2.5 py-0.5 rounded-md text-[10.5px] font-bold tracking-wide",
                      "bg-rose-500 hover:bg-rose-600 text-white transition-colors",
                      punchBusy
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    {punchBusy ? "…" : "Punch Out"}
                  </button>
                )}
              </div>
            </div>

            {/* Right side — premium divider + PUNCH IN / PUNCH OUT stacked.
                The divider self-stretches to the height of the times column, so
                it spans top of PUNCH IN label to bottom of the last caption. */}
            <div className="flex items-stretch gap-5 shrink-0 self-center">
              <div
                aria-hidden
                className="w-px self-stretch bg-gradient-to-b from-transparent via-white/40 to-transparent"
              />
              <div className="flex flex-col gap-3 justify-center">
              <div className="flex flex-col pr-6">
                <p className="text-[11px] font-bold tracking-[0.18em] text-white/60">
                  PUNCH IN
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Clock
                    size={18}
                    className={
                      attendance?.punchIn ? "text-emerald-400" : "text-white/40"
                    }
                  />
                  <p className="text-[22px] font-bold whitespace-nowrap tracking-tight leading-none">
                    {formatTimeLong(attendance?.punchIn)}
                  </p>
                </div>
                <p className="text-[11px] mt-1.5 text-white/55">
                  {attendance?.punchIn ? "Today" : "Not punched in"}
                </p>
              </div>

              <div className="flex flex-col">
                <p className="text-[11px] font-bold tracking-[0.18em] text-white/60">
                  PUNCH OUT
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Clock size={18} className="text-white/40" />
                  <p
                    className={[
                      "text-[22px] font-bold whitespace-nowrap tracking-tight leading-none",
                      attendance?.punchOut ? "text-white" : "text-white/65",
                    ].join(" ")}
                  >
                    {attendance?.punchOut ?? "--:--"}
                  </p>
                </div>
                <p className="text-[11px] mt-1.5 text-white/55">
                  {attendance?.punchOut ? "Today" : "Not punched out"}
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Leave Balance
            </h3>
            <a
              href={leaveHref(role)}
              className="text-[12px] font-medium no-underline text-[#dc143c]"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                className="flex flex-col items-center text-center"
              >
                <Ring used={item.used} total={item.total} size={96} />
                <p className="text-[11px] font-semibold text-gray-800 mt-2 leading-tight">
                  {item.label}
                </p>
                <p className="text-[10px] mt-0.5 text-gray-400">
                  {item.days} days
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Upcoming Holidays
            </h3>
            <a
              href="/holidays"
              className="text-[12px] font-medium no-underline text-[#dc143c]"
            >
              All →
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            {holidays === null && (
              <p className="text-[11px] text-gray-400">Loading…</p>
            )}
            {holidays !== null && holidays.length === 0 && (
              <p className="text-[11px] text-gray-400">
                No upcoming holidays.
              </p>
            )}
            {holidays?.slice(0, 2).map((h) => {
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
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex flex-col items-center justify-center rounded-lg text-center shrink-0 w-11 h-11 bg-white border border-gray-200">
                    <p className="text-[9px] font-bold text-[#dc143c]">
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
      <div
        className="grid gap-4 mb-4"
        style={{
          gridTemplateColumns:
            "minmax(0,1.7fr) minmax(0,1.4fr) minmax(0,1fr)",
        }}
      >
        {/* Attendance Overview */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Attendance Overview
            </h3>
            <div className="relative" ref={winMenuRef}>
              <button
                type="button"
                onClick={() => setWinMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={winMenuOpen}
                className="text-[11px] font-semibold rounded px-2 py-1 flex items-center gap-1 bg-[#fff1f2] text-[#be185d] border border-[#fecdd3] cursor-pointer"
              >
                {attWindow === "7d" ? "Week" : "30 days"}
                <ChevronDown
                  size={12}
                  className={[
                    "transition-transform duration-150",
                    winMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
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
                        className={[
                          "w-full text-left px-3 py-1.5 text-[12px] cursor-pointer",
                          active
                            ? "bg-[#fff1f2] text-[#be185d] font-semibold"
                            : "text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-3">
            <div className="rounded-lg p-2 bg-gray-50">
              <p className="text-[9px] font-bold tracking-wider text-gray-400">
                TOTAL
              </p>
              <p className="text-[16px] font-bold leading-tight mt-0.5 text-gray-900">
                {fmtHm(totalMins)}
              </p>
                </div>
            {[
              { label: "PRESENT", value: presentMins, text: "text-[#3b82f6]" },
              { label: "ABSENT", value: absentMins, text: "text-[#10b981]" },
              { label: "ON LEAVE", value: onLeaveMins, text: "text-[#f59e0b]" },
              { label: "LATE ARRIVALS", value: lateMins, text: "text-[#8b5cf6]" },
            ].map((it) => (
              <div key={it.label} className="rounded-lg p-2 bg-gray-50">
                <p className="text-[9px] font-bold tracking-wider text-gray-400">
                  {it.label}
                </p>
                <p
                  className={`text-[16px] font-bold leading-tight mt-0.5 ${it.text}`}
                >
                  {fmtHm(it.value)}
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
        <div className="rounded-2xl bg-white px-4 py-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[15px] font-bold text-gray-900">
              Leave Distribution
            </h3>
          
          </div>

          <div className="flex flex-col items-center gap-3">
            <Donut
              size={200}
              segments={
                usedTotal > 0
                  ? usedByType
                  : [{ value: 1, color: "#e5e7eb" }]
              }
              center={{
                label: usedTotal > 0 ? String(usedTotal) : "0",
                sub: "Total",
              }}
            />
            <div className="flex-1 min-w-0">
              {usedByType.length === 0 && (
                <p className="text-[11px] text-gray-400">
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
                    className="flex items-center justify-between py-0.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="rounded-full shrink-0 w-2 h-2"
                        style={{ background: s.color }}
                      />
                      <span className="text-[11px] text-gray-700 truncate">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium tabular-nums shrink-0 ml-2">
                      {s.value}
                     
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Links — role-driven */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {quickLinks.map(({ icon: Icon, label, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="flex flex-col items-center text-center no-underline text-gray-900"
              >
                <span className="flex items-center justify-center rounded-xl w-14 h-14 bg-[#fff1f2] border border-[#fecdd3]">
                  <Icon size={22} className="text-[#e91e8c]" />
                </span>
                <p className="text-[11px] font-semibold mt-2 leading-tight text-gray-900">
                  {label}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — bottom table (own / team / admin) */}
      <RoleBottomTable data={bottomData} role={role} />
    </>
  );
}
