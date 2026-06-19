"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
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
import {
  enterpriseCardClass,
  enterpriseCardTitleClass,
} from "@/lib/branding";
import { cn } from "@/lib/utils";

function fetchOwnLeaveRequests(
  role: Role,
  managerApisAvailable: boolean,
): Promise<LeaveRequest[]> {
  if (role === "manager" && managerApisAvailable) {
    return fetchManagerLeaveRequests();
  }
  return fetchMyLeaveRequests();
}

export default function MyLeaveSection({
  role,
  title = "My Leave",
}: {
  role: Role;
  title?: string;
}) {
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
        <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-[13px] rounded-md px-3.5 py-2.5">
          Failed to load leave: {loadError}
        </div>
      )}
      {loading || (role === "manager" && managerProbeLoading) ? (
        <div className="p-6 text-gray-500">Loading leave…</div>
      ) : (
        <div
          className={cn(
            enterpriseCardClass,
            "p-3 overflow-hidden flex flex-col flex-1 min-h-0",
          )}
        >
          <div className="flex items-center justify-between shrink-0 mb-2 gap-3">
            <h3 className={enterpriseCardTitleClass}>{title}</h3>
            <Link
              href="/attendance?apply=1"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] shadow-sm hover:shadow-md transition-shadow shrink-0"
            >
              <Plus size={14} /> Apply Leave
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
