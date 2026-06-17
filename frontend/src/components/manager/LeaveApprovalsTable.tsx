"use client";

import { ArrowUpRight, Check, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  employeeCardClass,
  employeeIconMd,
} from "@/features/employees/employee-theme";
import type { ApprovalLeaveRequest } from "@/lib/hrms-client";
import { cn } from "@/lib/utils";
import {
  APPROVAL_STATUS_CLASS,
  approveIconBtnClass,
  fmtAppliedOn,
  fmtRange,
  forwardIconBtnClass,
  PAGE_SIZE,
  rejectIconBtnClass,
} from "./approvals-shared";
import {
  avatarClassFor,
  initials,
  tableBodyCellClass,
  tableBodyRowClass,
  tableHeadCellClass,
} from "./team-attendance-shared";

interface Props {
  requests: ApprovalLeaveRequest[];
  busyId?: number | null;
  embedded?: boolean;
  readOnly?: boolean;
  onApprove?: (id: number) => void;
  onForward?: (id: number) => void;
  onOpenReject?: (id: number) => void;
}

export default function LeaveApprovalsTable({
  requests,
  busyId,
  embedded = false,
  readOnly = false,
  onApprove,
  onForward,
  onOpenReject,
}: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => requests.slice(start, start + PAGE_SIZE),
    [requests, start],
  );

  const rangeStart = requests.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, requests.length);

  const headers = readOnly
    ? [
        "Employee",
        "Emp ID",
        "Leave Type",
        "Period",
        "Duration",
        "Reason",
        "Applied",
        "Status",
      ]
    : [
        "Employee",
        "Emp ID",
        "Leave Type",
        "Period",
        "Duration",
        "Reason",
        "Applied",
        "Status",
        "Action",
      ];

  return (
    <div
      className={embedded ? "overflow-hidden" : `${employeeCardClass} overflow-hidden`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-nowrap">
              {headers.map((h) => (
                <th key={h} className={tableHeadCellClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-10 text-center text-sm text-gray-400"
                  colSpan={headers.length}
                >
                  No requests found.
                </td>
              </tr>
            ) : (
              pageRows.map((req) => (
                <tr key={req.id} className={tableBodyRowClass}>
                  <td className={tableBodyCellClass}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                          avatarClassFor(req.empId),
                        )}
                      >
                        {initials(req.firstName, req.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 m-0 truncate">
                          {req.firstName} {req.lastName}
                        </p>
                        <p className="text-xs text-gray-400 m-0 truncate">
                          {req.designation ?? "â€”"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={tableBodyCellClass}>{req.empId}</td>
                  <td className={tableBodyCellClass}>
                    <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-pink-100 text-[#ff014f]">
                      {req.leaveTypeName}
                    </span>
                  </td>
                  <td className={`${tableBodyCellClass} whitespace-nowrap`}>
                    {fmtRange(req.fromDate, req.toDate, req.days)}
                  </td>
                  <td className={tableBodyCellClass}>{req.durationType}</td>
                  <td className={tableBodyCellClass}>
                    <span
                      className="block max-w-[200px] truncate"
                      title={req.reason}
                    >
                      {req.reason}
                    </span>
                  </td>
                  <td className={`${tableBodyCellClass} whitespace-nowrap`}>
                    {fmtAppliedOn(req.appliedOn)}
                  </td>
                  <td className={tableBodyCellClass}>
                    <span
                      className={cn(
                        "inline-flex px-3 py-1 text-xs font-medium rounded-full",
                        APPROVAL_STATUS_CLASS[req.status] ??
                          "bg-gray-100 text-gray-600",
                      )}
                    >
                      {req.status}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className={tableBodyCellClass}>
                      {req.status === "Pending" ? (
                        <div className="flex items-center gap-3">
                          <button
                            aria-label={`Approve leave for ${req.firstName} ${req.lastName}`}
                            className={approveIconBtnClass}
                            disabled={busyId === req.id}
                            onClick={() => onApprove?.(req.id)}
                            title="Approve"
                            type="button"
                          >
                            <Check className={employeeIconMd} />
                          </button>
                          <button
                            aria-label={`Reject leave for ${req.firstName} ${req.lastName}`}
                            className={rejectIconBtnClass}
                            disabled={busyId === req.id}
                            onClick={() => onOpenReject?.(req.id)}
                            title="Reject"
                            type="button"
                          >
                            <XCircle className={employeeIconMd} />
                          </button>
                          <button
                            aria-label={`Forward leave for ${req.firstName} ${req.lastName}`}
                            className={forwardIconBtnClass}
                            disabled={busyId === req.id}
                            onClick={() => onForward?.(req.id)}
                            title="Forward to HR"
                            type="button"
                          >
                            <ArrowUpRight className={employeeIconMd} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">â€”</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {requests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{requests.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              type="button"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg transition-colors border",
                    p === safePage
                      ? "text-white bg-[#ff014f] border-[#ff014f] hover:bg-[#eb0249]"
                      : "text-gray-600 bg-white border-gray-300 hover:bg-gray-50",
                  )}
                  onClick={() => setPage(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            <button
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
