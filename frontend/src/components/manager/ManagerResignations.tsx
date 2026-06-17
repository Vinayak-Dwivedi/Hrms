"use client";

import { Check, Eye, MessageSquare, Paperclip, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listManagerResignations,
  managerApprove,
  managerReject,
  managerRequestDiscussion,
  type ResignationStatus,
  type ResignationWithEmployee,
} from "@/features/offboarding/api/offboarding.client";

// Visual language matches the leave approvals table (cellStyle/headStyle + pill
// palette) so the resignation tab is consistent with the rest of Approvals.
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

const STATUS_STYLE: Record<ResignationStatus, { bg: string; color: string; label: string }> = {
  Submitted: { bg: "#fef9c3", color: "#b45309", label: "Pending" },
  ManagerDiscussion: { bg: "#fef3c7", color: "#92400e", label: "In Discussion" },
  ManagerApproved: { bg: "#dbeafe", color: "#1d4ed8", label: "Approved" },
  ManagerRejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
  HRApproved: { bg: "#dcfce7", color: "#15803d", label: "HR Approved" },
  OnHold: { bg: "#f3f4f6", color: "#6b7280", label: "On Hold" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
  Withdrawn: { bg: "#f3f4f6", color: "#6b7280", label: "Withdrawn" },
};

const SUB_TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;
type SubTab = (typeof SUB_TABS)[number]["key"];

function initials(a: string, b: string) {
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
}
function colorFor(seed: string) {
  const palette = ["#FF014F", "#7c3aed", "#0ea5e9", "#16a34a", "#d97706", "#db2777"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % palette.length;
  return palette[h];
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ManagerResignations({
  mode = "all",
}: {
  // "all" → the full resignation queue with sub-tabs; "discussion" → only the
  // resignations the manager has put In Discussion (no sub-tabs).
  mode?: "all" | "discussion";
}) {
  const [rows, setRows] = useState<ResignationWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("pending");
  const [approveTarget, setApproveTarget] = useState<ResignationWithEmployee | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ResignationWithEmployee | null>(null);
  const [discussTarget, setDiscussTarget] = useState<ResignationWithEmployee | null>(null);
  const [viewTarget, setViewTarget] = useState<ResignationWithEmployee | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listManagerResignations());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load resignations.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const pendingCount = rows.filter((r) => r.status === "Submitted").length;
  const filtered = useMemo(() => {
    if (mode === "discussion") return rows.filter((r) => r.status === "ManagerDiscussion");
    if (subTab === "all") return rows;
    if (subTab === "pending") return rows.filter((r) => r.status === "Submitted");
    if (subTab === "approved")
      return rows.filter((r) => r.status === "ManagerApproved" || r.status === "HRApproved");
    return rows.filter((r) => r.status === "ManagerRejected" || r.status === "Rejected");
  }, [rows, subTab, mode]);

  return (
    <div className="pt-4 space-y-4">
      {/* Sub-tabs (hidden in discussion mode) */}
      {mode !== "discussion" && (
      <div className="flex items-center gap-1">
        {SUB_TABS.map((t) => {
          const active = subTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSubTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: active ? "#dc143c" : "#6b7280",
                borderBottom: active ? "2px solid #dc143c" : "2px solid transparent",
              }}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span
                  className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 leading-none"
                  style={{ background: "#f97316" }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      )}

      <div
        style={{ background: "#fff", borderRadius: 16, border: "1px solid #eef0f3", overflow: "hidden" }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={headStyle}>Employee</th>
                <th style={headStyle}>ID</th>
                <th style={headStyle}>Last Working Day</th>
                <th style={headStyle}>Reason</th>
                <th style={headStyle}>Remark</th>
                <th style={headStyle}>Attachment</th>
                <th style={headStyle}>Buyout</th>
                <th style={headStyle}>Applied On</th>
                <th style={headStyle}>Status</th>
                <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ ...cellStyle, textAlign: "center", color: "#9ca3af", padding: 40 }}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...cellStyle, textAlign: "center", color: "#9ca3af", padding: 40 }}>
                    No resignations found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const s = STATUS_STYLE[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-[#fafbfc] transition-colors">
                      <td style={cellStyle}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: colorFor(r.employee.empId) }}
                          >
                            {initials(r.employee.firstName, r.employee.lastName)}
                          </div>
                          <span className="font-semibold text-gray-900">
                            {r.employee.firstName} {r.employee.lastName}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap", color: "#6b7280" }}>
                        {r.employee.empId}
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(r.lastWorkingDate)}</td>
                      <td style={cellStyle}>{r.reason}</td>
                      <td style={{ ...cellStyle, maxWidth: 220 }}>
                        <span className="block truncate text-gray-500">{r.detailedRemark ?? "—"}</span>
                      </td>
                      <td style={cellStyle}>
                        {r.attachmentPath ? (
                          <span className="inline-flex items-center gap-1 text-[#2563eb]">
                            <Paperclip size={14} /> File
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={cellStyle}>{r.buyoutRequested ? "Yes" : "No"}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(r.submittedOn)}</td>
                      <td style={cellStyle}>
                        <span
                          className="font-semibold"
                          style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6, fontSize: 12 }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "Submitted" || r.status === "ManagerDiscussion" ? (
                            <>
                              <ActionBtn title="Approve" border="#86efac" color="#16a34a" onClick={() => setApproveTarget(r)}>
                                <Check size={16} />
                              </ActionBtn>
                              <ActionBtn title="Request discussion" border="#fde68a" color="#b45309" onClick={() => setDiscussTarget(r)}>
                                <MessageSquare size={16} />
                              </ActionBtn>
                              <ActionBtn title="Reject" border="#fca5a5" color="#dc2626" onClick={() => setRejectTarget(r)}>
                                <X size={16} />
                              </ActionBtn>
                            </>
                          ) : (
                            <ActionBtn title="View" border="#bfdbfe" color="#2563eb" onClick={() => setViewTarget(r)}>
                              <Eye size={16} />
                            </ActionBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {approveTarget && (
        <ApproveDialog
          target={approveTarget}
          onClose={() => setApproveTarget(null)}
          onDone={() => {
            setApproveTarget(null);
            void load();
          }}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => {
            setRejectTarget(null);
            void load();
          }}
        />
      )}
      {discussTarget && (
        <DiscussDialog
          target={discussTarget}
          onClose={() => setDiscussTarget(null)}
          onDone={() => {
            setDiscussTarget(null);
            void load();
          }}
        />
      )}
      {viewTarget && <ViewDialog target={viewTarget} onClose={() => setViewTarget(null)} />}
    </div>
  );
}

function ActionBtn({
  title,
  border,
  color,
  onClick,
  children,
}: {
  title: string;
  border: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      type="button"
      className="flex items-center justify-center rounded-lg transition-colors"
      style={{ width: 34, height: 34, border: `1.5px solid ${border}`, color, background: "#fff" }}
    >
      {children}
    </button>
  );
}

// ── Dialogs ──

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close" className="absolute inset-0 bg-black/50 border-0 cursor-default" onClick={onClose} type="button" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg px-4">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-semibold text-gray-900 m-0">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-1 mb-0">{subtitle}</p>}
            </div>
            <button aria-label="Close" className="p-2 rounded-lg hover:bg-gray-100 border-0 bg-transparent cursor-pointer" onClick={onClose} type="button">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

const labelClass = "block text-xs font-medium text-gray-500 uppercase mb-1.5 tracking-wide";
const inputClass =
  "w-full h-[38px] px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#ffb9ce] focus:border-transparent";
const primaryBtn =
  "px-5 py-2.5 bg-[#FF014F] hover:bg-[#eb0249] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60";
const ghostBtn =
  "px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors";

function ApproveDialog({
  target,
  onClose,
  onDone,
}: {
  target: ResignationWithEmployee;
  onClose: () => void;
  onDone: () => void;
}) {
  const [recommendedLwd, setRecommendedLwd] = useState(target.lastWorkingDate);
  const [kt, setKt] = useState(false);
  const [replacement, setReplacement] = useState(false);
  const [critical, setCritical] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await managerApprove(target.id, {
        recommendedLwd: recommendedLwd || null,
        knowledgeTransferRequired: kt,
        replacementRequired: replacement,
        criticalResource: critical,
        remarks: remarks.trim() || null,
      });
      toast.success("Resignation approved — forwarded to HR.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="Approve Resignation"
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className={labelClass}>Recommended Last Working Day</label>
          <input className={inputClass} type="date" value={recommendedLwd} onChange={(e) => setRecommendedLwd(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Toggle label="Knowledge transfer required" checked={kt} onChange={setKt} />
          <Toggle label="Replacement required" checked={replacement} onChange={setReplacement} />
          <Toggle label="Critical resource" checked={critical} onChange={setCritical} />
        </div>
        <div>
          <label className={labelClass}>Remarks</label>
          <textarea className={`${inputClass} h-auto min-h-[72px] py-2 resize-y`} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes for HR…" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy} type="button">
          {busy ? "Approving…" : "Approve"}
        </button>
      </div>
    </DialogShell>
  );
}

function RejectDialog({
  target,
  onClose,
  onDone,
}: {
  target: ResignationWithEmployee;
  onClose: () => void;
  onDone: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await managerReject(target.id, remarks.trim() || null);
      toast.success("Resignation rejected.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogShell
      title="Reject Resignation"
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5">
        <label className={labelClass}>Reason for rejection</label>
        <textarea className={`${inputClass} h-auto min-h-[88px] py-2 resize-y`} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Explain why this is being rejected…" />
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className="px-5 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60" onClick={submit} disabled={busy} type="button">
          {busy ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </DialogShell>
  );
}

function DiscussDialog({
  target,
  onClose,
  onDone,
}: {
  target: ResignationWithEmployee;
  onClose: () => void;
  onDone: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await managerRequestDiscussion(target.id, remarks.trim() || null);
      toast.success("Discussion requested — the employee has been notified.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to request discussion.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogShell
      title="Request Discussion"
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5">
        <label className={labelClass}>Message to the employee</label>
        <textarea
          className={`${inputClass} h-auto min-h-[88px] py-2 resize-y`}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Let's discuss your last working day / knowledge transfer before I approve…"
        />
        <p className="text-[11.5px] text-gray-400 mt-2">
          The resignation is marked <strong>In Discussion</strong> and the employee gets a
          notification. You can still approve or reject afterward.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button
          className="px-5 py-2.5 bg-[#b45309] hover:bg-[#92400e] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60"
          onClick={submit}
          disabled={busy}
          type="button"
        >
          {busy ? "Requesting…" : "Request Discussion"}
        </button>
      </div>
    </DialogShell>
  );
}

function ViewDialog({ target, onClose }: { target: ResignationWithEmployee; onClose: () => void }) {
  return (
    <DialogShell
      title="Resignation Details"
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-3 text-sm">
        <Row label="Last working day" value={fmtDate(target.lastWorkingDate)} />
        <Row label="Reason" value={target.reason} />
        <Row label="Remark" value={target.detailedRemark ?? "—"} />
        <Row label="Notice buyout" value={target.buyoutRequested ? "Yes" : "No"} />
        <Row label="Recommended LWD" value={fmtDate(target.recommendedLwd)} />
        <Row label="Status" value={STATUS_STYLE[target.status]?.label ?? target.status} />
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className={ghostBtn} onClick={onClose} type="button">Close</button>
      </div>
    </DialogShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" className="w-4 h-4 accent-[#FF014F] cursor-pointer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
