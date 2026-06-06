"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Clock, XCircle } from "lucide-react";
import {
  employeeBtnOutlineSmClass,
  employeeBtnSmClass,
  employeeCardClass,
  employeeFilterLabelClass,
  employeeIconMd,
  employeeIconXs,
  employeeInputClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";
import type { LeaveRequest, LeaveStatus } from "@/lib/dashboard";

interface Props {
  requests: LeaveRequest[];
  onCancel?: (id: string) => void | Promise<void>;
  busyId?: string | null;
  attendanceHref?: string;
}

const STATUS_CLASS: Record<LeaveStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

const cancelIconBtnClass =
  "inline-flex items-center justify-center text-[#FF014F] hover:text-[#eb0249] bg-transparent border-0 cursor-pointer p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

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
  if (req.isHalfDay) return "0.5";
  return String(req.duration);
}

function StatusCell({ req }: { req: LeaveRequest }) {
  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${STATUS_CLASS[req.status]}`}
    >
      {req.status}
    </span>
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-7"
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
          <span className={employeeFilterLabelClass}>Reason for contesting</span>
          <textarea
            className={`${employeeInputClass} resize-y`}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why this should be converted to Earned Leave..."
            rows={3}
            value={note}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            className={employeeBtnOutlineSmClass}
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
  attendanceHref,
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
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={employeeFilterLabelClass} htmlFor="leave-status">
              Status
            </label>
            <select
              className={employeeSelectClass}
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
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="leave-page-size">
              Show entries
            </label>
            <select
              className={employeeSelectClass}
              id="leave-page-size"
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              value={pageSize}
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {attendanceHref && (
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <Link className={employeeBtnOutlineSmClass} href={attendanceHref}>
              <Clock className={employeeIconXs} />
              Open Attendance
            </Link>
          </div>
        )}
      </div>

      <div className={`${employeeCardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-nowrap">
                {[
                  "Applied On",
                  "Leave Type",
                  "Leave Period",
                  "Duration",
                  "Reason",
                  "Status",
                  "Approved On",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-sm text-gray-400"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                pageRows.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    <td className="px-6 py-4">{fmtDate(req.appliedOn)}</td>
                    <td className="px-6 py-4 font-medium">{req.leaveTypeCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {leavePeriod(req.startDate, req.endDate)}
                    </td>
                    <td className="px-6 py-4">{durationLabel(req)}</td>
                    <td className="px-6 py-4">{req.reason}</td>
                    <td className="px-6 py-4">
                      <StatusCell req={req} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtDateTime(req.approvedOn)}
                    </td>
                    <td className="px-6 py-4">
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
                          title={busyId === req.id ? "Cancelling…" : "Cancel"}
                          type="button"
                        >
                          <XCircle className={employeeIconMd} />
                        </button>
                      )}
                      {req.status === "Approved" && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors"
                          onClick={() => setContesting(req)}
                          type="button"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Contest Leave
                        </button>
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
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 m-0">
              Showing <span className="font-medium">{rangeStart}</span> to{" "}
              <span className="font-medium">{rangeEnd}</span> of{" "}
              <span className="font-medium">{filtered.length}</span> results
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
                    className={[
                      "px-4 py-2 text-sm rounded-lg transition-colors border",
                      p === safePage
                        ? "text-white bg-[#FF014F] border-[#FF014F] hover:bg-[#eb0249]"
                        : "text-gray-600 bg-white border-gray-300 hover:bg-gray-50",
                    ].join(" ")}
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

      {contesting && (
        <ContestModal req={contesting} onClose={() => setContesting(null)} />
      )}
    </>
  );
}
