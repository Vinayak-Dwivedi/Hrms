"use client";

import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  hrApproveExitRequest,
  hrDirectExit,
  hrRejectExitRequest,
  listHrExitRequests,
  type DirectExitType,
  type EmployeeExitRequest,
  type ExitRequestStatus,
  type ManagerExitType,
} from "@/features/offboarding/api/offboarding.client";
import {
  ActionBtn,
  avatarColor,
  cellStyle,
  DialogShell,
  EmptyRow,
  fmtDate,
  headStyle,
  initials,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<ExitRequestStatus, { bg: string; color: string; label: string }> = {
  Pending: { bg: "#fef9c3", color: "#b45309", label: "Pending" },
  Approved: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
};

const EXIT_TYPE_LABELS: Record<string, string> = {
  Absconding: "Absconding",
  ResignedWithoutNotice: "Resigned W/O Notice",
  ResignedWithPartialNotice: "Partial Notice",
  Resigned: "Resigned",
  Terminated: "Terminated",
};

const SETTLEMENT_OPTIONS = [
  { value: "EncashLeave", label: "Encash Leave" },
  { value: "ForfeitLeave", label: "Forfeit Leave" },
  { value: "PartialEncash", label: "Partial Encash" },
  { value: "Depends", label: "Case-by-Case" },
];

const DIRECT_EXIT_TYPES: DirectExitType[] = [
  "Resigned",
  "ResignedWithoutNotice",
  "ResignedWithPartialNotice",
  "Absconding",
  "Terminated",
];

function ExitTypePill({ type }: { type: string }) {
  const colMap: Record<string, { bg: string; color: string }> = {
    Absconding: { bg: "#fee2e2", color: "#b91c1c" },
    ResignedWithoutNotice: { bg: "#fef3c7", color: "#92400e" },
    ResignedWithPartialNotice: { bg: "#fef9c3", color: "#b45309" },
    Resigned: { bg: "#dcfce7", color: "#15803d" },
    Terminated: { bg: "#f3f4f6", color: "#374151" },
  };
  const s = colMap[type] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className="font-semibold"
      style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6, fontSize: 12 }}
    >
      {EXIT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── Approve Dialog ─────────────────────────────────────────────────────────────

function ApproveDialog({
  request,
  onClose,
  onSuccess,
}: {
  request: EmployeeExitRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lwd, setLwd] = useState(request.requestedLwd ?? "");
  const [effectiveDate, setEffectiveDate] = useState(request.requestedLwd ?? "");
  const [settlement, setSettlement] = useState(request.settlementRule ?? "ForfeitLeave");
  const [accessTiming, setAccessTiming] = useState<"Immediate" | "OnLWD">(request.accessRevokeTiming);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const activeLeavesCount = (request.activeLeavesSnapshot as unknown[]).length;

  async function submit() {
    if (!lwd) { toast.error("Last Working Date is required."); return; }
    setBusy(true);
    try {
      const result = await hrApproveExitRequest(request.id, {
        lastWorkingDate: lwd,
        effectiveDate: effectiveDate || lwd,
        settlementRule: settlement,
        accessRevokeTiming: accessTiming,
        hrRemarks: remarks.trim() || null,
      });
      let msg = `Exit approved — ${request.employee.firstName} marked as ${request.exitType}.`;
      if (result.isBackdated) msg += " Backdated LWD: future attendance voided.";
      toast.success(msg, { duration: 5000 });
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="Approve Exit Request"
      subtitle={`${request.employee.firstName} ${request.employee.lastName} · ${request.employee.empId}`}
      maxWidth="max-w-lg"
      onClose={onClose}
    >
      <div className="overflow-y-auto px-6 py-5 space-y-4">
        {/* Exit type (read-only) */}
        <div className="flex items-center gap-2">
          <ExitTypePill type={request.exitType} />
          {request.requestedLwd && (
            <span className="text-xs text-gray-500">
              Manager requested LWD: <strong>{fmtDate(request.requestedLwd)}</strong>
            </span>
          )}
        </div>

        {/* Evidence note */}
        {request.evidenceNote && (
          <div className="rounded-lg p-3 text-sm text-gray-700" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Manager's Note</p>
            <p className="m-0">{request.evidenceNote}</p>
          </div>
        )}

        {/* Active leaves warning */}
        {activeLeavesCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: "#fef3c7", color: "#92400e" }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p className="text-xs m-0">
              <strong>{activeLeavesCount}</strong> active/upcoming leave(s) were found at time of request. Verify cancellation before finalising.
            </p>
          </div>
        )}

        {/* LWD + Effective Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Last Working Date *</label>
            <input type="date" value={lwd} onChange={(e) => { setLwd(e.target.value); if (!effectiveDate) setEffectiveDate(e.target.value); }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Effective Exit Date *</label>
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Settlement rule */}
        <div>
          <label className={labelClass}>Settlement Rule</label>
          <select value={settlement} onChange={(e) => setSettlement(e.target.value)} className={inputClass} style={{ appearance: "none", cursor: "pointer" }}>
            {SETTLEMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Access revoke timing */}
        <div>
          <label className={labelClass}>Access Revocation</label>
          <div className="flex gap-3">
            {(["Immediate", "OnLWD"] as const).map((t) => {
              const active = accessTiming === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccessTiming(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    borderColor: active ? "#2563eb" : "#e5e7eb",
                    background: active ? "#eff6ff" : "#fff",
                    color: active ? "#2563eb" : "#6b7280",
                  }}
                >
                  {t === "Immediate" ? "Immediate" : "On Last Working Day"}
                </button>
              );
            })}
          </div>
        </div>

        {/* HR remarks */}
        <div>
          <label className={labelClass}>HR Remarks <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Internal notes for record..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#bfdbfe] resize-none"
          />
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={submit} disabled={busy} className={primaryBtn}>
          {busy ? "Processing…" : "Approve & Finalise Exit"}
        </button>
      </div>
    </DialogShell>
  );
}

// ── Reject Dialog ──────────────────────────────────────────────────────────────

function RejectDialog({
  request,
  onClose,
  onSuccess,
}: {
  request: EmployeeExitRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await hrRejectExitRequest(request.id, remarks.trim() || null);
      toast.success(`Exit request rejected. ${request.employee.firstName} remains Active.`);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="Reject Exit Request"
      subtitle={`${request.employee.firstName} ${request.employee.lastName} will remain Active.`}
      maxWidth="max-w-md"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className={labelClass}>Reason for rejection <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Explain why the request is being rejected..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#bfdbfe] resize-none"
          />
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {busy ? "Rejecting…" : "Confirm Reject"}
        </button>
      </div>
    </DialogShell>
  );
}

// ── Direct Exit Dialog ─────────────────────────────────────────────────────────

function DirectExitDialog({
  employeeId,
  employeeName,
  empId,
  onClose,
  onSuccess,
}: {
  employeeId: number;
  employeeName: string;
  empId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [exitType, setExitType] = useState<DirectExitType>("Resigned");
  const [lwd, setLwd] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [noticeDays, setNoticeDays] = useState("");
  const [servedDays, setServedDays] = useState("");
  const [settlement, setSettlement] = useState("EncashLeave");
  const [accessTiming, setAccessTiming] = useState<"Immediate" | "OnLWD">("OnLWD");
  const [terminationCode, setTerminationCode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!lwd) { toast.error("Last Working Date is required."); return; }
    setBusy(true);
    try {
      const result = await hrDirectExit(employeeId, {
        exitType,
        lastWorkingDate: lwd,
        effectiveDate: effectiveDate || lwd,
        noticeRequiredDays: noticeDays ? Number(noticeDays) : null,
        noticeServedDays: servedDays ? Number(servedDays) : null,
        settlementRule: settlement,
        terminationReasonCode: terminationCode.trim() || null,
        remarks: remarks.trim() || null,
        accessRevokeTiming: accessTiming,
      });
      let msg = `${employeeName} marked as ${EXIT_TYPE_LABELS[exitType] ?? exitType}.`;
      if (result.isBackdated) msg += " (Backdated — attendance voided.)";
      toast.success(msg, { duration: 5000 });
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process exit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="Direct Exit"
      subtitle={`${employeeName} · ${empId}`}
      maxWidth="max-w-lg"
      onClose={onClose}
    >
      <div className="overflow-y-auto px-6 py-5 space-y-4">
        {/* Exit type */}
        <div>
          <label className={labelClass}>Exit Type *</label>
          <div className="grid grid-cols-3 gap-2">
            {DIRECT_EXIT_TYPES.map((t) => {
              const active = exitType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setExitType(t)}
                  className="py-2 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    borderColor: active ? "#FF014F" : "#e5e7eb",
                    background: active ? "#fff1f5" : "#fff",
                    color: active ? "#FF014F" : "#6b7280",
                  }}
                >
                  {EXIT_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* LWD + Effective Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Last Working Date *</label>
            <input type="date" value={lwd} onChange={(e) => { setLwd(e.target.value); if (!effectiveDate) setEffectiveDate(e.target.value); }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Effective Exit Date *</label>
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Notice days */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Notice Required (days)</label>
            <input type="number" min="0" value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} placeholder="e.g. 30" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notice Served (days)</label>
            <input type="number" min="0" value={servedDays} onChange={(e) => setServedDays(e.target.value)} placeholder="e.g. 0" className={inputClass} />
          </div>
        </div>

        {/* Settlement */}
        <div>
          <label className={labelClass}>Settlement Rule</label>
          <select value={settlement} onChange={(e) => setSettlement(e.target.value)} className={inputClass} style={{ appearance: "none", cursor: "pointer" }}>
            {SETTLEMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Access revoke */}
        <div>
          <label className={labelClass}>Access Revocation</label>
          <div className="flex gap-3">
            {(["Immediate", "OnLWD"] as const).map((t) => {
              const active = accessTiming === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccessTiming(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    borderColor: active ? "#2563eb" : "#e5e7eb",
                    background: active ? "#eff6ff" : "#fff",
                    color: active ? "#2563eb" : "#6b7280",
                  }}
                >
                  {t === "Immediate" ? "Immediate" : "On LWD"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Termination code (only for Terminated) */}
        {exitType === "Terminated" && (
          <div>
            <label className={labelClass}>Termination Reason Code <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
            <input type="text" value={terminationCode} onChange={(e) => setTerminationCode(e.target.value)} placeholder="e.g. MISC, PERF, POLICY" className={inputClass} />
          </div>
        )}

        {/* Remarks */}
        <div>
          <label className={labelClass}>Remarks <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Internal notes for record..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#bfdbfe] resize-none"
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: "#fee2e2", color: "#b91c1c" }}>
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p className="text-xs m-0">
            This action immediately marks the employee as <strong>Inactive</strong>. It cannot be undone through the UI.
          </p>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {busy ? "Processing…" : "Confirm Direct Exit"}
        </button>
      </div>
    </DialogShell>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HrExitRequestsSection() {
  const [rows, setRows] = useState<EmployeeExitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ExitRequestStatus>("all");
  const [approveTarget, setApproveTarget] = useState<EmployeeExitRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EmployeeExitRequest | null>(null);
  const [directExitTarget, setDirectExitTarget] = useState<{ id: number; name: string; empId: string } | null>(null);
  const [showDirectSearch, setShowDirectSearch] = useState(false);
  const [directSearch, setDirectSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await listHrExitRequests());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load exit requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const view = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(["all", "Pending", "Approved", "Rejected"] as const).map((f) => {
            const active = filter === f;
            const count = f === "Pending" ? pendingCount : undefined;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  active ? "bg-[lab(36.9089%_35.0961_-85.6872)] text-white" : "text-gray-600 hover:bg-gray-50",
                ].join(" ")}
              >
                {f === "all" ? "All" : STATUS_META[f].label}
                {count !== undefined && count > 0 && (
                  <span
                    className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none"
                    style={{ background: active ? "rgba(255,255,255,0.3)" : "#f97316", color: "#fff" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowDirectSearch(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          <Plus size={14} />
          Direct Exit
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <TableShell minWidth={980}>
          <thead>
            <tr>
              {["Employee", "Exit Type", "Requested LWD", "Notice Days", "Active Leaves", "Status", "Raised On", "Actions"].map((h) => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <EmptyRow colSpan={8} text="No exit requests found." />
            ) : (
              view.map((r) => {
                const s = STATUS_META[r.status];
                const activeLeavesCount = (r.activeLeavesSnapshot as unknown[]).length;
                const isPending = r.status === "Pending";
                return (
                  <tr key={r.id} className="hover:bg-[#fafbfc] transition-colors">
                    <td style={cellStyle}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: avatarColor(r.employee.empId) }}
                        >
                          {initials(r.employee.firstName, r.employee.lastName)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 m-0">
                            {r.employee.firstName} {r.employee.lastName}
                          </p>
                          <p className="text-xs text-gray-500 m-0">{r.employee.empId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <ExitTypePill type={r.exitType} />
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {fmtDate(r.requestedLwd)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      {r.noticeRequiredDays ?? "—"}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      {activeLeavesCount > 0 ? (
                        <span
                          className="font-semibold"
                          style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontSize: 12 }}
                        >
                          {activeLeavesCount}
                        </span>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>0</span>
                      )}
                    </td>
                    <td style={cellStyle}>
                      <StatusPill bg={s.bg} color={s.color} label={s.label} />
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {fmtDate(r.createdAt)}
                    </td>
                    <td style={cellStyle}>
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <ActionBtn title="Approve" border="#86efac" color="#16a34a" onClick={() => setApproveTarget(r)}>
                            <Check size={15} />
                          </ActionBtn>
                          <ActionBtn title="Reject" border="#fca5a5" color="#dc2626" onClick={() => setRejectTarget(r)}>
                            <X size={15} />
                          </ActionBtn>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: r.hrRemarks ? "#374151" : "#cbd5e1" }}>
                          {r.hrRemarks ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableShell>
      )}

      {/* Direct Exit — employee search dialog */}
      {showDirectSearch && (
        <DirectExitSearchDialog
          exitedEmployeeIds={new Set(rows.filter((r) => r.status === "Approved").map((r) => r.employeeId))}
          onSelect={(emp) => {
            setShowDirectSearch(false);
            setDirectExitTarget({ id: emp.id, name: emp.name, empId: emp.empId });
          }}
          onClose={() => setShowDirectSearch(false)}
        />
      )}

      {approveTarget && (
        <ApproveDialog
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={() => { setApproveTarget(null); void load(); }}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={() => { setRejectTarget(null); void load(); }}
        />
      )}
      {directExitTarget && (
        <DirectExitDialog
          employeeId={directExitTarget.id}
          employeeName={directExitTarget.name}
          empId={directExitTarget.empId}
          onClose={() => setDirectExitTarget(null)}
          onSuccess={() => { setDirectExitTarget(null); void load(); }}
        />
      )}
    </div>
  );
}

// ── Direct Exit Employee Picker ────────────────────────────────────────────────

function DirectExitSearchDialog({
  exitedEmployeeIds,
  onSelect,
  onClose,
}: {
  exitedEmployeeIds: Set<number>;
  onSelect: (emp: { id: number; name: string; empId: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: number; empId: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

  async function doSearch(q: string) {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/hrms/employees?search=${encodeURIComponent(q)}&limit=20`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json() as { data: { id: number; empId: string; firstName: string; lastName: string }[] };
      setResults(data.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { void doSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <DialogShell title="Direct Exit — Select Employee" subtitle="Search for an employee to mark as exited." maxWidth="max-w-md" onClose={onClose}>
      <div className="px-6 py-4 space-y-3">
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or employee ID..."
          className={inputClass}
        />
        {loading && <p className="text-xs text-gray-400">Searching…</p>}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {results.map((e) => {
            const alreadyExited = exitedEmployeeIds.has(e.id);
            return (
              <button
                key={e.id}
                type="button"
                disabled={alreadyExited}
                onClick={() => onSelect({ id: e.id, name: `${e.firstName} ${e.lastName}`, empId: e.empId })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors disabled:opacity-40"
                style={{ background: alreadyExited ? "#f9fafb" : "#fff", border: "1px solid #e5e7eb" }}
                onMouseEnter={(el) => { if (!alreadyExited) el.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(el) => { el.currentTarget.style.background = alreadyExited ? "#f9fafb" : "#fff"; }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: avatarColor(e.empId) }}
                >
                  {initials(e.firstName, e.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 m-0">{e.firstName} {e.lastName}</p>
                  <p className="text-xs text-gray-500 m-0">{e.empId}</p>
                </div>
                {alreadyExited && <span className="text-xs text-gray-400">Already exited</span>}
              </button>
            );
          })}
          {!loading && search.trim() && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No employees found.</p>
          )}
          {!search.trim() && (
            <p className="text-sm text-gray-400 text-center py-4">Start typing to search.</p>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
