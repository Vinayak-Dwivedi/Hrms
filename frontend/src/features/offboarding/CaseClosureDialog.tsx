"use client";

import { CheckCircle2, Circle, Lock, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ACCESS_SYSTEM_LABEL,
  type AccessItem,
  type CaseClosure,
  closeCase,
  getCaseAccess,
  getCaseClosure,
  type OffboardingCase,
  revokeAccess,
  revokeAllAccess,
} from "@/features/offboarding/api/offboarding.client";
import { DialogShell, ghostBtn, primaryBtn, StatusPill } from "@/features/offboarding/offboarding-ui";

export default function CaseClosureDialog({
  caseRow,
  onClose,
  onChanged,
}: {
  caseRow: OffboardingCase;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [closure, setClosure] = useState<CaseClosure | null>(null);
  const [access, setAccess] = useState<AccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, a] = await Promise.all([getCaseClosure(caseRow.id), getCaseAccess(caseRow.id)]);
      setClosure(c);
      setAccess(a);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load closure.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revoke(item: AccessItem) {
    setBusy(true);
    try {
      setAccess(await revokeAccess(caseRow.id, item.id));
      setClosure(await getCaseClosure(caseRow.id));
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    setBusy(true);
    try {
      setAccess(await revokeAllAccess(caseRow.id));
      setClosure(await getCaseClosure(caseRow.id));
      toast.success("All access revoked. HRMS login disabled.");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke all.");
    } finally {
      setBusy(false);
    }
  }

  async function doClose() {
    setBusy(true);
    try {
      const c = await closeCase(caseRow.id);
      setClosure(c);
      toast.success("Offboarding case closed.");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close case.");
    } finally {
      setBusy(false);
    }
  }

  const isClosed = closure?.status === "Closed";
  const chk = closure?.checklist;

  return (
    <DialogShell
      title={`Final Closure · ${caseRow.caseNumber}`}
      subtitle={`${caseRow.employee.firstName} ${caseRow.employee.lastName}`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-6 overflow-y-auto">
        {loading || !closure || !chk ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            {/* Closure checklist */}
            <div>
              <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase mb-2">
                Closure Checklist
              </p>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                <ChecklistRow
                  ok={chk.clearances.complete}
                  label="Department Clearances"
                  detail={chk.clearances.teams.map((t) => `${t.team}: ${t.status}`).join(" · ")}
                />
                <ChecklistRow ok={chk.exitInterview.completed} label="Exit Interview Completed" detail={chk.exitInterview.status} />
                <ChecklistRow ok={chk.fnf.paid} label="Full & Final Paid" detail={chk.fnf.status} />
                <ChecklistRow
                  ok={chk.documents.sent > 0}
                  label="Exit Documents"
                  detail={`${chk.documents.generated} generated, ${chk.documents.sent} sent of ${chk.documents.total}`}
                  advisory
                />
                <ChecklistRow
                  ok={chk.access.allRevoked}
                  label="Access Revoked"
                  detail={`${chk.access.revoked}/${chk.access.total} systems disabled`}
                />
              </div>
            </div>

            {/* Access revocation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">
                  Access Revocation
                </p>
                {!isClosed && access.some((a) => a.status === "Active") && (
                  <button
                    type="button"
                    onClick={revokeAll}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    <ShieldOff className="w-3.5 h-3.5" /> Revoke All
                  </button>
                )}
              </div>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {access.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[13px] text-gray-800 flex-1 min-w-0">
                      {ACCESS_SYSTEM_LABEL[a.system]}
                      {a.isAuto && <span className="ml-2 text-[10px] text-[lab(36.9089%_35.0961_-85.6872)] font-semibold">AUTO</span>}
                    </span>
                    {a.status === "Disabled" ? (
                      <StatusPill bg="#fee2e2" color="#b91c1c" label="Disabled" />
                    ) : (
                      <>
                        <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => revoke(a)}
                            disabled={busy}
                            className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                          >
                            Revoke
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] text-gray-400 mt-2">
                Revoking HRMS Login sets the employee account to Exited. Other systems are tracked as
                manual revocations.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <div>
          {isClosed && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#15803d]">
              <CheckCircle2 className="w-4 h-4" /> Offboarding Closed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className={ghostBtn} onClick={onClose} type="button">Close</button>
          {!isClosed && (
            <button
              className={primaryBtn}
              onClick={doClose}
              disabled={busy || !closure?.ready}
              title={closure?.ready ? "" : "Complete all required steps first"}
              type="button"
            >
              <Lock className="w-4 h-4" /> {busy ? "Working…" : "Close Case"}
            </button>
          )}
        </div>
      </div>
    </DialogShell>
  );
}

function ChecklistRow({
  ok,
  label,
  detail,
  advisory,
}: {
  ok: boolean;
  label: string;
  detail?: string;
  advisory?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {ok ? (
        <CheckCircle2 className="w-[18px] h-[18px] text-[#16a34a] shrink-0 mt-0.5" />
      ) : (
        <Circle className={`w-[18px] h-[18px] shrink-0 mt-0.5 ${advisory ? "text-gray-300" : "text-amber-400"}`} />
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-800 m-0">
          {label}
          {advisory && <span className="ml-2 text-[10px] text-gray-400 font-normal">(advisory)</span>}
        </p>
        {detail && <p className="text-[11.5px] text-gray-500 mt-0.5 m-0 truncate">{detail}</p>}
      </div>
    </div>
  );
}
