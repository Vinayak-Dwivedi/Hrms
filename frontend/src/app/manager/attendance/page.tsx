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
import ManagerSidebar from "@/components/manager/ManagerSidebar";
import {
  type DayAttendance,
  type Employee,
  type LeaveRequest,
  type LeaveType,
  mockManager,
} from "@/lib/dashboard";
import {
  fetchCurrentManager,
  fetchManagerLeaveBalances,
  fetchManagerLeaveRequests,
  fetchManagerMonthAttendance,
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
  // Sort so Pending is processed first, Approved last → Approved wins on
  // same-date conflicts. Rejected/Cancelled are dropped entirely.
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

export default function ManagerAttendancePage() {
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
  const monthStart = new Date(initialYear, initialMonth0, 1);
  const monthEnd = new Date(initialYear, initialMonth0 + 1, 0);

  const [manager, setManager] = useState<Employee>(mockManager);
  const [data, setData] = useState<DayAttendance[]>([]);
  const [balances, setBalances] = useState<LeaveType[]>([]);
  const [regHistory, setRegHistory] = useState<MyRegularisationRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshDays(): Promise<DayAttendance[]> {
    const [days, leaves] = await Promise.all([
      fetchManagerMonthAttendance(initialYear, initialMonth0 + 1),
      fetchManagerLeaveRequests(),
    ]);
    return mergeLeavesIntoDays(days, leaves, monthStart, monthEnd);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mgr, merged, bal, regs] = await Promise.all([
          fetchCurrentManager(),
          refreshDays(),
          fetchManagerLeaveBalances(),
          fetchMyRegularisationRequests("manager"),
        ]);
        if (cancelled) return;
        setManager(mgr);
        setData(merged);
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
  }, [initialYear, initialMonth0]);

  async function handleSubmitLeave(input: LeaveSubmission) {
    try {
      await submitLeaveRequest(input);
      const fresh = await refreshDays();
      setData(fresh);
      toast.success("Applied for leave — pending approval");
    } catch (e) {
      toast.error(`Failed to apply: ${(e as Error).message}`);
      throw e;
    }
  }

  async function handleSubmitRegularisation(input: RegularisationSubmission) {
    try {
      await submitRegularisationRequest(input, "manager");
      const fresh = await fetchMyRegularisationRequests("manager");
      setRegHistory(fresh);
      toast.success("Regularisation submitted — pending approval");
    } catch (e) {
      toast.error(`Failed to submit: ${(e as Error).message}`);
      throw e;
    }
  }

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#f8f9fb" }}>
      <ManagerSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="flex items-center justify-between px-6 bg-white shrink-0"
          style={{ height: "64px", borderBottom: "1px solid #e5e7eb" }}
        >
          <nav className="flex items-center gap-2 text-sm">
            <span style={{ color: "#9ca3af" }}>Manager</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span className="font-medium text-gray-800">My Attendance</span>
          </nav>

          <div className="flex items-center gap-3">

            <button
              className="relative flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ width: "36px", height: "36px" }}
            >
              <Bell size={19} style={{ color: "#6b7280" }} />
              <span
                className="absolute rounded-full"
                style={{ top: "7px", right: "7px", width: "7px", height: "7px", background: "#e91e8c" }}
              />
            </button>

            <div className="flex items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ width: "34px", height: "34px", background: "#dc143c" }}
              >
                {manager.initials}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {manager.name.split(" ")[0]}
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
          {loading ? (
            <div style={{ padding: 24, color: "#6b7280" }}>Loading attendance…</div>
          ) : (
            <AttendanceCalendar
              data={data}
              initialYear={initialYear}
              initialMonth={initialMonth0}
              leaveBalances={balances}
              onSubmitLeave={handleSubmitLeave}
              onSubmitRegularisation={handleSubmitRegularisation}
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
          )}
        </main>
      </div>
    </div>
  );
}
