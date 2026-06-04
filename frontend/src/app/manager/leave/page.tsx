"use client";

import { useEffect, useState } from "react";
import LeaveTable from "@/components/leave/LeaveTable";
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
        <div
          className="mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Failed to load leave requests: {loadError}
        </div>
      )}
      {loading ? (
        <div
          className="rounded-2xl bg-white p-8 text-center"
          style={{ border: "1px solid #e5e7eb", color: "#6b7280" }}
        >
          Loading leave requests…
        </div>
      ) : (
        <LeaveTable
          requests={requests}
          onCancel={handleCancel}
          busyId={busyId}
        />
      )}
    </>
  );
}
