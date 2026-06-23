"use client";

import { useState } from "react";
import { AlertCircle, FileText, XCircle } from "lucide-react";
import {
  enterpriseBtnOutlineSmClass,
  enterpriseFilterLabelClass,
  enterpriseInputClass,
  enterprisePaginationActiveClass,
  enterprisePaginationBtnClass,
  enterprisePaginationInactiveClass,
  enterpriseSelectClass,
} from "@/lib/branding";
import type { LeaveDocument, LeaveRequest, LeaveStatus } from "@/lib/dashboard";
import { formatDayCount } from "@/lib/format-day-count";
import { cn } from "@/lib/utils";
import {
  tableBodyCellClass,
  tableBodyRowClass,
  tableHeadCellClass,
} from "@/components/manager/team-attendance-shared";

interface Props {
  requests: LeaveRequest[];
  onCancel?: (id: string) => void | Promise<void>;
  busyId?: string | null;
  embedded?: boolean;
}

const STATUS_CLASS: Record<LeaveStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

const cancelIconBtnClass =
  "inline-flex items-center justify-center text-[lab(52%_28_-70)] hover:text-[lab(36.9089%_35.0961_-85.6872)] bg-transparent border-0 cursor-pointer p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

function leavePeriod(start: string, end: string) {
  if (start === end) return fmtDate(start);
  const s = new Date(start);
  const e = new Date(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    const month = s.toLocaleDateString("en-GB", { month: "short" });
    const year = s.getFullYear();
    return `${String(s.getDate()).padStart(2, "0")}–${String(e.getDate()).padStart(2, "0")} ${month} ${year}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function durationLabel(req: LeaveRequest) {
  return formatDayCount(req.duration);
}

function StatusCell({ req }: { req: LeaveRequest }) {
  return (
    <span
      className={cn(
        "inline-block px-3 py-1 text-xs font-medium rounded-full",
        STATUS_CLASS[req.status],
      )}
    >
      {req.status}
    </span>
  );
}

function LeaveDocumentsCell({ documents }: { documents?: LeaveDocument[] }) {
  if (!documents?.length) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {documents.map((doc) =>
        doc.kind === "image" ? (
          <a
            key={doc.url}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            title={doc.name}
            className="block shrink-0 rounded-md border border-slate-200 overflow-hidden hover:ring-2 hover:ring-pink-300 transition-shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={doc.name}
              className="h-10 w-10 object-cover bg-slate-50"
              src={doc.url}
            />
          </a>
        ) : (
          <a
            key={doc.url}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            title={doc.name}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[88px] truncate">PDF</span>
          </a>
        ),
      )}
    </div>
  );
}

interface ContestModalProps {
  req: LeaveRequest;
  onClose: () => void;
}

function ContestModal({ req, onClose }: ContestModalProps) {
  const [note, setNote] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-2xl w-full max-w-md p-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 m-0 mb-1.5">
          Contest Leave
        </h2>
        <p className="text-sm text-gray-500 mb-5 m-0">
          This will request conversion of your <strong>{req.leaveType}</strong> (
          {leavePeriod(req.startDate, req.endDate)}) to{" "}
          <strong>Earned Leave</strong>.
        </p>

        <label className="block mb-5">
          <span className={enterpriseFilterLabelClass}>Reason for contesting</span>
          <textarea
            className={cn(enterpriseInputClass, "h-auto min-h-[80px] py-2 resize-y")}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why this should be converted to Earned Leave..."
            rows={3}
            value={note}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            className={enterpriseBtnOutlineSmClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeaveTable({
  requests,
  onCancel,
  busyId,
  embedded = false,
}: Props) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "All">("All");
  const [contesting, setContesting] = useState<LeaveRequest | null>(null);

  const filtered = requests.filter((r) =>
    statusFilter === "All" ? true : r.status === statusFilter,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + pageSize, filtered.length);

  return (
    <div className={cn("flex flex-col h-full min-h-0", !embedded && "gap-6")}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 shrink-0">
        {!embedded && (
          <h3 className="text-[15px] font-bold text-gray-900 m-0">
            Leave Requests
          </h3>
        )}
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            embedded && "ml-auto w-full justify-end",
          )}
        >
          <select
            aria-label="Filter by status"
            className={cn(enterpriseSelectClass, "w-auto min-w-[130px]")}
            id="leave-status"
            onChange={(e) => {
              setStatusFilter(e.target.value as LeaveStatus | "All");
              setPage(1);
            }}
            value={statusFilter}
          >
            {(["All", "Pending", "Approved", "Rejected", "Cancelled"] as const).map(
              (s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Status" : s}
                </option>
              ),
            )}
          </select>
          <select
            aria-label="Page size"
            className={cn(enterpriseSelectClass, "w-auto min-w-[100px]")}
            id="leave-page-size"
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            value={pageSize}
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                Show {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-md">
        <table className="w-full min-w-[1020px] border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-200">
              {[
                "Applied On",
                "Leave Type",
                "Leave Period",
                "Duration",
                "Reason",
                "Documents",
                "Status",
                "Approved On",
                "Action",
              ].map((h) => (
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
                  colSpan={9}
                  className="px-6 py-8 text-center text-sm text-gray-400"
                >
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((req) => (
                <tr key={req.id} className={tableBodyRowClass}>
                  <td className={tableBodyCellClass}>{fmtDate(req.appliedOn)}</td>
                  <td className={cn(tableBodyCellClass, "font-medium")}>
                    {req.leaveTypeCode}
                  </td>
                  <td className={cn(tableBodyCellClass, "whitespace-nowrap")}>
                    {leavePeriod(req.startDate, req.endDate)}
                  </td>
                  <td className={tableBodyCellClass}>{durationLabel(req)}</td>
                  <td className={tableBodyCellClass}>{req.reason}</td>
                  <td className={tableBodyCellClass}>
                    <LeaveDocumentsCell documents={req.documents} />
                  </td>
                  <td className={tableBodyCellClass}>
                    <StatusCell req={req} />
                  </td>
                  <td className={cn(tableBodyCellClass, "whitespace-nowrap")}>
                    {fmtDateTime(req.approvedOn)}
                  </td>
                  <td className={tableBodyCellClass}>
                    {req.status === "Pending" && (
                      <button
                        aria-label={
                          busyId === req.id
                            ? "Cancelling leave request"
                            : "Cancel leave request"
                        }
                        className={cancelIconBtnClass}
                        disabled={!onCancel || busyId === req.id}
                        onClick={() => onCancel?.(req.id)}
                        title={busyId === req.id ? "Cancelling…" : "Cancel request"}
                        type="button"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                    {req.status === "Approved" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors"
                          onClick={() => setContesting(req)}
                          type="button"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Contest
                        </button>
                        <button
                          aria-label="Cancel approved leave"
                          className={cancelIconBtnClass}
                          disabled={!onCancel || busyId === req.id}
                          onClick={() => {
                            if (window.confirm("Cancel this approved leave? This cannot be undone.")) {
                              onCancel?.(req.id);
                            }
                          }}
                          title={busyId === req.id ? "Cancelling…" : "Cancel leave"}
                          type="button"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {(req.status === "Cancelled" || req.status === "Rejected") && (
                      <span className="text-sm text-gray-400">No action</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 shrink-0">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{filtered.length}</span> results
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

      {contesting && (
        <ContestModal req={contesting} onClose={() => setContesting(null)} />
      )}
    </div>
  );
}
