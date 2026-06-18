"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getCase,
  type OffboardingCase,
} from "@/features/offboarding/api/offboarding.client";
import { DialogShell, fmtDate, ghostBtn, StatusPill } from "@/features/offboarding/offboarding-ui";

const CASE_STATUS: Record<OffboardingCase["status"], { bg: string; color: string; label: string }> = {
  OffboardingInitiated: { bg: "#fef3c7", color: "#d97706", label: "Initiated" },
  ClearancesComplete: { bg: "#dbeafe", color: "#1d4ed8", label: "Clearances Done" },
  FnFComplete: { bg: "#fce7f3", color: "#be185d", label: "FnF Complete" },
  Closed: { bg: "#dcfce7", color: "#15803d", label: "Closed" },
  OnHold: { bg: "#f3f4f6", color: "#6b7280", label: "On Hold" },
};

const BUYOUT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  Requested: { bg: "#fef9c3", color: "#b45309", label: "Buyout requested" },
  Approved: { bg: "lab(97% 4 -18)", color: "lab(30% 38 -90)", label: "Buyout approved" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Buyout declined" },
};

// The offboarding lifecycle, in order. The current stage is derived from the
// case status plus, for the settlement stage, the FnF status (Approved/Paid).
function lifecycleStages(c: OffboardingCase): { label: string; state: "done" | "current" | "todo" }[] {
  const order = ["OffboardingInitiated", "ClearancesComplete", "FnFComplete", "Closed"];
  const idx = order.indexOf(c.status === "OnHold" ? "OffboardingInitiated" : c.status);
  const fnfLabel =
    c.fnfStatus === "Paid"
      ? "FnF Paid"
      : c.fnfStatus === "Approved"
        ? "FnF Approved"
        : "Full & Final";
  const labels = ["Initiated", "Clearances", fnfLabel, "Closed"];
  return labels.map((label, i) => ({
    label,
    state: i < idx ? "done" : i === idx ? "current" : "todo",
  }));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 m-0">{label}</p>
      <p className="text-[13.5px] font-medium text-gray-900 mt-0.5 m-0">{value || "—"}</p>
    </div>
  );
}

export default function CaseDetailDialog({
  caseRow,
  onClose,
}: {
  caseRow: OffboardingCase;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<OffboardingCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setDetail(await getCase(caseRow.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load case detail.");
      } finally {
        setLoading(false);
      }
    })();
  }, [caseRow.id]);

  const c = detail ?? caseRow;
  const s = CASE_STATUS[c.status];
  const buyout = c.buyoutStatus && c.buyoutStatus !== "None" ? BUYOUT_STYLE[c.buyoutStatus] : null;

  return (
    <DialogShell
      title={`Case Detail · ${c.caseNumber}`}
      subtitle={`${c.employee.firstName} ${c.employee.lastName} · ${c.employee.empId}`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <StatusPill bg={s.bg} color={s.color} label={s.label} />
              {c.fnfStatus === "Approved" && (
                <StatusPill bg="lab(97% 4 -18)" color="lab(30% 38 -90)" label="FnF Approved" />
              )}
              {c.fnfStatus === "Paid" && (
                <StatusPill bg="#dcfce7" color="#15803d" label="FnF Paid" />
              )}
              {buyout && <StatusPill bg={buyout.bg} color={buyout.color} label={buyout.label} />}
            </div>

            {/* lifecycle: Initiated → Clearances → FnF → Closed */}
            <div className="flex items-center gap-0 mb-6">
              {lifecycleStages(c).map((stage, i) => (
                <div key={stage.label} className="flex items-center">
                  {i > 0 && (
                    <span
                      className="h-[2px] w-8"
                      style={{ background: stage.state === "todo" ? "#e5e7eb" : "#16a34a" }}
                    />
                  )}
                  <span
                    className="text-[11.5px] font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        stage.state === "done"
                          ? "#dcfce7"
                          : stage.state === "current"
                            ? "lab(97% 4 -18)"
                            : "#f3f4f6",
                      color:
                        stage.state === "done"
                          ? "#15803d"
                          : stage.state === "current"
                            ? "lab(36.9089% 35.0961 -85.6872)"
                            : "#9ca3af",
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field
                label="Employee"
                value={`${c.employee.firstName} ${c.employee.lastName}`}
              />
              <Field label="Employee ID" value={c.employee.empId} />
              <Field label="Department" value={c.departmentName} />
              <Field label="Sub-department" value={c.subDepartmentName} />
              <Field label="Reporting Manager" value={c.reportingManagerName} />
              <Field label="Resignation Reason" value={c.resignationReason} />
              <Field label="Date of Joining" value={fmtDate(c.dateOfJoining)} />
              <Field label="Resignation Date" value={fmtDate(c.resignationDate)} />
              <Field label="Last Working Day" value={fmtDate(c.lastWorkingDate)} />
              <Field
                label="Notice Period"
                value={c.noticePeriodDays != null ? `${c.noticePeriodDays} days` : "—"}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </DialogShell>
  );
}
