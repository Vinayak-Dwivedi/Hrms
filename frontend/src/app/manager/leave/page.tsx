"use client";

import { useEffect, useState } from "react";
import LeaveTable from "@/components/leave/LeaveTable";
import {
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import { type LeaveRequest } from "@/lib/dashboard";
import {
  cancelLeaveRequest,
  fetchManagerLeaveRequests,
} from "@/lib/hrms-client";

export default function ManagerLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lr = await fetchManagerLeaveRequests();
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
  }, []);

  async function handleCancel(id: string) {
    setBusyId(id);
    setLoadError(null);
    try {
      await cancelLeaveRequest(id);
      const fresh = await fetchManagerLeaveRequests();
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
      {loading ? (
        <div className={employeeLoadingClass}>Loading leave requests…</div>
      ) : (
        <LeaveTable
          attendanceHref="/manager/attendance"
          busyId={busyId}
          onCancel={handleCancel}
          requests={requests}
        />
      )}
    </>
  );
}
