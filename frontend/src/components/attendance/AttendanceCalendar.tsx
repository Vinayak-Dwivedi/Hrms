
"use client";

import { useState, useRef, useEffect } from "react";
import { Upload } from "lucide-react";
import type { DayAttendance, LeaveType } from "@/lib/dashboard";
import { mockLeaveBalance } from "@/lib/dashboard";

export interface LeaveSubmission {
  leaveTypeCode: string;
  fromDate: string;
  toDate: string;
  days: number;
  durationType: "Full Day" | "First Half" | "Second Half";
  reason: string;
}

export interface RegularisationSubmission {
  date: string;
  requestedPunchIn: string; // HH:MM
  requestedPunchOut: string; // HH:MM
  reason: string;
  originalIssue?: string;
}

interface Props {
  data: DayAttendance[];
  todayOverride?: string; // YYYY-MM-DD
  initialYear?: number;
  initialMonth?: number; // 0-indexed
  leaveBalances?: LeaveType[];
  onSubmitLeave?: (input: LeaveSubmission) => Promise<void>;
  onSubmitRegularisation?: (input: RegularisationSubmission) => Promise<void>;
  regularisationHistory?: ReadonlyArray<RegularisationHistoryItem>;
  onMonthChange?: (year: number, month0: number) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  Present:      { label: "Present",  color: "#16a34a", bg: "#dcfce7" },
  Absent:       { label: "Absent",   color: "#dc2626", bg: "#fee2e2" },
  HalfDay:      { label: "Half Day", color: "#ea580c", bg: "#ffedd5" },
  Leave:        { label: "Leave",    color: "#a16207", bg: "#fef3c7" },
  LeavePending: { label: "Pending",  color: "#92400e", bg: "#ffedd5" },
  Holiday:      { label: "Holiday",  color: "#7c3aed", bg: "#ede9fe" },
};

const LEGEND = [
  { color: "#bbf7d0", label: "Present" },
  { color: "#fecaca", label: "Absent" },
  { color: "#fef08a", label: "Leave (approved)" },
  { color: "#fed7aa", label: "Leave (pending)" },
  { color: "#e9d5ff", label: "Holiday/Weekend" },
];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - dow);
  const lastOfMonth = new Date(year, month + 1, 0);

  const weeks: Date[][] = [];
  const cur = new Date(gridStart);

  while (cur <= lastOfMonth || weeks.length === 0 || weeks[weeks.length - 1].length % 7 !== 0) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    if (weeks.length > 6 && weeks[weeks.length - 1].length === 7) break;
  }
  return weeks;
}

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

function getDayName(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function countWorkingDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const s = new Date(from);
  const e = new Date(to);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Leave Application Form ────────────────────────────────────────────────────

interface LeaveFormProps {
  defaultDate: string;
  onClose: () => void;
  leaveBalances: LeaveType[];
  onSubmit?: (input: LeaveSubmission) => Promise<void>;
}

function LeaveFormModal({ defaultDate, onClose, leaveBalances, onSubmit }: LeaveFormProps) {
  const types = leaveBalances.length > 0 ? leaveBalances : mockLeaveBalance;
  const [leaveTypeIdx, setLeaveTypeIdx] = useState(0);
  const [reason, setReason]             = useState("");
  const [duration, setDuration]         = useState<"Full Day" | "First Half" | "Second Half">("Full Day");
  const [fromDate, setFromDate]         = useState(defaultDate);
  const [toDate, setToDate]             = useState(defaultDate);
  const [fileName, setFileName]         = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const workingDays = countWorkingDays(fromDate, toDate);

  const leaveOptions = types.map((l) => ({
    label: `${l.name} — ${l.available} days left`,
    value: l.id,
    code: l.code,
  }));

  async function handleSubmit() {
    if (!onSubmit) {
      onClose();
      return;
    }
    if (!reason.trim()) {
      setSubmitError("Reason is required.");
      return;
    }
    const code = leaveOptions[leaveTypeIdx]?.code;
    if (!code) {
      setSubmitError("Pick a leave type.");
      return;
    }
    const days =
      duration === "Full Day" ? Math.max(1, workingDays) : 0.5;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        leaveTypeCode: code,
        fromDate,
        toDate: duration === "Full Day" ? toDate : fromDate,
        days,
        durationType: duration,
        reason: reason.trim(),
      });
      onClose();
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setFileName(file.name);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>Apply for Leave</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* Leave Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Leave Type</label>
            <select
              value={leaveTypeIdx}
              onChange={(e) => setLeaveTypeIdx(Number(e.target.value))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", outline: "none" }}
            >
              {leaveOptions.map((o, i) => <option key={o.value} value={i}>{o.label}</option>)}
            </select>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Reason <span style={{ color: "#e91e8c" }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Required — please share context with your manager..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Duration</label>
            <div style={{ display: "flex", gap: 0, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#f9fafb" }}>
              {(["Full Day", "First Half", "Second Half"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setDuration(opt)}
                  style={{
                    flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: duration === opt ? "#e91e8c" : "transparent",
                    color: duration === opt ? "#fff" : "#6b7280",
                    transition: "background 0.15s",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* From / To */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>From</label>
              <input
                type="date" value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value); }}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>To</label>
              <input
                type="date" value={toDate} min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Working days badge */}
          {workingDays > 0 && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ display: "inline-block", background: "#fce7f3", color: "#be185d", fontWeight: 700, fontSize: 13, borderRadius: 20, padding: "4px 14px" }}>
                {workingDays} Working {workingDays === 1 ? "Day" : "Days"}
              </span>
            </div>
          )}

          {/* Supporting Document */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Supporting Document (optional)</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                border: "1.5px dashed #d1d5db", borderRadius: 10, padding: "28px 20px",
                textAlign: "center", cursor: "pointer", background: "#fafafa",
              }}
            >
              <input
                ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) setFileName(e.target.files[0].name); }}
              />
              <Upload size={22} style={{ color: "#9ca3af", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>
                {fileName ?? "Drop file or click to upload"}
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                Required for Sick Leave &gt; 2 days · Max 10 MB · PDF / JPG
              </p>
            </div>
          </div>

          {submitError && (
            <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{ padding: "10px 22px", borderRadius: 20, border: "1.5px solid #e91e8c", background: "#fff", fontSize: 14, fontWeight: 600, color: "#e91e8c", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: "10px 22px", borderRadius: 20, border: "none", background: "#e91e8c", fontSize: 14, fontWeight: 600, color: "#fff", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upcoming Day Modal ────────────────────────────────────────────────────────

interface UpcomingModalProps {
  ymd: string;
  onClose: () => void;
  onApplyLeave: () => void;
}

function UpcomingDayModal({ ymd, onClose, onApplyLeave }: UpcomingModalProps) {
  const cards = [
    { label: "Punch In",    value: "—" },
    { label: "Punch Out",   value: "—" },
    { label: "Late By",     value: "—" },
    { label: "Early Exit",  value: "—" },
    { label: "Working Hrs", value: "—" },
    { label: "Location",    value: "—" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, padding: "24px 24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{formatDate(ymd)}</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{getDayName(ymd)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        {/* Upcoming notice */}
        <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
          Upcoming day — attendance will update after check-in
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {cards.map(({ label, value }) => (
            <div key={label} style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 22px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}
          >
            Close
          </button>
          <button
            onClick={onApplyLeave}
            style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: "#e91e8c", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}
          >
            Apply Leave
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Regularisation Modal ──────────────────────────────────────────────────────

export interface RegularisationHistoryItem {
  date: string;             // YYYY-MM-DD
  status: "Pending" | "Approved" | "Rejected";
  requestedPunchIn: string; // HH:MM(:SS)
  requestedPunchOut: string;
  reason: string;
  decidedAt: string | null;
}

interface RegularisationModalProps {
  date: string;
  originalIssue?: string;
  onClose: () => void;
  onSubmit?: (input: RegularisationSubmission) => Promise<void>;
  history?: ReadonlyArray<RegularisationHistoryItem>;
}

function fmtTimePretty(t: string) {
  // 24-hour military time (HH:MM) — matches the central formatTimeOfDay
  // used elsewhere in the app for punch-times.
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDatePretty(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function RegularisationModal({
  date,
  originalIssue,
  onClose,
  onSubmit,
  history = [],
}: RegularisationModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [punchIn,  setPunchIn]  = useState("09:15");
  const [punchOut, setPunchOut] = useState("18:30");
  const [reason,   setReason]   = useState(
    originalIssue?.toLowerCase().includes("late")
      ? "Was marked late — please regularise."
      : "Was marked absent — please regularise.",
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inputDate = date; // already YYYY-MM-DD

  async function handleSubmit() {
    if (!onSubmit) { onClose(); return; }
    if (!reason.trim()) { setSubmitError("Reason is required."); return; }
    if (punchOut <= punchIn) { setSubmitError("Punch out must be after punch in."); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      await onSubmit({
        date,
        requestedPunchIn: punchIn,
        requestedPunchOut: punchOut,
        reason: reason.trim(),
        originalIssue,
      });
      onClose();
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Regularisation</h2>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
              {fmtDatePretty(date)}{originalIssue ? ` · ${originalIssue}` : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        {/* Form body */}
        <div style={{ padding: "16px 20px" }}>

          {/* Punch In / Out */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Requested Punch In</label>
              <input type="time" value={punchIn} onChange={(e) => setPunchIn(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Requested Punch Out</label>
              <input type="time" value={punchOut} onChange={(e) => setPunchOut(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box", outline: "none" }} />
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Reason <span style={{ color: "#dc143c" }}>*</span>
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
          </div>

          {/* Upload (compact) */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Supporting Proof (optional)</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFileName(f.name); }}
              onDragOver={(e) => e.preventDefault()}
              style={{ border: "1.5px dashed #d1d5db", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#fafafa" }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) setFileName(e.target.files[0].name); }} />
              <Upload size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {fileName ?? "Click to upload (PDF / JPG / PNG · 5MB)"}
                </p>
              </div>
            </div>
          </div>

          {submitError && (
            <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13 }}>
              {submitError}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              disabled={submitting}
              onClick={() => { setPunchIn("09:15"); setPunchOut("18:30"); setReason(""); setFileName(null); setSubmitError(null); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 18, border: "1.5px solid #d1d5db", background: "#fff", fontSize: 14, fontWeight: 600, color: "#374151", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1 }}
            >
              Clear
            </button>
            <button
              disabled={submitting}
              onClick={handleSubmit}
              style={{ flex: 2, padding: "8px 0", borderRadius: 18, border: "none", background: "#dc143c", fontSize: 14, fontWeight: 600, color: "#fff", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Existing Day Modal ────────────────────────────────────────────────────────

interface ModalProps {
  entry: DayAttendance;
  onClose: () => void;
  onApplyReg: () => void;
  isToday?: boolean;
}

function DayModal({ entry, onClose, onApplyReg, isToday }: ModalProps) {
  const badge = STATUS_BADGE[entry.status];
  const isLeave  = entry.status === "Leave" || entry.status === "LeavePending";
  const isAbsent = entry.status === "Absent";
  const isPending = entry.status === "LeavePending";
  const canRegularise = isToday || isAbsent;

  const cards = [
    { label: "Punch In",    value: entry.punchIn ?? "—" },
    { label: "Punch Out",   value: entry.punchOut ?? "—" },
    { label: "Late By",     value: entry.lateBy ?? "—" },
    { label: "Early Exit",  value: entry.earlyExit ?? "—" },
    { label: "Working Hrs", value: entry.hoursWorked ?? "—" },
    { label: "Location",    value: entry.location ?? "—" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, padding: "24px 24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{formatDate(entry.date)}</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{getDayName(entry.date)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge && (
              <span style={{ fontSize: 13, fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: 20, padding: "4px 14px" }}>
                {badge.label}
              </span>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1, padding: 0 }}>✕</button>
          </div>
        </div>

        {isLeave && entry.leaveType && (
          <div style={{ background: isPending ? "#fffbeb" : "#fff0f5", borderRadius: 10, padding: "14px 16px", margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{isPending ? "⏳" : "🌿"}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>
                {isPending ? "Pending Leave" : "Approved Leave"}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 1 }}>
                {entry.leaveType}
                {isPending
                  ? " · waiting for manager"
                  : entry.approvedBy ? ` · approved by ${entry.approvedBy}` : ""}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: isLeave ? 8 : 20 }}>
          {cards.map(({ label, value }) => (
            <div key={label} style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Absent warning banner */}
        {isAbsent && (
          <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 10, padding: "12px 16px", marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Marked absent — was this an error?</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>Submit a regularisation request with proof to fix this day.</p>
            </div>
          </div>
        )}

        {/* Today nudge */}
        {isToday && !isAbsent && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>🕒</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Punch issue today?</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>Submit a regularisation if your punch-in/out doesn’t look right.</p>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 22px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, fontWeight: 500, color: "#374151", cursor: "pointer" }}>
            Close
          </button>
          {canRegularise && (
            <button
              onClick={onApplyReg}
              style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: "#dc143c", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}
            >
              Regularisation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export default function AttendanceCalendar({
  data,
  todayOverride,
  initialYear,
  initialMonth,
  leaveBalances = [],
  onSubmitLeave,
  onSubmitRegularisation,
  regularisationHistory = [],
  onMonthChange,
}: Props) {
  const today = todayOverride ?? toYMD(new Date());
  const [year, setYear]     = useState(initialYear  ?? parseInt(today.slice(0, 4)));
  const [month, setMonth]   = useState(initialMonth ?? parseInt(today.slice(5, 7)) - 1);
  const [selected, setSelected]           = useState<DayAttendance | null>(null);
  const [upcomingYmd, setUpcomingYmd]     = useState<string | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [regDate, setRegDate]             = useState<string | null>(null);

  // Sync internal state when parent updates props after a month-change fetch
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional sync
  useEffect(() => {
    if (initialYear  !== undefined) setYear(initialYear);
    if (initialMonth !== undefined) setMonth(initialMonth);
  }, [initialYear, initialMonth]);

  const dataMap = new Map(data.map((d) => [d.date, d]));
  const weeks   = buildGrid(year, month);

  function prev() {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear  = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newYear, newMonth);
  }
  function next() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear  = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newYear, newMonth);
  }

  function handleCellClick(date: Date, inMonth: boolean) {
    if (!inMonth) return;
    const ymd = toYMD(date);
    const entry = dataMap.get(ymd);
    if (entry) {
      const isPast = ymd < today;
      const isAbsent = entry.status === "Absent";
      const isLate = !!entry.lateBy;
      // Past absent/late → straight into Regularisation form.
      // Today → DayModal first (with a "Request Regularisation" button inside).
      // Other past entries → DayModal (no reg button).
      if (isPast && (isAbsent || isLate)) {
        setRegDate(ymd);
      } else {
        setSelected(entry);
      }
    } else if (ymd > today) {
      // Future date with no attendance — jump straight into Apply for Leave.
      setUpcomingYmd(ymd);
      setShowLeaveForm(true);
    }
  }

  return (
    <>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>

        {/* Legend + navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {LEGEND.map((item) => (
              <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0, display: "inline-block", border: "1px solid rgba(0,0,0,0.06)" }} />
                <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <NavBtn onClick={prev}>&#8249;</NavBtn>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#111827", minWidth: 115, textAlign: "center" }}>
              {MONTHS[month]} {year}
            </span>
            <NavBtn onClick={next}>&#8250;</NavBtn>
          </div>
        </div>

        {/* Grid */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ padding: "12px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.06em", borderRight: i < 6 ? "1px solid #e5e7eb" : undefined }}>
                {d}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < weeks.length - 1 ? "1px solid #e5e7eb" : undefined }}>
              {week.map((date, di) => {
                const ymd       = toYMD(date);
                const inMonth   = date.getMonth() === month;
                const isToday   = ymd === today;
                const isWeekend = di >= 5;
                const entry     = dataMap.get(ymd);
                const isHoliday = entry?.status === "Holiday";
                const badge     = entry?.status ? STATUS_BADGE[entry.status] : undefined;
                const isUpcoming = inMonth && !entry && ymd > today;
                const isClickable = inMonth && (!!entry || isUpcoming);

                let bg = "#fff";
                if (!inMonth)                                              bg = "#f9fafb";
                else if (entry?.status === "Present" || entry?.status === "HalfDay") bg = "#f0fdf4";
                else if (entry?.status === "Absent")                       bg = "#fff1f2";
                else if (entry?.status === "Leave")                        bg = "#fef9c3";
                else if (entry?.status === "LeavePending")                 bg = "#ffedd5";
                else if (isHoliday || isWeekend)                           bg = "#f5f3ff";

                return (
                  <div
                    key={ymd}
                    onClick={() => handleCellClick(date, inMonth)}
                    style={{
                      background: bg,
                      borderRight: di < 6 ? "1px solid #e5e7eb" : undefined,
                      outline: isToday ? "2px solid #e91e8c" : undefined,
                      outlineOffset: "-2px",
                      padding: "10px 12px",
                      minHeight: 92,
                      position: "relative",
                      cursor: isClickable ? "pointer" : "default",
                      transition: "filter 0.1s",
                    }}
                    onMouseEnter={(e) => { if (isClickable) (e.currentTarget as HTMLDivElement).style.filter = "brightness(0.96)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.filter = ""; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: inMonth ? "#111827" : "#9ca3af" }}>
                      {date.getDate()}
                    </span>

                    {badge && inMonth && (
                      <span style={{ position: "absolute", top: 10, right: 10, background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 5px", lineHeight: "16px" }}>
                        {entry?.status === "LeavePending"
                          ? badge.label
                          : badge.label.slice(0, entry?.status === "HalfDay" ? 2 : 1)}
                      </span>
                    )}

                    {isHoliday && entry?.holidayName && inMonth && (
                      <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 4, fontWeight: 500 }}>{entry.holidayName}</p>
                    )}

                    {entry?.punchIn && inMonth && (
                      <>
                        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{entry.punchIn} – {entry.punchOut ?? "——"}</p>
                        {entry.hoursWorked && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{entry.hoursWorked}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selected && !regDate && (
        <DayModal
          entry={selected}
          isToday={selected.date === today}
          onClose={() => setSelected(null)}
          onApplyReg={() => { setRegDate(selected.date); setSelected(null); }}
        />
      )}

      {regDate && (
        <RegularisationModal
          date={regDate}
          originalIssue={(() => {
            const e = dataMap.get(regDate);
            if (!e) return undefined;
            if (e.status === "Absent") return "Marked absent";
            if (e.lateBy) return `Late by ${e.lateBy}`;
            return undefined;
          })()}
          onClose={() => setRegDate(null)}
          onSubmit={onSubmitRegularisation}
          history={regularisationHistory}
        />
      )}

      {upcomingYmd && !showLeaveForm && (
        <UpcomingDayModal
          ymd={upcomingYmd}
          onClose={() => setUpcomingYmd(null)}
          onApplyLeave={() => setShowLeaveForm(true)}
        />
      )}

      {upcomingYmd && showLeaveForm && (
        <LeaveFormModal
          defaultDate={upcomingYmd}
          leaveBalances={leaveBalances}
          onSubmit={onSubmitLeave}
          onClose={() => { setShowLeaveForm(false); setUpcomingYmd(null); }}
        />
      )}
    </>
  );
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 18, color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
    >
      {children}
    </button>
  );
}
