"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type ApprovalLeaveRequest,
  type ApprovalRegRequest,
  approveLeaveRequest,
  approveRegRequest,
  fetchLeaveApprovals,
  fetchRegularisationApprovals,
  forwardLeaveRequest,
  rejectLeaveRequest,
  rejectRegRequest,
} from "@/lib/hrms-client";

const AVATAR_PALETTE = [
  "#7c3aed",
  "#0f766e",
  "#4338ca",
  "#0369a1",
  "#be185d",
  "#15803d",
  "#b91c1c",
  "#92400e",
  "#1d4ed8",
  "#0d9488",
  "#6d28d9",
  "#b45309",
];

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function colorFor(empId: string) {
  let h = 0;
  for (const c of empId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRange(from: string, to: string, days: string) {
  const f = new Date(from);
  const t = new Date(to);
  const opt: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  if (from === to)
    return `${f.toLocaleDateString("en-GB", opt)} (${days} Day${Number(days) === 1 ? "" : "s"})`;
  return `${f.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString("en-GB", opt)} (${days} Days)`;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

// ── Pills ─────────────────────────────────────────────────────────────────────

const LEAVE_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  AL: { bg: "#fde7ef", color: "#db2777" }, // Annual Leave – pink
  SL: { bg: "#fee2e2", color: "#dc2626" }, // Sick Leave – red
  CL: { bg: "#dbeafe", color: "#2563eb" }, // Casual Leave – blue
  CO: { bg: "#fef3c7", color: "#b45309" }, // Compensatory Off – amber
  EL: { bg: "#dcfce7", color: "#15803d" }, // Earned Leave – green
};

// Soft palette used to colour free-text pills (e.g. regularisation issue type).
const PILL_PALETTE = [
  { bg: "#fde7ef", color: "#db2777" },
  { bg: "#dbeafe", color: "#2563eb" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#ede9fe", color: "#7c3aed" },
  { bg: "#e0f2fe", color: "#0369a1" },
];

function pillFor(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PILL_PALETTE[h % PILL_PALETTE.length];
}

function Pill({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color,
        fontWeight: 600,
        fontSize: 12,
        borderRadius: 6,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function LeaveTypePill({ code, name }: { code: string; name: string }) {
  const s = LEAVE_TYPE_STYLE[code] ?? { bg: "#f3f4f6", color: "#4b5563" };
  return <Pill label={name} bg={s.bg} color={s.color} />;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#fef9c3", color: "#b45309" },
  Approved: { bg: "#dcfce7", color: "#15803d" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c" },
  Forwarded: { bg: "#dbeafe", color: "#1d4ed8" },
  Cancelled: { bg: "#f3f4f6", color: "#6b7280" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Pending;
  return <Pill label={status} bg={s.bg} color={s.color} />;
}

// ── Reject modal (shared by leave + regularisation) ───────────────────────────

function RejectModal({
  title,
  subtitle,
  onClose,
  onConfirm,
  busy,
}: {
  title: string;
  subtitle: React.ReactNode;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 440,
          padding: "28px 28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 6,
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          {subtitle}
        </p>
        <label style={{ display: "block", marginBottom: 20 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
            Reason for rejection
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Share context with the employee..."
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
              color: "#111827",
              background: "#fff",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(reason)}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: "#dc143c",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter toolbar (shared) ───────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  height: 42,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 13,
  color: "#374151",
  outline: "none",
  boxSizing: "border-box",
};

export interface ApprovalFilters {
  search: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FILTERS: ApprovalFilters = {
  search: "",
  type: "",
  status: "",
  startDate: "",
  endDate: "",
};

function FilterToolbar({
  filters,
  onChange,
  onReset,
  searchPlaceholder,
  typeLabel,
  typeOptions,
  statusOptions,
}: {
  filters: ApprovalFilters;
  onChange: (next: ApprovalFilters) => void;
  onReset: () => void;
  searchPlaceholder: string;
  typeLabel: string;
  typeOptions: { value: string; label: string }[];
  statusOptions: string[];
}) {
  const set = (patch: Partial<ApprovalFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-3"
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #eef0f3",
      }}
    >
      {/* Search */}
      <div className="relative flex-1" style={{ minWidth: 220 }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: 13,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af",
          }}
        />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder={searchPlaceholder}
          style={{ ...inputBase, width: "100%", padding: "0 12px 0 38px" }}
        />
      </div>

      {/* Type */}
      <div className="relative" style={{ minWidth: 150 }}>
        <select
          value={filters.type}
          onChange={(e) => set({ type: e.target.value })}
          style={{
            ...inputBase,
            width: "100%",
            padding: "0 34px 0 12px",
            appearance: "none",
            cursor: "pointer",
            color: filters.type ? "#374151" : "#9ca3af",
          }}
        >
          <option value="">{typeLabel}</option>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value} style={{ color: "#374151" }}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Status */}
      <div className="relative" style={{ minWidth: 140 }}>
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          style={{
            ...inputBase,
            width: "100%",
            padding: "0 34px 0 12px",
            appearance: "none",
            cursor: "pointer",
            color: filters.status ? "#374151" : "#9ca3af",
          }}
        >
          <option value="">Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s} style={{ color: "#374151" }}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Date range */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ ...inputBase, minWidth: 250 }}
      >
        <Calendar size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => set({ startDate: e.target.value })}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13,
            color: filters.startDate ? "#374151" : "#9ca3af",
            width: 105,
          }}
        />
        <span style={{ color: "#d1d5db" }}>~</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => set({ endDate: e.target.value })}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13,
            color: filters.endDate ? "#374151" : "#9ca3af",
            width: 105,
          }}
        />
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-2 transition-colors hover:bg-gray-50"
        style={{
          ...inputBase,
          padding: "0 16px",
          fontWeight: 500,
          color: "#4b5563",
          cursor: "pointer",
        }}
      >
        <RotateCcw size={15} />
        Reset Filters
      </button>
    </div>
  );
}

// ── Sortable header + table primitives (shared) ───────────────────────────────

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid #f1f3f5",
  verticalAlign: "middle",
};

const headStyle: React.CSSProperties = {
  padding: "13px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  textAlign: "left",
  whiteSpace: "nowrap",
  borderBottom: "1px solid #eef0f3",
  userSelect: "none",
};

type SortDir = "asc" | "desc";

function SortHeader<K extends string>({
  columns,
  sort,
  onSort,
}: {
  columns: { key: K; label: string; sortable: boolean }[];
  sort: { key: K; dir: SortDir } | null;
  onSort: (key: K) => void;
}) {
  return (
    <thead>
      <tr>
        {columns.map((c) => {
          const active = sort?.key === c.key;
          return (
            <th
              key={c.key}
              onClick={() => c.sortable && onSort(c.key)}
              style={{
                ...headStyle,
                cursor: c.sortable ? "pointer" : "default",
              }}
            >
              <span className="inline-flex items-center gap-1">
                {c.label}
                {c.sortable && (
                  <ChevronsUpDown
                    size={13}
                    style={{
                      color: active ? "#dc143c" : "#cbd5e1",
                      transform:
                        active && sort?.dir === "asc"
                          ? "rotate(180deg)"
                          : "none",
                    }}
                  />
                )}
              </span>
            </th>
          );
        })}
        <th style={headStyle}>Actions</th>
      </tr>
    </thead>
  );
}

function IconAction({
  title,
  onClick,
  disabled,
  icon,
  border,
  color,
  hoverBg,
}: {
  title: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  border: string;
  color: string;
  hoverBg: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
      style={{
        width: 34,
        height: 34,
        border: `1.5px solid ${border}`,
        background: "#fff",
        color,
        cursor: disabled ? "wait" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#fff";
      }}
    >
      {icon}
    </button>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #eef0f3",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

// ── Leave approvals table ─────────────────────────────────────────────────────

type LeaveSortKey =
  | "employee"
  | "empId"
  | "leaveType"
  | "fromDate"
  | "toDate"
  | "days"
  | "reason"
  | "appliedOn"
  | "status";

const LEAVE_COLUMNS: { key: LeaveSortKey; label: string; sortable: boolean }[] =
  [
    { key: "employee", label: "Employee", sortable: true },
    { key: "empId", label: "ID", sortable: true },
    { key: "leaveType", label: "Leave Type", sortable: true },
    { key: "fromDate", label: "From", sortable: true },
    { key: "toDate", label: "To", sortable: true },
    { key: "days", label: "Days", sortable: true },
    { key: "reason", label: "Reason", sortable: true },
    { key: "appliedOn", label: "Applied On", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ];

function leaveSortValue(
  req: ApprovalLeaveRequest,
  key: LeaveSortKey,
): string | number {
  switch (key) {
    case "employee":
      return `${req.firstName} ${req.lastName}`.toLowerCase();
    case "empId":
      return req.empId.toLowerCase();
    case "leaveType":
      return req.leaveTypeName.toLowerCase();
    case "fromDate":
      return new Date(req.fromDate).getTime();
    case "toDate":
      return new Date(req.toDate).getTime();
    case "days":
      return Number(req.days);
    case "reason":
      return (req.reason ?? "").toLowerCase();
    case "appliedOn":
      return new Date(req.appliedOn).getTime();
    case "status":
      return req.status.toLowerCase();
  }
}

function LeaveApprovalsTable({
  rows,
  sort,
  onSort,
  onApprove,
  onForward,
  onOpenReject,
  busyId,
}: {
  rows: ApprovalLeaveRequest[];
  sort: { key: LeaveSortKey; dir: SortDir } | null;
  onSort: (key: LeaveSortKey) => void;
  onApprove: (id: number) => void;
  onForward: (id: number) => void;
  onOpenReject: (req: ApprovalLeaveRequest) => void;
  busyId: number | null;
}) {
  return (
    <TableShell>
      <SortHeader columns={LEAVE_COLUMNS} sort={sort} onSort={onSort} />
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={LEAVE_COLUMNS.length + 1}
              style={{
                ...cellStyle,
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}
            >
              No requests found.
            </td>
          </tr>
        ) : (
          rows.map((req) => {
            const busy = busyId === req.id;
            return (
              <tr key={req.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={cellStyle}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: colorFor(req.empId) }}
                    >
                      {initials(req.firstName, req.lastName)}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {req.firstName} {req.lastName}
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    ...cellStyle,
                    whiteSpace: "nowrap",
                    color: "#6b7280",
                  }}
                >
                  {req.empId}
                </td>
                <td style={cellStyle}>
                  <LeaveTypePill
                    code={req.leaveTypeCode}
                    name={req.leaveTypeName}
                  />
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtDate(req.fromDate)}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtDate(req.toDate)}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {Number(req.days).toFixed(1)}
                </td>
                <td style={{ ...cellStyle, maxWidth: 200 }}>
                  <span>{req.reason}</span>
                  {req.managerRemarks && req.status !== "Pending" && (
                    <span
                      className="flex items-start gap-1 mt-1"
                      style={{ fontSize: 11, color: "#6b7280" }}
                    >
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>
                        <strong>Remarks:</strong> {req.managerRemarks}
                      </span>
                    </span>
                  )}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtDate(req.appliedOn)}
                </td>
                <td style={cellStyle}>
                  <StatusPill status={req.status} />
                </td>
                <td style={cellStyle}>
                  {req.status === "Pending" ? (
                    <div className="flex items-center gap-2">
                      <IconAction
                        title="Approve"
                        disabled={busy}
                        onClick={() => onApprove(req.id)}
                        icon={<Check size={16} />}
                        border="#86efac"
                        color="#16a34a"
                        hoverBg="#f0fdf4"
                      />
                      <IconAction
                        title="Reject"
                        disabled={busy}
                        onClick={() => onOpenReject(req)}
                        icon={<X size={16} />}
                        border="#fca5a5"
                        color="#dc2626"
                        hoverBg="#fef2f2"
                      />
                      <IconAction
                        title="Forward to HR"
                        disabled={busy}
                        onClick={() => onForward(req.id)}
                        icon={<ArrowUpRight size={16} />}
                        border="#e5e7eb"
                        color="#6b7280"
                        hoverBg="#f9fafb"
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: "#cbd5e1" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </TableShell>
  );
}

// ── Regularisation approvals table ────────────────────────────────────────────

type RegSortKey =
  | "employee"
  | "empId"
  | "date"
  | "issue"
  | "requestedIn"
  | "requestedOut"
  | "reason"
  | "appliedOn"
  | "status";

const REG_COLUMNS: { key: RegSortKey; label: string; sortable: boolean }[] = [
  { key: "employee", label: "Employee", sortable: true },
  { key: "empId", label: "ID", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "issue", label: "Issue", sortable: true },
  { key: "requestedIn", label: "Requested In", sortable: true },
  { key: "requestedOut", label: "Requested Out", sortable: true },
  { key: "reason", label: "Reason", sortable: true },
  { key: "appliedOn", label: "Applied On", sortable: true },
  { key: "status", label: "Status", sortable: true },
];

function regSortValue(
  req: ApprovalRegRequest,
  key: RegSortKey,
): string | number {
  switch (key) {
    case "employee":
      return `${req.firstName} ${req.lastName}`.toLowerCase();
    case "empId":
      return req.empId.toLowerCase();
    case "date":
      return new Date(req.date).getTime();
    case "issue":
      return (req.originalIssue ?? "").toLowerCase();
    case "requestedIn":
      return req.requestedPunchIn;
    case "requestedOut":
      return req.requestedPunchOut;
    case "reason":
      return (req.reason ?? "").toLowerCase();
    case "appliedOn":
      return new Date(req.createdAt).getTime();
    case "status":
      return req.status.toLowerCase();
  }
}

function RegApprovalsTable({
  rows,
  sort,
  onSort,
  onApprove,
  onOpenReject,
  busyId,
}: {
  rows: ApprovalRegRequest[];
  sort: { key: RegSortKey; dir: SortDir } | null;
  onSort: (key: RegSortKey) => void;
  onApprove: (id: number) => void;
  onOpenReject: (req: ApprovalRegRequest) => void;
  busyId: number | null;
}) {
  return (
    <TableShell>
      <SortHeader columns={REG_COLUMNS} sort={sort} onSort={onSort} />
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={REG_COLUMNS.length + 1}
              style={{
                ...cellStyle,
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px",
              }}
            >
              No requests found.
            </td>
          </tr>
        ) : (
          rows.map((req) => {
            const busy = busyId === req.id;
            const issue = req.originalIssue ?? "—";
            const issueStyle = pillFor(issue);
            return (
              <tr key={req.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={cellStyle}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: colorFor(req.empId) }}
                    >
                      {initials(req.firstName, req.lastName)}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {req.firstName} {req.lastName}
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    ...cellStyle,
                    whiteSpace: "nowrap",
                    color: "#6b7280",
                  }}
                >
                  {req.empId}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtDate(req.date)}
                </td>
                <td style={cellStyle}>
                  {req.originalIssue ? (
                    <Pill
                      label={issue}
                      bg={issueStyle.bg}
                      color={issueStyle.color}
                    />
                  ) : (
                    <span style={{ color: "#cbd5e1" }}>—</span>
                  )}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtTime(req.requestedPunchIn)}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtTime(req.requestedPunchOut)}
                </td>
                <td style={{ ...cellStyle, maxWidth: 220 }}>
                  <span>{req.reason}</span>
                  {req.approverRemarks && req.status !== "Pending" && (
                    <span
                      className="flex items-start gap-1 mt-1"
                      style={{ fontSize: 11, color: "#6b7280" }}
                    >
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>
                        <strong>Remarks:</strong> {req.approverRemarks}
                      </span>
                    </span>
                  )}
                </td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {fmtDate(req.createdAt)}
                </td>
                <td style={cellStyle}>
                  <StatusPill status={req.status} />
                </td>
                <td style={cellStyle}>
                  {req.status === "Pending" ? (
                    <div className="flex items-center gap-2">
                      <IconAction
                        title="Approve"
                        disabled={busy}
                        onClick={() => onApprove(req.id)}
                        icon={<Check size={16} />}
                        border="#86efac"
                        color="#16a34a"
                        hoverBg="#f0fdf4"
                      />
                      <IconAction
                        title="Reject"
                        disabled={busy}
                        onClick={() => onOpenReject(req)}
                        icon={<X size={16} />}
                        border="#fca5a5"
                        color="#dc2626"
                        hoverBg="#fef2f2"
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: "#cbd5e1" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </TableShell>
  );
}

// ── Pagination footer (shared) ────────────────────────────────────────────────

function Pagination({
  total,
  page,
  rowsPerPage,
  onPage,
  onRowsPerPage,
}: {
  total: number;
  page: number;
  rowsPerPage: number;
  onPage: (p: number) => void;
  onRowsPerPage: (n: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const from = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to = Math.min(page * rowsPerPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2 pt-4">
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Showing {from} to {to} of {total} entries
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-40"
          style={{
            width: 34,
            height: 34,
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#6b7280",
            cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
          const active = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{
                width: 34,
                height: 34,
                border: active ? "1.5px solid #dc143c" : "1px solid #e5e7eb",
                background: "#fff",
                color: active ? "#dc143c" : "#6b7280",
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-40"
          style={{
            width: 34,
            height: 34,
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#6b7280",
            cursor: page >= pageCount ? "not-allowed" : "pointer",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span style={{ fontSize: 13, color: "#6b7280" }}>Rows per page:</span>
        <div className="relative">
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPage(Number(e.target.value))}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontSize: 13,
              color: "#374151",
              padding: "0 30px 0 12px",
              appearance: "none",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            style={{
              position: "absolute",
              right: 9,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-tab bar (shared) ──────────────────────────────────────────────────────

function SubTabs<K extends string>({
  tabs,
  active,
  onSelect,
  badgeKey,
  badgeCount,
}: {
  tabs: { key: K; label: string }[];
  active: K;
  onSelect: (key: K) => void;
  badgeKey: K;
  badgeCount: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onSelect(t.key)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: active === t.key ? "#dc143c" : "#6b7280",
            borderBottom:
              active === t.key ? "2px solid #dc143c" : "2px solid transparent",
          }}
        >
          {t.label}
          {t.key === badgeKey && badgeCount > 0 && (
            <span
              className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none"
              style={{ background: "#f97316" }}
            >
              {badgeCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type MainTab = "leave" | "regularisation";
type LeaveSubTab = "all" | "pending" | "approved" | "rejected" | "forwarded";
type RegSubTab = "all" | "pending" | "approved" | "rejected";

const LEAVE_STATUS_OPTIONS = [
  "Pending",
  "Approved",
  "Rejected",
  "Forwarded",
  "Cancelled",
];
const REG_STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];

function applySort<T, K extends string>(
  rows: T[],
  sort: { key: K; dir: SortDir } | null,
  value: (row: T, key: K) => string | number,
): T[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = value(a, sort.key);
    const vb = value(b, sort.key);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

export default function Approvals() {
  const [mainTab, setMainTab] = useState<MainTab>("leave");

  // ── Leave state ──
  const [leaveSubTab, setLeaveSubTab] = useState<LeaveSubTab>("pending");
  const [leaveRequests, setLeaveRequests] = useState<ApprovalLeaveRequest[]>(
    [],
  );
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveRejectingId, setLeaveRejectingId] = useState<number | null>(null);
  const [leaveBusyId, setLeaveBusyId] = useState<number | null>(null);
  const [leaveFilters, setLeaveFilters] =
    useState<ApprovalFilters>(EMPTY_FILTERS);
  const [leaveSort, setLeaveSort] = useState<{
    key: LeaveSortKey;
    dir: SortDir;
  } | null>({ key: "appliedOn", dir: "desc" });
  const [leavePage, setLeavePage] = useState(1);
  const [leaveRowsPerPage, setLeaveRowsPerPage] = useState(10);

  // ── Regularisation state ──
  const [regSubTab, setRegSubTab] = useState<RegSubTab>("pending");
  const [regRequests, setRegRequests] = useState<ApprovalRegRequest[]>([]);
  const [regLoading, setRegLoading] = useState(true);
  const [regRejectingId, setRegRejectingId] = useState<number | null>(null);
  const [regBusyId, setRegBusyId] = useState<number | null>(null);
  const [regFilters, setRegFilters] = useState<ApprovalFilters>(EMPTY_FILTERS);
  const [regSort, setRegSort] = useState<{
    key: RegSortKey;
    dir: SortDir;
  } | null>({ key: "appliedOn", dir: "desc" });
  const [regPage, setRegPage] = useState(1);
  const [regRowsPerPage, setRegRowsPerPage] = useState(10);

  async function refreshLeaves() {
    setLeaveLoading(true);
    try {
      const data = await fetchLeaveApprovals("all");
      setLeaveRequests(data);
    } catch (e) {
      toast.error(`Failed to load leave approvals: ${(e as Error).message}`);
    } finally {
      setLeaveLoading(false);
    }
  }
  async function refreshRegs() {
    setRegLoading(true);
    try {
      const data = await fetchRegularisationApprovals("all");
      setRegRequests(data);
    } catch (e) {
      toast.error(`Failed to load regularisations: ${(e as Error).message}`);
    } finally {
      setRegLoading(false);
    }
  }

  useEffect(() => {
    refreshLeaves();
    refreshRegs();
  }, []);

  // ── Leave actions ──
  async function approveLeave(id: number) {
    setLeaveBusyId(id);
    try {
      await approveLeaveRequest(id);
      toast.success("Leave approved");
      await refreshLeaves();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLeaveBusyId(null);
    }
  }
  async function rejectLeave(id: number, remarks: string) {
    setLeaveBusyId(id);
    try {
      await rejectLeaveRequest(id, remarks);
      toast.success("Leave rejected");
      setLeaveRejectingId(null);
      await refreshLeaves();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLeaveBusyId(null);
    }
  }
  async function forwardLeave(id: number) {
    setLeaveBusyId(id);
    try {
      await forwardLeaveRequest(id);
      toast.success("Forwarded to HR");
      await refreshLeaves();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLeaveBusyId(null);
    }
  }

  // ── Regularisation actions ──
  async function approveReg(id: number) {
    setRegBusyId(id);
    try {
      await approveRegRequest(id);
      toast.success("Regularisation approved");
      await refreshRegs();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRegBusyId(null);
    }
  }
  async function rejectReg(id: number, remarks: string) {
    setRegBusyId(id);
    try {
      await rejectRegRequest(id, remarks);
      toast.success("Regularisation rejected");
      setRegRejectingId(null);
      await refreshRegs();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRegBusyId(null);
    }
  }

  const leavePending = leaveRequests.filter(
    (r) => r.status === "Pending",
  ).length;
  const regPending = regRequests.filter((r) => r.status === "Pending").length;

  // ── Leave: type options + filter/sort pipeline ──
  const leaveTypeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of leaveRequests) map.set(r.leaveTypeCode, r.leaveTypeName);
    return Array.from(map, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label),
    );
  }, [leaveRequests]);

  const filteredLeave = useMemo(() => {
    const q = leaveFilters.search.trim().toLowerCase();
    const start = leaveFilters.startDate
      ? new Date(leaveFilters.startDate)
      : null;
    const end = leaveFilters.endDate ? new Date(leaveFilters.endDate) : null;

    const out = leaveRequests.filter((r) => {
      if (leaveSubTab !== "all") {
        const cap = leaveSubTab.charAt(0).toUpperCase() + leaveSubTab.slice(1);
        if (r.status !== cap) return false;
      }
      if (leaveFilters.status && r.status !== leaveFilters.status) return false;
      if (leaveFilters.type && r.leaveTypeCode !== leaveFilters.type)
        return false;
      if (q) {
        const hay = `${r.firstName} ${r.lastName} ${r.empId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (start && new Date(r.fromDate) < start) return false;
      if (end && new Date(r.fromDate) > end) return false;
      return true;
    });
    return applySort(out, leaveSort, leaveSortValue);
  }, [leaveRequests, leaveSubTab, leaveFilters, leaveSort]);

  // ── Regularisation: type options + filter/sort pipeline ──
  const regIssueOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of regRequests) if (r.originalIssue) set.add(r.originalIssue);
    return Array.from(set, (v) => ({ value: v, label: v })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [regRequests]);

  const filteredReg = useMemo(() => {
    const q = regFilters.search.trim().toLowerCase();
    const start = regFilters.startDate ? new Date(regFilters.startDate) : null;
    const end = regFilters.endDate ? new Date(regFilters.endDate) : null;

    const out = regRequests.filter((r) => {
      if (regSubTab !== "all") {
        const cap = regSubTab.charAt(0).toUpperCase() + regSubTab.slice(1);
        if (r.status !== cap) return false;
      }
      if (regFilters.status && r.status !== regFilters.status) return false;
      if (regFilters.type && r.originalIssue !== regFilters.type) return false;
      if (q) {
        const hay = `${r.firstName} ${r.lastName} ${r.empId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (start && new Date(r.date) < start) return false;
      if (end && new Date(r.date) > end) return false;
      return true;
    });
    return applySort(out, regSort, regSortValue);
  }, [regRequests, regSubTab, regFilters, regSort]);

  // ── Pagination slices ──
  const leavePageCount = Math.max(
    1,
    Math.ceil(filteredLeave.length / leaveRowsPerPage),
  );
  const leaveCurrentPage = Math.min(leavePage, leavePageCount);
  const pagedLeave = filteredLeave.slice(
    (leaveCurrentPage - 1) * leaveRowsPerPage,
    leaveCurrentPage * leaveRowsPerPage,
  );

  const regPageCount = Math.max(
    1,
    Math.ceil(filteredReg.length / regRowsPerPage),
  );
  const regCurrentPage = Math.min(regPage, regPageCount);
  const pagedReg = filteredReg.slice(
    (regCurrentPage - 1) * regRowsPerPage,
    regCurrentPage * regRowsPerPage,
  );

  // Reset to page 1 when the result set changes shape.
  useEffect(() => {
    setLeavePage(1);
  }, [leaveFilters, leaveSubTab, leaveRowsPerPage]);
  useEffect(() => {
    setRegPage(1);
  }, [regFilters, regSubTab, regRowsPerPage]);

  function handleLeaveSort(key: LeaveSortKey) {
    setLeaveSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }
  function handleRegSort(key: RegSortKey) {
    setRegSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const leaveRejectingReq =
    leaveRequests.find((r) => r.id === leaveRejectingId) ?? null;
  const regRejectingReq =
    regRequests.find((r) => r.id === regRejectingId) ?? null;

  const LEAVE_SUB: { key: LeaveSubTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "forwarded", label: "Forwarded" },
  ];
  const REG_SUB: { key: RegSubTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-0">
      <div className="bg-white border-b" style={{ borderColor: "#e5e7eb" }}>
        <div className="flex">
          {[
            { key: "leave" as MainTab, label: "Leave Approvals" },
            { key: "regularisation" as MainTab, label: "Regularisation" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMainTab(t.key)}
              className="px-6 py-4 text-sm font-semibold transition-colors"
              style={{
                color: mainTab === t.key ? "#dc143c" : "#6b7280",
                borderBottom:
                  mainTab === t.key
                    ? "2px solid #dc143c"
                    : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mainTab === "leave" && (
        <div className="pt-4 space-y-4">
          <SubTabs
            tabs={LEAVE_SUB}
            active={leaveSubTab}
            onSelect={setLeaveSubTab}
            badgeKey="pending"
            badgeCount={leavePending}
          />

          <FilterToolbar
            filters={leaveFilters}
            onChange={setLeaveFilters}
            onReset={() => setLeaveFilters(EMPTY_FILTERS)}
            searchPlaceholder="Search by employee name or ID..."
            typeLabel="Leave Type"
            typeOptions={leaveTypeOptions}
            statusOptions={LEAVE_STATUS_OPTIONS}
          />

          {leaveLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Loading approvals…
            </div>
          ) : (
            <>
              <LeaveApprovalsTable
                rows={pagedLeave}
                sort={leaveSort}
                onSort={handleLeaveSort}
                onApprove={approveLeave}
                onForward={forwardLeave}
                onOpenReject={(req) => setLeaveRejectingId(req.id)}
                busyId={leaveBusyId}
              />
              <Pagination
                total={filteredLeave.length}
                page={leaveCurrentPage}
                rowsPerPage={leaveRowsPerPage}
                onPage={setLeavePage}
                onRowsPerPage={setLeaveRowsPerPage}
              />
            </>
          )}
        </div>
      )}

      {leaveRejectingReq && (
        <RejectModal
          title="Reject Leave"
          subtitle={
            <>
              Rejecting{" "}
              <strong>
                {leaveRejectingReq.firstName} {leaveRejectingReq.lastName}
              </strong>
              's {leaveRejectingReq.leaveTypeName} (
              {fmtRange(
                leaveRejectingReq.fromDate,
                leaveRejectingReq.toDate,
                leaveRejectingReq.days,
              )}
              ).
            </>
          }
          busy={leaveBusyId === leaveRejectingReq.id}
          onClose={() => setLeaveRejectingId(null)}
          onConfirm={(remarks) => rejectLeave(leaveRejectingReq.id, remarks)}
        />
      )}

      {mainTab === "regularisation" && (
        <div className="pt-4 space-y-4">
          <SubTabs
            tabs={REG_SUB}
            active={regSubTab}
            onSelect={setRegSubTab}
            badgeKey="pending"
            badgeCount={regPending}
          />

          <FilterToolbar
            filters={regFilters}
            onChange={setRegFilters}
            onReset={() => setRegFilters(EMPTY_FILTERS)}
            searchPlaceholder="Search by employee name or ID..."
            typeLabel="Issue Type"
            typeOptions={regIssueOptions}
            statusOptions={REG_STATUS_OPTIONS}
          />

          {regLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Loading regularisations…
            </div>
          ) : (
            <>
              <RegApprovalsTable
                rows={pagedReg}
                sort={regSort}
                onSort={handleRegSort}
                onApprove={approveReg}
                onOpenReject={(req) => setRegRejectingId(req.id)}
                busyId={regBusyId}
              />
              <Pagination
                total={filteredReg.length}
                page={regCurrentPage}
                rowsPerPage={regRowsPerPage}
                onPage={setRegPage}
                onRowsPerPage={setRegRowsPerPage}
              />
            </>
          )}
        </div>
      )}

      {regRejectingReq && (
        <RejectModal
          title="Reject Regularisation"
          subtitle={
            <>
              Rejecting{" "}
              <strong>
                {regRejectingReq.firstName} {regRejectingReq.lastName}
              </strong>
              's regularisation for {fmtDate(regRejectingReq.date)}.
            </>
          }
          busy={regBusyId === regRejectingReq.id}
          onClose={() => setRegRejectingId(null)}
          onConfirm={(remarks) => rejectReg(regRejectingReq.id, remarks)}
        />
      )}
    </div>
  );
}
