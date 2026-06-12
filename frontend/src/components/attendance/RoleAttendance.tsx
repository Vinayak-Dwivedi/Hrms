"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// View-toggle icons. Calendar comes from lucide; Table is inlined because
// lucide-react@1.x doesn't export a Table icon — same trick as the SlackIcon
// over in RoleDashboard.
function TableIcon({
  size = 16,
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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}
import type {
  LeaveSubmission,
  RegularisationHistoryItem,
  RegularisationSubmission,
} from "@/components/attendance/AttendanceCalendar";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import type { DayAttendance, LeaveType } from "@/lib/dashboard";
import {
  mergeHolidaysIntoDays,
  mergeLeavesIntoDays,
} from "@/lib/attendance-merge";
import {
  fetchManagerLeaveBalances,
  fetchManagerLeaveRequests,
  fetchManagerMonthAttendance,
  fetchMonthAttendance,
  fetchMonthHolidays,
  fetchMyLeaveBalances,
  fetchMyLeaveRequests,
  fetchMyRegularisationRequests,
  type MyRegularisationRow,
  type UpcomingHoliday,
  submitLeaveRequest,
  submitRegularisationRequest,
} from "@/lib/hrms-client";
import type { Role } from "@/lib/roles";

// ─── role adapters ──────────────────────────────────────────────────────────
// Pick the right data sources per role. Employee and admin share the /me
// endpoints; manager uses the /manager variants.

type RegScope = "employee" | "manager";

type Adapters = {
  fetchMonth: (year: number, month1: number) => Promise<DayAttendance[]>;
  fetchLeaveBalances: () => Promise<LeaveType[]>;
  fetchLeaveRequests: () => Promise<LeaveRequest[]>;
  regScope: RegScope;
  leaveSuccessMessage: string;
};

function adaptersFor(role: Role): Adapters {
  if (role === "manager") {
    return {
      fetchMonth: fetchManagerMonthAttendance,
      fetchLeaveBalances: fetchManagerLeaveBalances,
      fetchLeaveRequests: fetchManagerLeaveRequests,
      regScope: "manager",
      leaveSuccessMessage: "Applied for leave — pending approval",
    };
  }
  return {
    fetchMonth: fetchMonthAttendance,
    fetchLeaveBalances: fetchMyLeaveBalances,
    fetchLeaveRequests: fetchMyLeaveRequests,
    regScope: "employee",
    leaveSuccessMessage: "Applied for leave — pending manager approval",
  };
}

// ─── component ──────────────────────────────────────────────────────────────

export default function RoleAttendance({ role }: { role: Role }) {
  const adapters = adaptersFor(role);

  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth0 = today.getMonth();

  const [data, setData] = useState<DayAttendance[]>([]);
  const [holidays, setHolidays] = useState<UpcomingHoliday[]>([]);
  const [balances, setBalances] = useState<LeaveType[]>([]);
  const [regHistory, setRegHistory] = useState<MyRegularisationRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calYear, setCalYear] = useState(initialYear);
  const [calMonth0, setCalMonth0] = useState(initialMonth0);
  // View mode — calendar (default 70/30 split) or table (full-width summary).
  const [view, setView] = useState<"calendar" | "table">("calendar");

  async function refreshDays(
    year: number,
    month0: number,
  ): Promise<DayAttendance[]> {
    const monthStart = new Date(year, month0, 1);
    const monthEnd = new Date(year, month0 + 1, 0);
    const [days, leaves, monthHolidays] = await Promise.all([
      adapters.fetchMonth(year, month0 + 1),
      adapters.fetchLeaveRequests(),
      fetchMonthHolidays(year, month0 + 1),
    ]);
    const withHolidays = mergeHolidaysIntoDays(days, monthHolidays);
    return mergeLeavesIntoDays(withHolidays, leaves, monthStart, monthEnd);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [merged, bal, regs, monthHolidays] = await Promise.all([
          refreshDays(initialYear, initialMonth0),
          adapters.fetchLeaveBalances(),
          fetchMyRegularisationRequests(adapters.regScope),
          fetchMonthHolidays(initialYear, initialMonth0 + 1),
        ]);
        if (cancelled) return;
        setData(merged);
        setHolidays(monthHolidays);
        setBalances(bal);
        setRegHistory(regs);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function handleMonthChange(year: number, month0: number) {
    setCalYear(year);
    setCalMonth0(month0);
    try {
      const [merged, monthHolidays] = await Promise.all([
        refreshDays(year, month0),
        fetchMonthHolidays(year, month0 + 1),
      ]);
      setData(merged);
      setHolidays(monthHolidays);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }

  async function handleSubmitLeave(input: LeaveSubmission) {
    try {
      await submitLeaveRequest(input);
      const fresh = await refreshDays(calYear, calMonth0);
      setData(fresh);
      toast.success(adapters.leaveSuccessMessage);
    } catch (e) {
      toast.error(`Failed to apply: ${(e as Error).message}`);
      throw e;
    }
  }

  async function handleSubmitRegularisation(input: RegularisationSubmission) {
    try {
      await submitRegularisationRequest(input, adapters.regScope);
      const fresh = await fetchMyRegularisationRequests(adapters.regScope);
      setRegHistory(fresh);
      toast.success("Regularisation submitted — pending approval");
    } catch (e) {
      toast.error(`Failed to submit: ${(e as Error).message}`);
      throw e;
    }
  }

  return (
    <>
      {loadError && (
        <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-[13px] rounded-lg px-3.5 py-2.5">
          Failed to load attendance: {loadError}
        </div>
      )}
      {loading ? (
        <div className="p-6 text-gray-500">Loading attendance…</div>
      ) : (
        <div
          className="flex flex-col gap-3"
          style={{ height: "calc(100vh - 6rem)" }}
        >
          {/* View toggle — Calendar (default) | Table */}
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setView("calendar")}
              aria-label="Calendar view"
              aria-pressed={view === "calendar"}
              title="Calendar view"
              className={[
                "w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                view === "calendar"
                  ? "bg-[#fff1f2] text-[#be185d] border border-[#fecdd3]"
                  : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              <CalendarIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-label="Table view"
              aria-pressed={view === "table"}
              title="Table view"
              className={[
                "w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                view === "table"
                  ? "bg-[#fff1f2] text-[#be185d] border border-[#fecdd3]"
                  : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              <TableIcon size={16} />
            </button>
          </div>

          {view === "calendar" ? (
            // Calendar-only view — full-width calendar card.
            <div className="rounded-2xl bg-white border border-gray-200 p-4 overflow-hidden flex flex-col flex-1 min-h-0">
              <AttendanceCalendar
                data={data}
                initialYear={calYear}
                initialMonth={calMonth0}
                leaveBalances={balances}
                holidays={holidays}
                onSubmitLeave={handleSubmitLeave}
                onSubmitRegularisation={handleSubmitRegularisation}
                onMonthChange={handleMonthChange}
                regularisationHistory={regHistory.map(
                  (r): RegularisationHistoryItem => ({
                    date: r.date,
                    status: r.status,
                    requestedPunchIn: r.requestedPunchIn,
                    requestedPunchOut: r.requestedPunchOut,
                    reason: r.reason,
                    decidedAt: r.decidedAt,
                  }),
                )}
              />
            </div>
          ) : (
            // Table-only view — full-width attendance summary.
            <div className="rounded-2xl bg-white border border-gray-200 p-4 overflow-hidden flex flex-col flex-1 min-h-0">
              <AttendanceTable
                data={data}
                year={calYear}
                month0={calMonth0}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
