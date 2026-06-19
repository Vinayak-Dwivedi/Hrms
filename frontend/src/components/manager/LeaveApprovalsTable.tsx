"use client";

import { ArrowUpRight, Check, MessageSquareText, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  enterpriseCardClass,
  enterpriseLeaveTypeBadgeClass,
  enterprisePaginationActiveClass,
  enterprisePaginationBtnClass,
  enterprisePaginationInactiveClass,
} from "@/lib/branding";
import type { ApprovalLeaveRequest } from "@/lib/hrms-client";
import { cn } from "@/lib/utils";
import {
  APPROVAL_STATUS_CLASS,
  approveIconBtnClass,
  fmtAppliedOn,
  fmtDaysCount,
  fmtRangeDatesOnly,
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
  const [reasonView, setReasonView] = useState<{
    name: string;
    reason: string;
  } | null>(null);

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
        "Code",
        "Period",
        "Duration",
        "Reason",
        "Applied",
        "Status",
           "Manager",
      ]
    : [
        "Employee",
       
        "Emp ID",
        "Code",
        "Period",
        "Duration",
        "Reason",
        "Applied",
        "Status",
         "Manager",
        "Action",
      ];

  return (
    <div
      className={embedded ? "flex flex-col h-full overflow-hidden" : cn(enterpriseCardClass, "overflow-hidden")}
    >
      <div className={embedded ? "flex-1 min-h-0 overflow-auto" : "overflow-x-auto"}>
        <table className="w-full min-w-[1100px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-nowrap">
              {headers.map((h) => (
                <th key={h} className={tableHeadCellClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                          {req.designation ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                 
                  <td className={tableBodyCellClass}>{req.empId}</td>
                  <td className={tableBodyCellClass}>
                    <span className={enterpriseLeaveTypeBadgeClass} title={req.leaveTypeName}>
                      {req.leaveTypeCode}
                    </span>
                  </td>
                  <td className={`${tableBodyCellClass} whitespace-nowrap`}>
                    {fmtRangeDatesOnly(req.fromDate, req.toDate)}
                  </td>
                  <td className={tableBodyCellClass}>{fmtDaysCount(req.days)}</td>
                  <td className={tableBodyCellClass}>
                    {req.reason ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReasonView({
                            name: `${req.firstName} ${req.lastName}`,
                            reason: req.reason,
                          })
                        }
                        className="inline-flex items-center gap-1.5 max-w-[200px] text-blue-600 hover:text-blue-800"
                        title="View reason"
                      >
                        <MessageSquareText className="w-4 h-4 shrink-0" />
                        <span className="truncate text-sm">{req.reason}</span>
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
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
                   <td className={tableBodyCellClass}>
                    <span className="text-sm text-gray-600">
                      {req.reportingManager ?? "—"}
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
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            aria-label={`Reject leave for ${req.firstName} ${req.lastName}`}
                            className={rejectIconBtnClass}
                            disabled={busyId === req.id}
                            onClick={() => onOpenReject?.(req.id)}
                            title="Reject"
                            type="button"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            aria-label={`Forward leave for ${req.firstName} ${req.lastName}`}
                            className={forwardIconBtnClass}
                            disabled={busyId === req.id}
                            onClick={() => onForward?.(req.id)}
                            title="Forward to HR"
                            type="button"
                          >
                            <ArrowUpRight className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
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
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{requests.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className={enterprisePaginationBtnClass}
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
                    p === safePage
                      ? enterprisePaginationActiveClass
                      : enterprisePaginationInactiveClass,
                  )}
                  onClick={() => setPage(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            <button
              className={enterprisePaginationBtnClass}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {reasonView &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
            onClick={() => setReasonView(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-[440px] max-h-[80vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-[16px] font-bold text-gray-900 leading-tight">
                    Leave reason
                  </h2>
                  <p className="text-[12.5px] text-gray-500 mt-0.5">
                    {reasonView.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReasonView(null)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-4">
                <p className="text-[13.5px] text-gray-700 whitespace-pre-wrap break-words">
                  {reasonView.reason}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
