"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import LeaveApprovalsTable from "@/components/manager/LeaveApprovalsTable";
import RejectApprovalModal from "@/components/manager/RejectApprovalModal";
import {
  enterpriseCardClass,
  enterpriseCardTitleClass,
  enterpriseLinkClass,
  enterpriseLoadingClass,
} from "@/lib/branding";
import {
  approveLeaveRequest,
  fetchLeaveApprovals,
  forwardLeaveRequest,
  rejectLeaveRequest,
  type ApprovalLeaveRequest,
} from "@/lib/hrms-client";
import { cn } from "@/lib/utils";

export default function TeamLeaveSection() {
  const [requests, setRequests] = useState<ApprovalLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const rows = await fetchLeaveApprovals("all");
      setRequests(rows);
      setLoadError(null);
      setNoTeam(false);
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.toLowerCase().includes("not a reporting manager")) {
        setNoTeam(true);
      } else {
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      await approveLeaveRequest(id);
      await reload();
      toast.success("Leave approved");
    } catch (e) {
      toast.error(`Failed to approve: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleForward(id: number) {
    setBusyId(id);
    try {
      await forwardLeaveRequest(id);
      await reload();
      toast.success("Forwarded to HR");
    } catch (e) {
      toast.error(`Failed to forward: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(remarks: string) {
    if (rejectId == null) return;
    setBusyId(rejectId);
    try {
      await rejectLeaveRequest(rejectId, remarks || undefined);
      setRejectId(null);
      await reload();
      toast.success("Leave rejected");
    } catch (e) {
      toast.error(`Failed to reject: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  const rejectTarget =
    rejectId != null ? requests.find((r) => r.id === rejectId) : null;

  return (
    <>
      {loadError && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-[13px] rounded-md px-3.5 py-2.5">
          Failed to load team leave: {loadError}
        </div>
      )}
      <div
        className={cn(
          enterpriseCardClass,
          "p-3 overflow-hidden flex flex-col flex-1 min-h-0",
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
          <h3 className={enterpriseCardTitleClass}>Team Leave</h3>
          <Link
            href="/manager/approvals"
            className={cn(enterpriseLinkClass, "text-[12px] hover:underline shrink-0")}
          >
            View all approvals →
          </Link>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Loading team leave…</div>
        ) : noTeam ? (
          <div className="flex flex-1 items-center justify-center py-12 text-center text-sm text-gray-400">
            No team members under you yet.
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <LeaveApprovalsTable
              busyId={busyId}
              embedded
              onApprove={handleApprove}
              onForward={handleForward}
              onOpenReject={setRejectId}
              requests={requests}
            />
          </div>
        )}
      </div>

      {rejectTarget && (
        <RejectApprovalModal
          busy={busyId === rejectTarget.id}
          onClose={() => setRejectId(null)}
          onConfirm={handleReject}
          subtitle={
            <>
              Reject leave for{" "}
              <strong>
                {rejectTarget.firstName} {rejectTarget.lastName}
              </strong>{" "}
              ({rejectTarget.leaveTypeName}).
            </>
          }
          title="Reject Leave"
        />
      )}
    </>
  );
}
