"use client";

import { useCallback, useEffect, useState } from "react";
import LeaveApprovalsTable from "@/components/manager/LeaveApprovalsTable";
import {
  enterpriseCardClass,
  enterpriseCardTitleClass,
  enterpriseLoadingClass,
  enterpriseSelectClass,
} from "@/lib/branding";
import {
  fetchOrgLeaveRequests,
  type ApprovalLeaveRequest,
} from "@/lib/hrms-client";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "forwarded" | "cancelled";

export default function AdminLeaveSection() {
  const [requests, setRequests] = useState<ApprovalLeaveRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async (status: StatusFilter) => {
    try {
      const data = await fetchOrgLeaveRequests({
        status,
        limit: 50,
      });
      setRequests(data.requests);
      setPendingCount(data.pendingCount);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload(statusFilter);
  }, [statusFilter, reload]);

  return (
    <>
      {loadError && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-[13px] rounded-md px-3.5 py-2.5">
          Failed to load leave: {loadError}
        </div>
      )}
      <div
        className={cn(
          enterpriseCardClass,
          "p-3 overflow-hidden flex flex-col flex-1 min-h-0",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className={enterpriseCardTitleClass}>All Leave</h3>
            {pendingCount > 0 && (
              <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">
                {pendingCount} pending
              </span>
            )}
          </div>
          <select
            aria-label="Filter by status"
            className={cn(enterpriseSelectClass, "w-auto min-w-[130px]")}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="forwarded">Forwarded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className={enterpriseLoadingClass}>Loading leave…</div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <LeaveApprovalsTable embedded readOnly requests={requests} />
          </div>
        )}
      </div>
    </>
  );
}
