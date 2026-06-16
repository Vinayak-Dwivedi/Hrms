"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import LeaveApprovalsTable from "@/components/manager/LeaveApprovalsTable";
import RejectApprovalModal from "@/components/manager/RejectApprovalModal";
import { employeeErrorBannerClass } from "@/features/employees/employee-theme";
import {
  approveLeaveRequest,
  fetchLeaveApprovals,
  forwardLeaveRequest,
  rejectLeaveRequest,
  type ApprovalLeaveRequest,
} from "@/lib/hrms-client";

export default function TeamLeaveSection() {
  const [requests, setRequests] = useState<ApprovalLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const rows = await fetchLeaveApprovals("all");
      setRequests(rows);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
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
        <div className={employeeErrorBannerClass}>
          Failed to load team leave: {loadError}
        </div>
      )}
      <div
        className="rounded-2xl bg-white border border-gray-200 p-4 overflow-hidden flex flex-col"
        style={{ height: "calc(100vh - 6rem)" }}
      >
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <h3 className="text-[15px] font-bold text-gray-900 m-0">Team Leave</h3>
          <Link
            href="/manager/approvals"
            className="text-[12px] font-semibold text-[#be185d] no-underline hover:text-[#eb0249]"
          >
            View all approvals â†’
          </Link>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Loading team leaveâ€¦</div>
        ) : (
          <LeaveApprovalsTable
            busyId={busyId}
            embedded
            onApprove={handleApprove}
            onForward={handleForward}
            onOpenReject={setRejectId}
            requests={requests}
          />
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
