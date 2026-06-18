"use client";

import { Check, Eye, PauseCircle, Play, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  hrApprove,
  hrBuyoutDecision,
  hrHold,
  hrReject,
  hrResume,
  listHrResignations,
  type ResignationStatus,
  type ResignationWithEmployee,
} from "@/features/offboarding/api/offboarding.client";
import {
  ActionBtn,
  avatarColor,
  cellStyle,
  DialogShell,
  EmptyRow,
  fmtDate,
  ghostBtn,
  headStyle,
  initials,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";

const STATUS: Record<ResignationStatus, { bg: string; color: string; label: string }> = {
  Submitted: { bg: "#fef9c3", color: "#b45309", label: "Pending Manager" },
  ManagerDiscussion: { bg: "#fef3c7", color: "#92400e", label: "In Discussion" },
  ManagerApproved: { bg: "#fef9c3", color: "#b45309", label: "Pending HR" },
  ManagerRejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
  HRApproved: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
  OnHold: { bg: "#f3f4f6", color: "#6b7280", label: "On Hold" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
  Withdrawn: { bg: "#f3f4f6", color: "#6b7280", label: "Withdrawn" },
};

export default function HrResignationsSection() {
  const [rows, setRows] = useState<ResignationWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [approveTarget, setApproveTarget] = useState<ResignationWithEmployee | null>(null);
  const [holdTarget, setHoldTarget] = useState<ResignationWithEmployee | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ResignationWithEmployee | null>(null);
  const [buyoutTarget, setBuyoutTarget] = useState<ResignationWithEmployee | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listHrResignations());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load resignations.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function resume(r: ResignationWithEmployee) {
    try {
      await hrResume(r.id);
      toast.success(`${r.employee.firstName}'s resignation resumed — back under HR review.`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resume.");
    }
  }

  const view = useMemo(
    () => (filter === "pending" ? rows.filter((r) => r.status === "ManagerApproved") : rows),
    [rows, filter],
  );
  const pendingCount = rows.filter((r) => r.status === "ManagerApproved").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        {(["pending", "all"] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors capitalize"
              style={{
                color: active ? "lab(36.9089% 35.0961 -85.6872)" : "#6b7280",
                borderBottom: active
                  ? "2px solid lab(36.9089% 35.0961 -85.6872)"
                  : "2px solid transparent",
              }}
            >
              {f === "pending" ? "Pending HR" : "All"}
              {f === "pending" && pendingCount > 0 && (
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

      <TableShell minWidth={1000}>
        <thead>
          <tr>
            <th style={headStyle}>Employee</th>
            <th style={headStyle}>ID</th>
            <th style={headStyle}>Last Working Day</th>
            <th style={headStyle}>Reason</th>
            <th style={headStyle}>Manager Rec.</th>
            <th style={headStyle}>Applied On</th>
            <th style={headStyle}>Status</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow colSpan={8} text="Loading…" />
          ) : view.length === 0 ? (
            <EmptyRow colSpan={8} text="No resignations found." />
          ) : (
            view.map((r) => {
              const s = STATUS[r.status];
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
                      <span className="font-semibold text-gray-900">
                        {r.employee.firstName} {r.employee.lastName}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap", color: "#6b7280" }}>{r.employee.empId}</td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(r.lastWorkingDate)}</td>
                  <td style={cellStyle}>{r.reason}</td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(r.recommendedLwd)}</td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(r.submittedOn)}</td>
                  <td style={cellStyle}>
                    <StatusPill bg={s.bg} color={s.color} label={s.label} />
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "ManagerApproved" && (
                        <>
                          <ActionBtn title="Approve" border="#86efac" color="#16a34a" onClick={() => setApproveTarget(r)}>
                            <Check size={16} />
                          </ActionBtn>
                          <ActionBtn title="Put on hold" border="#fde68a" color="#b45309" onClick={() => setHoldTarget(r)}>
                            <PauseCircle size={16} />
                          </ActionBtn>
                          <ActionBtn title="Reject" border="#fca5a5" color="#dc2626" onClick={() => setRejectTarget(r)}>
                            <X size={16} />
                          </ActionBtn>
                        </>
                      )}
                      {r.status === "OnHold" && (
                        <ActionBtn
                          title="Resume — return to HR review"
                          border="#86efac"
                          color="#16a34a"
                          onClick={() => resume(r)}
                        >
                          <Play size={16} />
                        </ActionBtn>
                      )}
                      {r.buyoutRequested && r.buyoutStatus === "Requested" && (
                        <ActionBtn
                          title="Decide notice buyout"
                          border="#bfdbfe"
                          color="lab(36.9089% 35.0961 -85.6872)"
                          onClick={() => setBuyoutTarget(r)}
                        >
                          <Wallet size={16} />
                        </ActionBtn>
                      )}
                      {r.buyoutRequested &&
                        (r.buyoutStatus === "Approved" || r.buyoutStatus === "Rejected") && (
                          <span
                            title={`Notice buyout ${r.buyoutStatus.toLowerCase()}`}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded"
                            style={{
                              background: r.buyoutStatus === "Approved" ? "lab(97% 4 -18)" : "#fee2e2",
                              color: r.buyoutStatus === "Approved" ? "lab(30% 38 -90)" : "#b91c1c",
                            }}
                          >
                            Buyout {r.buyoutStatus.toLowerCase()}
                          </span>
                        )}
                      {r.status !== "ManagerApproved" &&
                        r.status !== "OnHold" &&
                        !(r.buyoutRequested && r.buyoutStatus === "Requested") &&
                        !(
                          r.buyoutRequested &&
                          (r.buyoutStatus === "Approved" || r.buyoutStatus === "Rejected")
                        ) && (
                          <span className="text-gray-300">
                            <Eye size={16} />
                          </span>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      {approveTarget && (
        <HrApproveDialog
          target={approveTarget}
          onClose={() => setApproveTarget(null)}
          onDone={() => {
            setApproveTarget(null);
            void load();
          }}
        />
      )}
      {holdTarget && (
        <RemarksDialog
          title="Put Resignation On Hold"
          target={holdTarget}
          confirmLabel="Put on hold"
          confirmClass="bg-[#d97706] hover:bg-[#b45309]"
          onClose={() => setHoldTarget(null)}
          onConfirm={async (remarks) => {
            await hrHold(holdTarget.id, remarks);
            toast.success("Resignation put on hold.");
            setHoldTarget(null);
            void load();
          }}
        />
      )}
      {rejectTarget && (
        <RemarksDialog
          title="Reject Resignation"
          target={rejectTarget}
          confirmLabel="Reject"
          confirmClass="bg-[#dc2626] hover:bg-[#b91c1c]"
          onClose={() => setRejectTarget(null)}
          onConfirm={async (remarks) => {
            await hrReject(rejectTarget.id, remarks);
            toast.success("Resignation rejected.");
            setRejectTarget(null);
            void load();
          }}
        />
      )}
      {buyoutTarget && (
        <BuyoutDialog
          target={buyoutTarget}
          onClose={() => setBuyoutTarget(null)}
          onDone={() => {
            setBuyoutTarget(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

// HR decides on a requested notice buyout. Approving waives the notice-period
// recovery from the FnF; rejecting flags it for discussion. The employee is
// notified either way.
function BuyoutDialog({
  target,
  onClose,
  onDone,
}: {
  target: ResignationWithEmployee;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"Approved" | "Rejected" | null>(null);

  async function decide(decision: "Approved" | "Rejected") {
    setBusy(decision);
    try {
      await hrBuyoutDecision(target.id, decision, note.trim() || null);
      toast.success(
        decision === "Approved"
          ? "Notice buyout approved — recovery waived. The employee has been notified."
          : "Notice buyout declined. The employee has been notified to discuss.",
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record the decision.");
      setBusy(null);
    }
  }

  return (
    <DialogShell
      title="Notice Buyout Request"
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5">
        <p className="text-[13px] text-gray-600 mb-3 m-0">
          This employee requested to buy out their notice period
          {target.noticePeriodDays != null ? ` (${target.noticePeriodDays} days)` : ""}.
          Approving waives the notice-period recovery from the final settlement;
          declining flags it for discussion.
        </p>
        <label className={labelClass}>Note to employee (optional)</label>
        <textarea
          className={`${inputClass} h-auto min-h-[72px] py-2 resize-y`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add context for the employee…"
        />
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button type="button" className={ghostBtn} onClick={onClose} disabled={busy != null}>
          Cancel
        </button>
        <button
          type="button"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors disabled:opacity-60"
          onClick={() => void decide("Rejected")}
          disabled={busy != null}
        >
          {busy === "Rejected" ? "Declining…" : "Decline"}
        </button>
        <button
          type="button"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[lab(36.9089%_35.0961_-85.6872)] hover:bg-[lab(30%_38_-90)] transition-colors disabled:opacity-60"
          onClick={() => void decide("Approved")}
          disabled={busy != null}
        >
          {busy === "Approved" ? "Approving…" : "Approve buyout"}
        </button>
      </div>
    </DialogShell>
  );
}

function HrApproveDialog({
  target,
  onClose,
  onDone,
}: {
  target: ResignationWithEmployee;
  onClose: () => void;
  onDone: () => void;
}) {
  const [modifiedLwd, setModifiedLwd] = useState(target.recommendedLwd ?? target.lastWorkingDate);
  const [encash, setEncash] = useState(true);
  const [gratuity, setGratuity] = useState(false);
  const [finalSettlement, setFinalSettlement] = useState(true);
  const [recovery, setRecovery] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await hrApprove(target.id, {
        modifiedLwd: modifiedLwd || null,
        leaveEncashmentEligible: encash,
        recoveryAmount: recovery ? Number(recovery) : null,
        gratuityEligible: gratuity,
        finalSettlementEligible: finalSettlement,
        remarks: remarks.trim() || null,
      });
      toast.success(`Approved — offboarding case ${res.case.caseNumber} created.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="HR Approve Resignation"
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Final Last Working Day</label>
            <input className={inputClass} type="date" value={modifiedLwd} onChange={(e) => setModifiedLwd(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Recovery Amount (₹)</label>
            <input className={inputClass} type="number" min={0} value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="space-y-2">
          <Toggle label="Leave encashment eligible" checked={encash} onChange={setEncash} />
          <Toggle label="Gratuity eligible" checked={gratuity} onChange={setGratuity} />
          <Toggle label="Final settlement eligible" checked={finalSettlement} onChange={setFinalSettlement} />
        </div>
        <div>
          <label className={labelClass}>Remarks</label>
          <textarea className={`${inputClass} h-auto min-h-[72px] py-2 resize-y`} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes…" />
        </div>
        <p className="text-[12px] text-gray-500">
          Approving creates an Offboarding Case and marks the employee as exiting.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy} type="button">
          {busy ? "Approving…" : "Approve & Create Case"}
        </button>
      </div>
    </DialogShell>
  );
}

function RemarksDialog({
  title,
  target,
  confirmLabel,
  confirmClass,
  onClose,
  onConfirm,
}: {
  title: string;
  target: ResignationWithEmployee;
  confirmLabel: string;
  confirmClass: string;
  onClose: () => void;
  onConfirm: (remarks: string | null) => Promise<void>;
}) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await onConfirm(remarks.trim() || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
      setBusy(false);
    }
  }
  return (
    <DialogShell
      title={title}
      subtitle={`${target.employee.firstName} ${target.employee.lastName} · ${target.employee.empId}`}
      onClose={onClose}
    >
      <div className="px-6 py-5">
        <label className={labelClass}>Remarks</label>
        <textarea className={`${inputClass} h-auto min-h-[88px] py-2 resize-y`} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add a note…" />
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button
          className={`px-5 py-2.5 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60 ${confirmClass}`}
          onClick={submit}
          disabled={busy}
          type="button"
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)] cursor-pointer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
