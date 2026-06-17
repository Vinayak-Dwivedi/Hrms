"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LeaveTable from "@/components/leave/LeaveTable";
import type { LeaveRequest } from "@/lib/dashboard";
import {
  cancelLeaveRequest,
  fetchManagerLeaveRequests,
  fetchMyLeaveRequests,
} from "@/lib/hrms-client";
import type { Role } from "@/lib/roles";
import { useReportingManagerAvailable } from "@/lib/use-reporting-manager-available";

function fetchOwnLeaveRequests(
  role: Role,
  managerApisAvailable: boolean,
): Promise<LeaveRequest[]> {
  if (role === "manager" && managerApisAvailable) {
    return fetchManagerLeaveRequests();
  }
  return fetchMyLeaveRequests();
}

export default function MyLeaveSection({ role }: { role: Role }) {
  const { available: reportingManager, loading: managerProbeLoading } =
    useReportingManagerAvailable();
  const useManagerApis = role === "manager" && reportingManager;

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (role === "manager" && managerProbeLoading) return;

    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchOwnLeaveRequests(role, useManagerApis);
        if (!cancelled) {
          setRequests(rows);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, useManagerApis, managerProbeLoading]);

  async function handleCancel(id: string) {
    setBusyId(id);
    setLoadError(null);
    try {
      await cancelLeaveRequest(id);
      const fresh = await fetchOwnLeaveRequests(role, useManagerApis);
      setRequests(fresh);
      toast.success("Leave request cancelled");
    } catch (e) {
      setLoadError((e as Error).message);
      toast.error(`Failed to cancel: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {loadError && (
        <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-[13px] rounded-lg px-3.5 py-2.5">
          Failed to load leave: {loadError}
        </div>
      )}
      {loading || (role === "manager" && managerProbeLoading) ? (
        <div className="p-6 text-gray-500">Loading leaveâ€¦</div>
      ) : (
        <div
          className="rounded-2xl bg-white border border-gray-200 p-4 overflow-hidden flex flex-col"
          style={{ height: "calc(100vh - 6rem)" }}
        >
          <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
            <h3 className="text-[15px] font-bold text-gray-900 m-0">My Leave</h3>
            <Link
              href="/attendance"
              className="text-[12px] font-semibold text-[#be185d] no-underline hover:text-[#eb0249]"
            >
              Apply Leave â†’
            </Link>
          </div>
          <LeaveTable
            busyId={busyId}
            embedded
            onCancel={handleCancel}
            requests={requests}
          />
        </div>
      )}
    </>
  );
}
