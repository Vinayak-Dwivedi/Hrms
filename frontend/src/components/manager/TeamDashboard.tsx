"use client";

import {
  ArrowRight,
  Award,
  Cake,
  Calendar,
  Calendar as CalendarIcon,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ApprovalLeaveRequest,
  ApprovalRegRequest,
  TeamAttendanceResponse,
  TeamAttrition,
  TeamMember,
} from "@/lib/hrms-client";

interface Props {
  team: TeamMember[] | null;
  attendance: TeamAttendanceResponse | null;
  pendingLeaves: ApprovalLeaveRequest[] | null;
  pendingRegs: ApprovalRegRequest[] | null;
  monthLeaves: ApprovalLeaveRequest[] | null;
  attrition: TeamAttrition | null;
  loading?: boolean;
  windowEnd: Date;
  onExport: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const AVATAR_BG = [
  "bg-violet-500",
  "bg-emerald-600",
  "bg-blue-500",
  "bg-pink-600",
  "bg-amber-500",
  "bg-teal-600",
  "bg-fuchsia-600",
  "bg-orange-500",
];

function avatarBgFor(key: string): string {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length] ?? "bg-gray-500";
}

function formatRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(
    undefined,
    opts,
  )}`;
}

function formatDayMonth(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

function formatDayMonthFromDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

// ─── tiny SVG widgets ──────────────────────────────────────────────────────

function Sparkline({
  values,
  color,
  fill,
  width = 80,
  height = 28,
}: {
  values: number[];
  color: string;
  fill?: string;
  width?: number;
  height?: number;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const areaPath = fill
    ? `${linePath} L ${width.toFixed(1)} ${height} L 0 ${height} Z`
    : "";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && <path d={areaPath} fill={fill} />}
      <path d={linePath} stroke={color} strokeWidth={1.5} fill="none" />
    </svg>
  );
}

// ─── KPI card ──────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconText,
  trailing,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} ${iconText}`}
        >
          <Icon size={18} />
        </div>
        {trailing}
      </div>
      <p className="text-[12px] text-gray-500 mt-2">{label}</p>
      <p className="text-[26px] font-bold text-gray-900 leading-tight mt-1">
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ScopeTag({ scope }: { scope: "Both" | "Mgr" }) {
  return (
    <span className="inline-flex items-center text-[10px] font-semibold rounded-md px-2 py-0.5 bg-gray-100 text-gray-500">
      {scope}
    </span>
  );
}

// Leave-type → chip styling.
function leaveTypeChip(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("sick"))
    return "bg-pink-50 text-pink-700 border border-pink-100";
  if (n.includes("casual"))
    return "bg-blue-50 text-blue-700 border border-blue-100";
  if (n.includes("annual") || n.includes("earned"))
    return "bg-rose-50 text-rose-700 border border-rose-100";
  if (n.includes("maternity") || n.includes("paternity"))
    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

// ─── filter dropdowns ──────────────────────────────────────────────────────

type WindowKey = "today" | "week" | "month";

const WINDOW_LABEL: Record<WindowKey, string> = {
  today: "Today",
  week: "This Week",
  month: "Next 30 Days",
};

function WindowSelect({
  value,
  onChange,
  options = ["today", "week", "month"],
}: {
  value: WindowKey;
  onChange: (v: WindowKey) => void;
  options?: WindowKey[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as WindowKey)}
        className="appearance-none text-[12px] font-medium rounded-lg pl-3 pr-8 py-1.5 bg-white border border-gray-200 text-gray-700 cursor-pointer"
      >
        {options.map((k) => (
          <option key={k} value={k}>
            {WINDOW_LABEL[k]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}

// ─── main ──────────────────────────────────────────────────────────────────

export default function TeamDashboard({
  team,
  attendance,
  pendingLeaves,
  pendingRegs,
  monthLeaves,
  attrition,
  windowEnd,
  onExport,
}: Props) {
  const [birthdayWindow, setBirthdayWindow] = useState<WindowKey>("today");
  const [anniversaryWindow, setAnniversaryWindow] =
    useState<WindowKey>("week");

  // ── 7-day window ───────────────────────────────────────────────────────
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(windowEnd);
      d.setDate(windowEnd.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, [windowEnd]);

  const todayKey = ymd(windowEnd);
  const rangeLabel = formatRange(days[0] ?? windowEnd, windowEnd);

  // ── Records map ────────────────────────────────────────────────────────
  type RecVal = {
    status: string;
    punchIn: string | null;
    lateByMinutes: number;
  };
  const recordsByEmpDate = useMemo(() => {
    const m = new Map<string, RecVal>();
    for (const r of attendance?.records ?? []) {
      m.set(`${r.employeeId}|${r.date}`, {
        status: r.status,
        punchIn: r.punchIn,
        lateByMinutes: r.lateByMinutes ?? 0,
      });
    }
    return m;
  }, [attendance]);

  // ── KPIs ───────────────────────────────────────────────────────────────
  const teamCount = team?.length ?? 0;
  let onFloorToday = 0;
  let onLeaveToday = 0;
  if (team) {
    for (const t of team) {
      const r = recordsByEmpDate.get(`${t.id}|${todayKey}`);
      const s = r?.status;
      if (s === "Present" || s === "Half Day") onFloorToday++;
      if (s === "Leave") onLeaveToday++;
    }
  }
  const pendingApprovalsCount =
    (pendingLeaves?.length ?? 0) + (pendingRegs?.length ?? 0);

  // 7-day attendance %
  const attendancePctByDay: number[] = [];
  let avgAttendancePct = 0;
  if (team && team.length > 0) {
    let presentSum = 0;
    let workingSum = 0;
    for (const d of days) {
      const k = ymd(d);
      let present = 0;
      let working = 0;
      for (const t of team) {
        const r = recordsByEmpDate.get(`${t.id}|${k}`);
        const s = r?.status ?? "";
        if (s === "Weekend" || s === "Holiday") continue;
        working++;
        if (s === "Present" || s === "Half Day") present++;
      }
      attendancePctByDay.push(
        working > 0 ? Math.round((present / working) * 100) : 0,
      );
      presentSum += present;
      workingSum += working;
    }
    avgAttendancePct =
      workingSum > 0 ? Math.round((presentSum / workingSum) * 100) : 0;
  } else {
    for (let i = 0; i < days.length; i++) attendancePctByDay.push(0);
  }

  const todayPct = attendancePctByDay[attendancePctByDay.length - 1] ?? 0;
  const trendDelta = todayPct - avgAttendancePct;
  const trendIsUp = trendDelta >= 0;

  // ── Late / Absent Alerts (today) ───────────────────────────────────────
  const alerts = useMemo(() => {
    if (!team) return [];
    const out: Array<{
      member: TeamMember;
      status: "Absent" | "Late";
      punchIn: string | null;
      lateMinutes: number;
    }> = [];
    for (const t of team) {
      const r = recordsByEmpDate.get(`${t.id}|${todayKey}`);
      if (!r) continue;
      if (r.status === "Absent") {
        out.push({
          member: t,
          status: "Absent",
          punchIn: null,
          lateMinutes: 0,
        });
      } else if (r.status === "Present" && r.lateByMinutes > 0) {
        out.push({
          member: t,
          status: "Late",
          punchIn: r.punchIn,
          lateMinutes: r.lateByMinutes,
        });
      }
    }
    return out;
  }, [team, recordsByEmpDate, todayKey]);

  // ── Upcoming absences (future approved leaves) ─────────────────────────
  const upcomingAbsences = useMemo(() => {
    const list = (monthLeaves ?? []).filter(
      (l) => l.status === "Approved" && l.fromDate > todayKey,
    );
    list.sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    return list.slice(0, 3);
  }, [monthLeaves, todayKey]);

  // ── Birthdays / Anniversaries from joining date ────────────────────────
  type EventItem = {
    member: TeamMember;
    next: Date;
    years?: number;
  };

  const today = new Date(windowEnd);
  today.setHours(0, 0, 0, 0);
  const inDays = (d: Date) =>
    Math.round((d.getTime() - today.getTime()) / 86_400_000);

  const birthdayItems: EventItem[] = useMemo(() => {
    if (!team) return [];
    return team
      .map((t) => {
        const dob = new Date(`${t.dob}T00:00:00`);
        const next = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        return { member: t, next };
      })
      .sort((a, b) => a.next.getTime() - b.next.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, todayKey]);

  const anniversaryItems: EventItem[] = useMemo(() => {
    if (!team) return [];
    return team
      .map((t) => {
        const doj = new Date(`${t.joiningDate}T00:00:00`);
        const next = new Date(
          today.getFullYear(),
          doj.getMonth(),
          doj.getDate(),
        );
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const years = next.getFullYear() - doj.getFullYear();
        return { member: t, next, years };
      })
      // Drop anniversaries earlier than 1 year — those are still trial.
      .filter((it) => (it.years ?? 0) >= 1)
      .sort((a, b) => a.next.getTime() - b.next.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, todayKey]);

  function filterByWindow<T extends EventItem>(items: T[], w: WindowKey): T[] {
    if (w === "today") return items.filter((it) => inDays(it.next) === 0);
    if (w === "week") return items.filter((it) => inDays(it.next) <= 7);
    return items.filter((it) => inDays(it.next) <= 30);
  }

  const birthdayRows = filterByWindow(birthdayItems, birthdayWindow);
  const anniversaryRows = filterByWindow(anniversaryItems, anniversaryWindow);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Action bar (date range + export) ─────────────────────────── */}
      <div className="flex items-center justify-end gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-white border border-gray-200 text-gray-700">
          <CalendarIcon size={14} className="text-gray-500" />
          {rangeLabel}
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-gradient-to-br from-[#ec4899] to-[#be185d] text-white border-0 cursor-pointer"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {/* ── 6 KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        <KpiCard
          label="On Floor Today"
          value={team ? `${onFloorToday} / ${teamCount}` : "—"}
          sub="Team Present"
          icon={Users}
          iconBg="bg-[#dcfce7]"
          iconText="text-[#16a34a]"
          trailing={
            <Sparkline
              values={attendancePctByDay}
              color="#22c55e"
              fill="#dcfce7"
            />
          }
        />
        <KpiCard
          label="On Leave Today"
          value={team ? String(onLeaveToday) : "—"}
          sub="Approved"
          icon={Calendar}
          iconBg="bg-[#ede9fe]"
          iconText="text-[#7c3aed]"
        />
        <KpiCard
          label="Pending Approvals"
          value={String(pendingApprovalsCount)}
          sub="Leave + Regularisation"
          icon={ClipboardList}
          iconBg="bg-[#ffedd5]"
          iconText="text-[#ea580c]"
          trailing={
            pendingApprovalsCount > 0 ? (
              <span className="inline-flex w-2 h-2 rounded-full bg-[#ef4444]" />
            ) : undefined
          }
        />
        <KpiCard
          label="Avg Attendance"
          value={team ? `${avgAttendancePct}%` : "—"}
          sub="Last 7 days"
          icon={TrendingUp}
          iconBg="bg-[#fee2e2]"
          iconText="text-[#dc2626]"
          trailing={
            team && team.length > 0 ? (
              <span
                className={[
                  "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                  trendIsUp ? "text-[#16a34a]" : "text-[#dc2626]",
                ].join(" ")}
              >
                {trendIsUp ? "▲" : "▼"} {Math.abs(trendDelta)}%
              </span>
            ) : undefined
          }
        />
        <KpiCard
          label="Total Headcount"
          value={String(teamCount)}
          sub="All team members"
          icon={UserPlus}
          iconBg="bg-[#dbeafe]"
          iconText="text-[#2563eb]"
        />
        <KpiCard
          label="Attrition This Month"
          value={attrition ? String(attrition.count) : "—"}
          sub={
            attrition && attrition.teamSize > 0
              ? `${attrition.percentage}% of team`
              : "0% of team"
          }
          icon={TrendingDown}
          iconBg="bg-[#fee2e2]"
          iconText="text-[#dc2626]"
        />
      </div>

      {/* ── Row 2: Late/Absent Alerts | Upcoming Absences ───────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Late / Absent Alerts */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Late / Absent Alerts
            </h3>
            <ScopeTag scope="Mgr" />
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {["AGENT", "STATUS", "LAST PUNCH", "DURATION"].map((c) => (
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
              {team === null && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-center text-[12px] text-gray-400"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {team !== null && alerts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-center text-[12px] text-gray-400"
                  >
                    No alerts today.
                  </td>
                </tr>
              )}
              {alerts.map((a) => (
                <tr key={a.member.id} className="border-b border-gray-100">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={[
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                          avatarBgFor(a.member.empId),
                        ].join(" ")}
                      >
                        {initials(a.member.firstName, a.member.lastName)}
                      </div>
                      <span className="text-[12px] font-medium text-gray-800">
                        {a.member.firstName} {a.member.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={[
                        "px-2 py-0.5 text-[10px] font-semibold rounded",
                        a.status === "Absent"
                          ? "bg-[#fee2e2] text-[#dc2626]"
                          : "bg-[#ffedd5] text-[#ea580c]",
                      ].join(" ")}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-[12px] text-gray-600">
                    {a.punchIn
                      ? new Date(`2000-01-01T${a.punchIn}`).toLocaleTimeString(
                          undefined,
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          },
                        )
                      : "—"}
                  </td>
                  <td className="py-2.5 text-[12px] text-gray-600">
                    {a.lateMinutes > 0 ? `${a.lateMinutes}m` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <a
            href="/manager/approvals"
            className="mt-auto pt-3 text-[12px] font-semibold no-underline text-[#dc143c] inline-flex items-center gap-1"
          >
            View all alerts <ArrowRight size={12} />
          </a>
        </div>

        {/* Upcoming Absences */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Upcoming Absences
            </h3>
            <ScopeTag scope="Both" />
          </div>
          {team === null && (
            <p className="text-[11px] text-gray-400">Loading…</p>
          )}
          {team !== null && upcomingAbsences.length === 0 && (
            <p className="text-[11px] text-gray-400">No upcoming absences.</p>
          )}
          <ul className="flex flex-col gap-3">
            {upcomingAbsences.map((leave) => (
              <li key={leave.id} className="flex items-center gap-3">
                <CalendarIcon size={14} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">
                    {leave.firstName} {leave.lastName}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold rounded px-2 py-0.5 ${leaveTypeChip(
                    leave.leaveTypeName,
                  )}`}
                >
                  {leave.leaveTypeName}
                </span>
                <span className="text-[11px] text-gray-500 shrink-0 w-14 text-right">
                  {formatDayMonth(leave.fromDate)}
                </span>
              </li>
            ))}
          </ul>
          <a
            href="/manager/team-attendance-report"
            className="mt-auto pt-3 text-[12px] font-semibold no-underline text-[#dc143c] inline-flex items-center gap-1"
          >
            View full calendar <ArrowRight size={12} />
          </a>
        </div>
      </div>

      {/* ── Row 3: Birthdays | Work Anniversaries ──────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Birthdays */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">Birthdays</h3>
            <WindowSelect
              value={birthdayWindow}
              onChange={setBirthdayWindow}
            />
          </div>
          {team === null && (
            <p className="text-[11px] text-gray-400">Loading…</p>
          )}
          {team !== null && birthdayRows.length === 0 && (
            <p className="text-[11px] text-gray-400">
              No birthdays in this window.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {birthdayRows.map(({ member, next }) => (
              <li key={member.id} className="flex items-center gap-3">
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0",
                    avatarBgFor(member.empId),
                  ].join(" ")}
                >
                  {initials(member.firstName, member.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    {member.designation ?? "—"}
                  </p>
                </div>
                <span className="text-[10px] font-semibold rounded px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 inline-flex items-center gap-1">
                  <Cake size={10} />
                  Birthday
                </span>
                <span className="text-[11px] text-gray-500 shrink-0 w-14 text-right">
                  {formatDayMonthFromDate(next)}
                </span>
              </li>
            ))}
          </ul>
          <a
            href="/directory"
            className="mt-auto pt-3 text-[12px] font-semibold no-underline text-[#dc143c] inline-flex items-center gap-1"
          >
            View all birthdays <ArrowRight size={12} />
          </a>
        </div>

        {/* Work Anniversaries */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">
              Work Anniversaries
            </h3>
            <WindowSelect
              value={anniversaryWindow}
              onChange={setAnniversaryWindow}
            />
          </div>
          {team === null && (
            <p className="text-[11px] text-gray-400">Loading…</p>
          )}
          {team !== null && anniversaryRows.length === 0 && (
            <p className="text-[11px] text-gray-400">
              No work anniversaries in this window.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {anniversaryRows.map(({ member, next, years }) => (
              <li key={member.id} className="flex items-center gap-3">
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0",
                    avatarBgFor(member.empId),
                  ].join(" ")}
                >
                  {initials(member.firstName, member.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    {member.designation ?? "—"}
                  </p>
                </div>
                <span className="text-[10px] font-semibold rounded px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 inline-flex items-center gap-1">
                  <Award size={10} />
                  {years} Year{years === 1 ? "" : "s"}
                </span>
                <span className="text-[11px] text-gray-500 shrink-0 w-14 text-right">
                  {formatDayMonthFromDate(next)}
                </span>
              </li>
            ))}
          </ul>
          <a
            href="/directory"
            className="mt-auto pt-3 text-[12px] font-semibold no-underline text-[#dc143c] inline-flex items-center gap-1"
          >
            View all work anniversaries <ArrowRight size={12} />
          </a>
        </div>
      </div>

      {/* Hidden — suppress unused import warning for trend-down on certain builds */}
      <span className="hidden">
        <Clock size={0} />
      </span>
    </div>
  );
}
