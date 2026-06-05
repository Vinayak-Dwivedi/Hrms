"use client";

import { useState } from "react";
import { XCircle, AlertCircle } from "lucide-react";
import type { LeaveRequest, LeaveStatus } from "@/lib/dashboard";

interface Props {
  requests: LeaveRequest[];
  onCancel?: (id: string) => void | Promise<void>;
  busyId?: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending:   { bg: "#fef9c3", color: "#a16207" },
  Approved:  { bg: "#dcfce7", color: "#15803d" },
  Cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  Rejected:  { bg: "#fee2e2", color: "#b91c1c" },
};


function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

function leavePeriod(start: string, end: string) {
  if (start === end) return fmtDate(start);
  const s = new Date(start);
  const e = new Date(end);
  // Same month/year: show "18–20 Feb 2026"
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    const month = s.toLocaleDateString("en-GB", { month: "short" });
    const year  = s.getFullYear();
    return `${String(s.getDate()).padStart(2,"0")}–${String(e.getDate()).padStart(2,"0")} ${month} ${year}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function durationLabel(req: LeaveRequest) {
  if (req.isHalfDay) return "0.5";
  return String(req.duration);
}

const TRUNCATE_AT = 50;

function StatusCell({ req }: { req: LeaveRequest }) {
  const style = STATUS_STYLE[req.status];
  return (
    <span style={{
      display: "inline-block",
      background: style.bg, color: style.color,
      fontWeight: 700, fontSize: 12,
      borderRadius: 6, padding: "2px 10px",
    }}>
      {req.status}
    </span>
  );
}

// ── Contest Leave Modal ───────────────────────────────────────────────────────

interface ContestModalProps {
  req: LeaveRequest;
  onClose: () => void;
}

function ContestModal({ req, onClose }: ContestModalProps) {
  const [note, setNote] = useState("");

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, padding: "28px 28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Contest Leave</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          This will request conversion of your <strong>{req.leaveType}</strong> ({leavePeriod(req.startDate, req.endDate)}) to <strong>Earned Leave</strong>.
        </p>

        <label style={{ display: "block", marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Reason for contesting
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Explain why this should be converted to Earned Leave..."
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", fontSize: 14, color: "#111827",
              background: "#fff", outline: "none", resize: "vertical",
              boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
          >
            Cancel
          </button>
         
        </div>
      </div>
    </div>
  );
}

// ── Main Table ────────────────────────────────────────────────────────────────

export default function LeaveTable({ requests, onCancel, busyId }: Props) {
  const [pageSize, setPageSize]         = useState(10);
  const [page, setPage]                 = useState(1);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "All">("All");
  const [contesting, setContesting]     = useState<LeaveRequest | null>(null);

  const filtered = requests.filter((r) =>
    statusFilter === "All" ? true : r.status === statusFilter
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * pageSize;
  const pageRows   = filtered.slice(start, start + pageSize);

  const colStyle: React.CSSProperties = {
    padding: "12px 14px", fontSize: 13, color: "#374151",
    borderBottom: "1px solid #f3f4f6", verticalAlign: "top",
  };
  const headStyle: React.CSSProperties = {
    padding: "12px 14px", fontSize: 12, fontWeight: 700,
    color: "#fff", background: "#4b5563", textAlign: "left", whiteSpace: "nowrap",
  };

  return (
    <>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>

        {/* Title bar */}
        <div style={{ background: "linear-gradient(135deg, #8B1A52 0%, #C5195F 100%)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Leave Requests</h1>
          <a href="/attendance" style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
            Open Attendance
          </a>
        </div>

        {/* Controls bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
            Show
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#374151", background: "#fff" }}
            >
              {[5, 10, 25, 50].map((n) => <option key={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
            Status:
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as LeaveStatus | "All"); setPage(1); }}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 10px", fontSize: 13, color: "#374151", background: "#fff", minWidth: 130 }}
            >
              {(["All", "Pending", "Approved", "Rejected", "Cancelled"] as const).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                {["Applied On", "Leave Type", "Leave Period", "Duration", "Reason", "Status", "Approved On", "Action"].map((h) => (
                  <th key={h} style={headStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...colStyle, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No records found</td>
                </tr>
              ) : pageRows.map((req, i) => (
                <tr key={req.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={colStyle}>{fmtDate(req.appliedOn)}</td>
                  <td style={{ ...colStyle, fontWeight: 600 }}>{req.leaveTypeCode}</td>
                  <td style={{ ...colStyle, whiteSpace: "nowrap" }}>{leavePeriod(req.startDate, req.endDate)}</td>
                  <td style={colStyle}>{durationLabel(req)}</td>
                  <td style={colStyle}>{req.reason}</td>
                  <td style={colStyle}><StatusCell req={req} /></td>
                  <td style={{ ...colStyle, whiteSpace: "nowrap" }}>{fmtDateTime(req.approvedOn)}</td>
                  <td style={colStyle}>
                    {req.status === "Pending" && (
                      <button
                        type="button"
                        onClick={() => onCancel?.(req.id)}
                        disabled={!onCancel || busyId === req.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "1.5px solid #fca5a5", background: "#fff", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: busyId === req.id ? "wait" : "pointer", whiteSpace: "nowrap", opacity: busyId === req.id ? 0.5 : 1 }}
                      >
                        <XCircle size={14} /> {busyId === req.id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                    
                    {(req.status === "Cancelled" || req.status === "Rejected") && (
                      <span style={{ fontSize: 13, color: "#9ca3af" }}>No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #f3f4f6", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {filtered.length === 0
              ? "Showing 0 entries"
              : `Showing ${start + 1} to ${Math.min(start + pageSize, filtered.length)} of ${filtered.length} entries`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <PagBtn disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>Previous</PagBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <PagBtn key={n} active={n === safePage} onClick={() => setPage(n)}>{n}</PagBtn>
            ))}
            <PagBtn disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>Next</PagBtn>
          </div>
        </div>
      </div>

      {contesting && <ContestModal req={contesting} onClose={() => setContesting(null)} />}
    </>
  );
}

function PagBtn({ children, onClick, active, disabled }: { children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "5px 11px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", background: active ? "#e91e8c" : "#fff", color: active ? "#fff" : disabled ? "#d1d5db" : "#374151", cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}
