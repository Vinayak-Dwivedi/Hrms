"use client";

import { useEffect, useState } from "react";
import LeaveTable from "@/components/leave/LeaveTable";
import MyCompOff from "@/features/comp-off/MyCompOff";
import MyLeaveBalances from "@/features/comp-off/MyLeaveBalances";
import {
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import { type LeaveRequest } from "@/lib/dashboard";
import { useAuth } from "@/lib/auth-context";
import {
  cancelLeaveRequest,
  fetchManagerLeaveRequests,
  fetchMyLeaveRequests,
} from "@/lib/hrms-client";

export default function LeavePage() {
  const { hasPermission } = useAuth();
  const useManagerApi = hasPermission("leave.approve");

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    return useManagerApi
      ? fetchManagerLeaveRequests()
      : fetchMyLeaveRequests();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lr = await loadRequests();
        if (cancelled) return;
        setRequests(lr);
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
  }, [useManagerApi]);

  async function handleCancel(id: string) {
    setBusyId(id);
    setLoadError(null);
    try {
      await cancelLeaveRequest(id);
      const fresh = await loadRequests();
      setRequests(fresh);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load leave requests: {loadError}
        </div>
      )}
      <MyLeaveBalances />
      <MyCompOff />
      {loading ? (
        <div className={employeeLoadingClass}>Loading leave requests…</div>
      ) : (
        <LeaveTable
          attendanceHref="/attendance"
          busyId={busyId}
          onCancel={handleCancel}
          requests={requests}
        />
      )}
    </>
  );
}
