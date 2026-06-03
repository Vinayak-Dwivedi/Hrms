"use client";

import {
  AlarmClock,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  Sprout,
} from "lucide-react";
import { useEffect, useState } from "react";
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

function fmtRange(from: string, to: string, days: string) {
  const f = new Date(from);
  const t = new Date(to);
  const opt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  if (from === to) return `${f.toLocaleDateString("en-GB", opt)} (${days} Day${Number(days) === 1 ? "" : "s"})`;
  return `${f.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString("en-GB", opt)} (${days} Days)`;
}

function fmtAppliedShort(iso: string) {
  return `Applied ${new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtRegDate(date: string) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-GB", { weekday: "long" });
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} (${day})`;
}

function RejectPanel({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="rounded-lg p-4 mb-4" style={{ background: "#f3f4f6" }}>
      <p className="text-sm font-semibold text-gray-800 mb-2">Reason for rejection</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Share context with the employee..."
        rows={3}
        className="w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none"
        style={{ borderColor: "#d1d5db", background: "#fff" }}
      />
      <div className="flex justify-end gap-3 mt-3">
        <button onClick={onCancel} className="px-4 py-1.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason)}
          className="px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors hover:bg-red-50"
          style={{ borderColor: "#dc143c", color: "#dc143c" }}
        >
          Confirm Reject
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-4" style={{ background: bg }}>
      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full" style={{ background: bg, color }}>
        {label}
      </span>
    </div>
  );
}

// ── Leave card ────────────────────────────────────────────────────────────────

function LeaveCard({
  req,
  onApprove,
  onReject,
  onForward,
  rejectOpen,
  onOpenReject,
  onCloseReject,
  busy,
}: {
  req: ApprovalLeaveRequest;
  onApprove: (id: number) => void;
  onReject: (id: number, remarks: string) => void;
  onForward: (id: number) => void;
  rejectOpen: boolean;
  onOpenReject: () => void;
  onCloseReject: () => void;
  busy: boolean;
}) {
  const avatarColor = colorFor(req.empId);
  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: avatarColor }}
            >
              {initials(req.firstName, req.lastName)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {req.firstName} {req.lastName}
              </p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                {req.designation ?? "—"} · {req.empId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ background: "#fce7f3", color: "#9d174d" }}>
              {req.leaveTypeName}
            </span>
            <span className="text-sm" style={{ color: "#9ca3af" }}>
              {fmtAppliedShort(req.appliedOn)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-10 mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays size={13} style={{ color: "#6366f1" }} />
              <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Dates
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {fmtRange(req.fromDate, req.toDate, req.days)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={13} style={{ color: "#6b7280" }} />
              <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Duration
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{req.durationType}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sprout size={13} style={{ color: "#16a34a" }} />
              <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Code
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{req.leaveTypeCode}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium mb-1" style={{ color: "#9ca3af" }}>
            Reason
          </p>
          <p className="text-sm text-gray-700">{req.reason}</p>
        </div>

        {req.managerRemarks && req.status !== "Pending" && (
          <div className="flex items-start gap-2 rounded-lg px-4 py-2.5 mb-4 text-sm" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "#6b7280" }} />
            <span style={{ color: "#374151" }}>
              <strong>Manager remarks:</strong> {req.managerRemarks}
            </span>
          </div>
        )}

        {rejectOpen && <RejectPanel onCancel={onCloseReject} onConfirm={(r) => onReject(req.id, r)} />}
        {req.status === "Approved" && <StatusBadge label="Approved" bg="#f0fdf4" color="#15803d" />}
        {req.status === "Rejected" && <StatusBadge label="Rejected" bg="#fff1f2" color="#dc2626" />}
        {req.status === "Forwarded" && <StatusBadge label="Forwarded to HR" bg="#eff6ff" color="#1d4ed8" />}

        {req.status === "Pending" && !rejectOpen && (
          <div className="flex justify-end gap-2">
            <button
              disabled={busy}
              onClick={() => onApprove(req.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: "#16a34a" }}
            >
              <Check size={14} /> Approve
            </button>
            <button
              disabled={busy}
              onClick={onOpenReject}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ borderColor: "#dc143c", color: "#dc143c" }}
            >
              Reject
            </button>
            <button
              disabled={busy}
              onClick={() => onForward(req.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: "#d1d5db", color: "#374151" }}
            >
              <ArrowUpRight size={14} /> Forward to HR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Regularisation card ───────────────────────────────────────────────────────

function RegCard({
  req,
  onApprove,
  onReject,
  rejectOpen,
  onOpenReject,
  onCloseReject,
  busy,
}: {
  req: ApprovalRegRequest;
  onApprove: (id: number) => void;
  onReject: (id: number, remarks: string) => void;
  rejectOpen: boolean;
  onOpenReject: () => void;
  onCloseReject: () => void;
  busy: boolean;
}) {
  const avatarColor = colorFor(req.empId);
  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: avatarColor }}
          >
            {initials(req.firstName, req.lastName)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {req.firstName} {req.lastName}
            </p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              {fmtRegDate(req.date)}
            </p>
          </div>
        </div>

        <div className="rounded-lg px-4 py-3 mb-4 grid grid-cols-3 gap-4" style={{ background: "#f8fafc", border: "1px solid #e5e7eb" }}>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ClipboardList size={13} style={{ color: "#6b7280" }} />
              <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Original Issue
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{req.originalIssue ?? "—"}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <AlarmClock size={13} style={{ color: "#e91e8c" }} />
              <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Requested In
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmtTime(req.requestedPunchIn)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <AlarmClock size={13} style={{ color: "#e91e8c" }} />
              <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Requested Out
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmtTime(req.requestedPunchOut)}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium mb-1" style={{ color: "#9ca3af" }}>
            Reason
          </p>
          <p className="text-sm text-gray-700">{req.reason}</p>
        </div>

        {req.approverRemarks && req.status !== "Pending" && (
          <div className="flex items-start gap-2 rounded-lg px-4 py-2.5 mb-4 text-sm" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "#6b7280" }} />
            <span style={{ color: "#374151" }}>
              <strong>Manager remarks:</strong> {req.approverRemarks}
            </span>
          </div>
        )}

        {rejectOpen && <RejectPanel onCancel={onCloseReject} onConfirm={(r) => onReject(req.id, r)} />}
        {req.status === "Approved" && <StatusBadge label="Approved" bg="#f0fdf4" color="#15803d" />}
        {req.status === "Rejected" && <StatusBadge label="Rejected" bg="#fff1f2" color="#dc2626" />}

        {req.status === "Pending" && !rejectOpen && (
          <div className="flex justify-end gap-2">
            <button
              disabled={busy}
              onClick={() => onApprove(req.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: "#16a34a" }}
            >
              <Check size={14} /> Approve
            </button>
            <button
              disabled={busy}
              onClick={onOpenReject}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ borderColor: "#dc143c", color: "#dc143c" }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type MainTab = "leave" | "regularisation";
type LeaveSubTab = "all" | "pending" | "approved" | "rejected" | "forwarded";
type RegSubTab = "all" | "pending" | "approved" | "rejected";

export default function Approvals() {
  const [mainTab, setMainTab] = useState<MainTab>("leave");

  const [leaveSubTab, setLeaveSubTab] = useState<LeaveSubTab>("pending");
  const [leaveRequests, setLeaveRequests] = useState<ApprovalLeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveRejectingId, setLeaveRejectingId] = useState<number | null>(null);
  const [leaveBusyId, setLeaveBusyId] = useState<number | null>(null);

  const [regSubTab, setRegSubTab] = useState<RegSubTab>("pending");
  const [regRequests, setRegRequests] = useState<ApprovalRegRequest[]>([]);
  const [regLoading, setRegLoading] = useState(true);
  const [regRejectingId, setRegRejectingId] = useState<number | null>(null);
  const [regBusyId, setRegBusyId] = useState<number | null>(null);

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

  const leavePending = leaveRequests.filter((r) => r.status === "Pending").length;
  const regPending = regRequests.filter((r) => r.status === "Pending").length;

  const visibleLeave = leaveRequests.filter((r) => {
    if (leaveSubTab === "all") return true;
    const cap = leaveSubTab.charAt(0).toUpperCase() + leaveSubTab.slice(1);
    return r.status === cap;
  });
  const visibleReg = regRequests.filter((r) => {
    if (regSubTab === "all") return true;
    const cap = regSubTab.charAt(0).toUpperCase() + regSubTab.slice(1);
    return r.status === cap;
  });

  const LEAVE_SUB: { key: LeaveSubTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "forwarded", label: "Forwarded" },
  ];
  const REG_SUB: { key: RegSubTab; label: string }[] = [
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
              onClick={() => setMainTab(t.key)}
              className="px-6 py-4 text-sm font-semibold transition-colors"
              style={{
                color: mainTab === t.key ? "#dc143c" : "#6b7280",
                borderBottom: mainTab === t.key ? "2px solid #dc143c" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mainTab === "leave" && (
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-1">
            {LEAVE_SUB.map((t) => (
              <button
                key={t.key}
                onClick={() => setLeaveSubTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: leaveSubTab === t.key ? "#dc143c" : "#6b7280",
                  borderBottom: leaveSubTab === t.key ? "2px solid #dc143c" : "2px solid transparent",
                }}
              >
                {t.label}
                {t.key === "pending" && leavePending > 0 && (
                  <span
                    className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none"
                    style={{ background: "#f97316" }}
                  >
                    {leavePending}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {leaveLoading && <div className="text-center py-12 text-gray-400 text-sm">Loading approvals…</div>}
            {!leaveLoading && visibleLeave.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No requests found.</div>
            )}
            {!leaveLoading &&
              visibleLeave.map((req) => (
                <LeaveCard
                  key={req.id}
                  req={req}
                  onApprove={approveLeave}
                  onReject={rejectLeave}
                  onForward={forwardLeave}
                  rejectOpen={leaveRejectingId === req.id}
                  onOpenReject={() => setLeaveRejectingId(req.id)}
                  onCloseReject={() => setLeaveRejectingId(null)}
                  busy={leaveBusyId === req.id}
                />
              ))}
          </div>
        </div>
      )}

      {mainTab === "regularisation" && (
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-1">
            {REG_SUB.map((t) => (
              <button
                key={t.key}
                onClick={() => setRegSubTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: regSubTab === t.key ? "#dc143c" : "#6b7280",
                  borderBottom: regSubTab === t.key ? "2px solid #dc143c" : "2px solid transparent",
                }}
              >
                {t.label}
                {t.key === "pending" && regPending > 0 && (
                  <span
                    className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none"
                    style={{ background: "#f97316" }}
                  >
                    {regPending}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {regLoading && <div className="text-center py-12 text-gray-400 text-sm">Loading regularisations…</div>}
            {!regLoading && visibleReg.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No requests found.</div>
            )}
            {!regLoading &&
              visibleReg.map((req) => (
                <RegCard
                  key={req.id}
                  req={req}
                  onApprove={approveReg}
                  onReject={rejectReg}
                  rejectOpen={regRejectingId === req.id}
                  onOpenReject={() => setRegRejectingId(req.id)}
                  onCloseReject={() => setRegRejectingId(null)}
                  busy={regBusyId === req.id}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
