"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  LeaveSubmission,
  RegularisationHistoryItem,
  RegularisationSubmission,
} from "@/components/attendance/AttendanceCalendar";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import MyAttendanceReport from "@/components/attendance/MyAttendanceReport";
import ViewModeToggle, {
  type ViewMode,
} from "@/components/attendance/ViewModeToggle";
import type {
  DayAttendance,
  LeaveType,
} from "@/lib/dashboard";
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
  cancelLeaveRequest,
  getHrmsErrorMessage,
  submitLeaveRequest,
  submitRegularisationRequest,
} from "@/lib/hrms-client";
import type { Role } from "@/lib/roles";
import { useReportingManagerAvailable } from "@/lib/use-reporting-manager-available";
import { enterpriseCardClass, enterpriseLoadingClass } from "@/lib/branding";
import { cn } from "@/lib/utils";

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

function adaptersFor(role: Role, managerApisAvailable: boolean): Adapters {
  if (role === "manager" && managerApisAvailable) {
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

export default function RoleAttendance({
  role,
  leadingToolbar,
  showViewToggle = true,
  autoApplyLeave = false,
}: {
  role: Role;
  leadingToolbar?: React.ReactNode;
  showViewToggle?: boolean;
  /** Auto-open the Apply-Leave form (arriving from the "Apply Leave" link). */
  autoApplyLeave?: boolean;
}) {
  const { available: reportingManager, loading: managerProbeLoading } =
    useReportingManagerAvailable();
  const useManagerApis = role === "manager" && reportingManager;
  const adapters = adaptersFor(role, useManagerApis);

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
  const [view, setView] = useState<ViewMode>("calendar");

  async function refreshDays(
    year: number,
    month0: number,
  ): Promise<DayAttendance[]> {
    return adapters.fetchMonth(year, month0 + 1);
  }

  useEffect(() => {
    if (role === "manager" && managerProbeLoading) return;

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
        if (!cancelled) setLoadError(getHrmsErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, useManagerApis, managerProbeLoading]);

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
      setLoadError(getHrmsErrorMessage(e));
    }
  }

  async function handleSubmitLeave(input: LeaveSubmission) {
    await submitLeaveRequest(input);
    const [fresh, bal] = await Promise.all([
      refreshDays(calYear, calMonth0),
      adapters.fetchLeaveBalances(),
    ]);
    setData(fresh);
    setBalances(bal);
    toast.success(adapters.leaveSuccessMessage);
  }

  async function handleCancelLeave(id: string) {
    try {
      await cancelLeaveRequest(id);
      const [fresh, bal] = await Promise.all([
        refreshDays(calYear, calMonth0),
        adapters.fetchLeaveBalances(),
      ]);
      setData(fresh);
      setBalances(bal);
      toast.success("Leave request cancelled");
    } catch (e) {
      toast.error(getHrmsErrorMessage(e));
      throw e;
    }
  }

  async function handleSubmitRegularisation(input: RegularisationSubmission) {
    await submitRegularisationRequest(input, adapters.regScope);
    const fresh = await fetchMyRegularisationRequests(adapters.regScope);
    setRegHistory(fresh);
    toast.success("Regularisation submitted — pending approval");
  }

  return (
    <>
      {loadError && (
        <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-[13px] rounded-lg px-3.5 py-2.5">
          Failed to load attendance: {loadError}
        </div>
      )}
      {loading || (role === "manager" && managerProbeLoading) ? (
        <div className={enterpriseLoadingClass}>Loading attendance…</div>
      ) : (
        <div
          className="flex flex-col flex-1 min-h-0 gap-2"
          style={{ height: "calc(100vh - 7rem)" }}
        >
          {(leadingToolbar || showViewToggle) && (
            <div className="flex items-center shrink-0 gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {leadingToolbar}
              </div>
              {showViewToggle && (
                <ViewModeToggle view={view} onChange={setView} />
              )}
            </div>
          )}
          {view === "calendar" ? (
            <div
              className={cn(
                enterpriseCardClass,
                "p-3 overflow-hidden flex flex-col flex-1 min-h-0",
              )}
            >
              <AttendanceCalendar
                data={data}
                initialYear={calYear}
                initialMonth={calMonth0}
                leaveBalances={balances}
                holidays={holidays}
                onSubmitLeave={handleSubmitLeave}
                onCancelLeave={handleCancelLeave}
                onSubmitRegularisation={handleSubmitRegularisation}
                onMonthChange={handleMonthChange}
                autoApplyLeave={autoApplyLeave}
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
            <div
              className={cn(
                enterpriseCardClass,
                "p-3 overflow-hidden flex flex-col flex-1 min-h-0",
              )}
            >
              <MyAttendanceReport />
            </div>
          )}
        </div>
      )}
    </>
  );
}
