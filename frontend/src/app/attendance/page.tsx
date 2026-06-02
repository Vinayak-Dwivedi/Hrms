"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  LeaveSubmission,
  RegularisationHistoryItem,
  RegularisationSubmission,
} from "@/components/attendance/AttendanceCalendar";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import Sidebar from "@/components/dashboard/Sidebar";
import {
  APP_LOCATION,
  APP_VERSION,
  type DayAttendance,
  type Employee,
  type LeaveRequest,
  type LeaveType,
  mockAttendanceNavItems,
  mockEmployee,
} from "@/lib/dashboard";
import {
  fetchCurrentEmployee,
  fetchMonthAttendance,
  fetchMyLeaveBalances,
  fetchMyLeaveRequests,
  fetchMyRegularisationRequests,
  type MyRegularisationRow,
  submitLeaveRequest,
  submitRegularisationRequest,
} from "@/lib/hrms-client";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mergeLeavesIntoDays(
  attendance: DayAttendance[],
  leaves: LeaveRequest[],
  monthStart: Date,
  monthEnd: Date,
): DayAttendance[] {
  const map = new Map<string, DayAttendance>(
    attendance.map((d) => [d.date, d]),
  );
  // Pending first, Approved last → Approved wins on same-date conflicts.
  // Rejected/Cancelled are dropped.
  const ranked = [...leaves]
    .filter((lr) => lr.status === "Pending" || lr.status === "Approved")
    .sort((a, b) => (a.status === "Approved" ? 1 : 0) - (b.status === "Approved" ? 1 : 0));
  for (const lr of ranked) {
    const start = new Date(lr.startDate);
    const end = new Date(lr.endDate);
    const lower = start < monthStart ? monthStart : start;
    const upper = end > monthEnd ? monthEnd : end;
    const cur = new Date(lower);
    while (cur <= upper) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        map.set(ymd(cur), {
          date: ymd(cur),
          status: lr.status === "Approved" ? "Leave" : "LeavePending",
          leaveType: lr.leaveType,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return Array.from(map.values());
}

const ROLE_ROUTES: Record<string, string> = {
  Employee: "/dashboard",
  Manager: "/manager/dashboard",
  HR: "/hr/dashboard",
};

export default function AttendancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeRole = pathname.startsWith("/manager")
    ? "Manager"
    : pathname.startsWith("/hr")
      ? "HR"
      : "Employee";

  function handleRoleSwitch(role: string) {
    router.push(ROLE_ROUTES[role]);
  }

  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth0 = today.getMonth();

  const [employee, setEmployee] = useState<Employee>(mockEmployee);
  const [data, setData] = useState<DayAttendance[]>([]);
  const [balances, setBalances] = useState<LeaveType[]>([]);
  const [regHistory, setRegHistory] = useState<MyRegularisationRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Tracks which month the calendar is showing so refetches target the right month
  const [calYear, setCalYear] = useState(initialYear);
  const [calMonth0, setCalMonth0] = useState(initialMonth0);

  async function refreshDays(year: number, month0: number): Promise<DayAttendance[]> {
    const monthStart = new Date(year, month0, 1);
    const monthEnd = new Date(year, month0 + 1, 0);
    const [days, leaves] = await Promise.all([
      fetchMonthAttendance(year, month0 + 1),
      fetchMyLeaveRequests(),
    ]);
    return mergeLeavesIntoDays(days, leaves, monthStart, monthEnd);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [emp, merged, bal, regs] = await Promise.all([
          fetchCurrentEmployee(),
          refreshDays(initialYear, initialMonth0),
          fetchMyLeaveBalances(),
          fetchMyRegularisationRequests("employee"),
        ]);
        if (cancelled) return;
        setEmployee(emp);
        setData(merged);
        setBalances(bal);
        setRegHistory(regs);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialYear, initialMonth0]);

  async function handleMonthChange(year: number, month0: number) {
    setCalYear(year);
    setCalMonth0(month0);
    try {
      const merged = await refreshDays(year, month0);
      setData(merged);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }

  async function handleSubmitLeave(input: LeaveSubmission) {
    try {
      await submitLeaveRequest(input);
      const fresh = await refreshDays(calYear, calMonth0);
      setData(fresh);
      toast.success("Applied for leave — pending manager approval");
    } catch (e) {
      toast.error(`Failed to apply: ${(e as Error).message}`);
      throw e;
    }
  }

  async function handleSubmitRegularisation(input: RegularisationSubmission) {
    try {
      await submitRegularisationRequest(input, "employee");
      const fresh = await fetchMyRegularisationRequests("employee");
      setRegHistory(fresh);
      toast.success("Regularisation submitted — pending manager approval");
    } catch (e) {
      toast.error(`Failed to submit: ${(e as Error).message}`);
      throw e;
    }
  }

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "100vh", background: "#f8f9fb" }}
    >
      <Sidebar
        employee={employee}
        navItems={mockAttendanceNavItems}
        version={APP_VERSION}
        location={APP_LOCATION}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="flex items-center justify-between px-6 bg-white shrink-0"
          style={{ height: 64, borderBottom: "1px solid #e5e7eb" }}
        >
          <nav className="flex items-center gap-2 text-sm">
            <span style={{ color: "#9ca3af" }}>Employee</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span className="font-medium text-gray-800">Attendance</span>
          </nav>

          <div className="flex items-center gap-3">
            <button
              className="relative flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ width: 36, height: 36 }}
            >
              <Bell size={19} style={{ color: "#6b7280" }} />
              <span
                className="absolute rounded-full"
                style={{ top: 7, right: 7, width: 7, height: 7, background: "#e91e8c" }}
              />
            </button>

            <div className="flex items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ width: 34, height: 34, background: "#7c3aed" }}
              >
                {employee.initials}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {employee.name.split(" ")[0]}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {loadError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Failed to load attendance: {loadError}
            </div>
          )}
          {/* Calendar renders immediately with the grid; cells fill in once data arrives */}
          <AttendanceCalendar
              data={data}
              initialYear={calYear}
              initialMonth={calMonth0}
              leaveBalances={balances}
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
        </main>
      </div>
    </div>
  );
}
