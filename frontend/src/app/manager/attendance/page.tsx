"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  LeaveSubmission,
  RegularisationHistoryItem,
  RegularisationSubmission,
} from "@/components/attendance/AttendanceCalendar";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import {
  type DayAttendance,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/dashboard";
import {
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

export default function ManagerAttendancePage() {
  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth0 = today.getMonth();
  const monthStart = new Date(initialYear, initialMonth0, 1);
  const monthEnd = new Date(initialYear, initialMonth0 + 1, 0);

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
        const [merged, bal, regs] = await Promise.all([
          refreshDays(),
          fetchManagerLeaveBalances(),
          fetchMyRegularisationRequests("manager"),
        ]);
        if (cancelled) return;
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
    <>
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
    </>
  );
}
