"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addFnfLine,
  approveFnf,
  type CaseFnf,
  deleteFnfLine,
  type FnfLineKind,
  formatMoney,
  getCaseFnf,
  payFnf,
  updateFnfLine,
} from "@/features/offboarding/api/offboarding.client";

// Minimal shape the dialog needs — satisfied by both a full OffboardingCase and
// an FnF list item.
export type FnfDialogCase = {
  id: number;
  caseNumber: string;
  lastWorkingDate: string;
  employee: { firstName: string; lastName: string };
};
import { DialogShell, fmtDate, ghostBtn, primaryBtn, StatusPill } from "@/features/offboarding/offboarding-ui";

const FNF_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Processing: { bg: "#fef9c3", color: "#b45309" },
  Approved: { bg: "#dbeafe", color: "#1d4ed8" },
  Paid: { bg: "#dcfce7", color: "#15803d" },
};

export default function CaseFnfDialog({
  caseRow,
  onClose,
  onChanged,
}: {
  caseRow: FnfDialogCase;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<CaseFnf | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setData(await getCaseFnf(caseRow.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load settlement.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = data?.settlement.status ?? "Processing";
  const editable = status === "Processing";
  const earnings = data?.lines.filter((l) => l.kind === "Earning") ?? [];
  const deductions = data?.lines.filter((l) => l.kind === "Deduction") ?? [];

  async function addLine(kind: FnfLineKind) {
    try {
      setData(await addFnfLine(caseRow.id, { kind, label: kind === "Earning" ? "New earning" : "New deduction", amount: 0 }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add line.");
    }
  }

  async function saveLine(lineId: number, patch: { label?: string; amount?: number }) {
    try {
      setData(await updateFnfLine(caseRow.id, lineId, patch));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
      void load();
    }
  }

  async function removeLine(lineId: number) {
    try {
      setData(await deleteFnfLine(caseRow.id, lineId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  async function doApprove() {
    setBusy(true);
    try {
      setData(await approveFnf(caseRow.id));
      toast.success("Settlement approved.");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setBusy(false);
    }
  }

  async function doPay() {
    setBusy(true);
    try {
      setData(await payFnf(caseRow.id));
      toast.success("Settlement marked paid.");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark paid.");
    } finally {
      setBusy(false);
    }
  }

  const st = FNF_STATUS_STYLE[status] ?? FNF_STATUS_STYLE.Processing;

  return (
    <DialogShell
      title={`Full & Final · ${caseRow.caseNumber}`}
      subtitle={`${caseRow.employee.firstName} ${caseRow.employee.lastName} · LWD ${fmtDate(caseRow.lastWorkingDate)}`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {loading || !data ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <StatusPill bg={st.bg} color={st.color} label={status} />
              {!editable && (
                <span className="text-[12px] text-gray-400">Locked — settlement is {status.toLowerCase()}.</span>
              )}
            </div>

            <LineSection
              title="Earnings"
              lines={earnings}
              editable={editable}
              accent="#16a34a"
              onSave={saveLine}
              onRemove={removeLine}
              onAdd={() => addLine("Earning")}
            />
            <LineSection
              title="Deductions"
              lines={deductions}
              editable={editable}
              accent="#dc2626"
              onSave={saveLine}
              onRemove={removeLine}
              onAdd={() => addLine("Deduction")}
            />

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <TotalRow label="Total Earnings" value={formatMoney(data.totals.totalEarnings)} />
              <TotalRow label="Total Deductions" value={`− ${formatMoney(data.totals.totalDeductions)}`} />
              <div className="flex items-center justify-between px-4 py-3 bg-[lab(97%_4_-18)]">
                <span className="text-[13px] font-bold text-[lab(36.9089%_35.0961_-85.6872)]">Net Settlement</span>
                <span className="text-[15px] font-bold text-[lab(36.9089%_35.0961_-85.6872)]">{formatMoney(data.totals.netAmount)}</span>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Close</button>
        {status === "Processing" && (
          <button className={primaryBtn} onClick={doApprove} disabled={busy} type="button">
            {busy ? "Working…" : "Approve Settlement"}
          </button>
        )}
        {status === "Approved" && (
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60"
            onClick={doPay}
            disabled={busy}
            type="button"
          >
            {busy ? "Working…" : "Mark as Paid"}
          </button>
        )}
      </div>
    </DialogShell>
  );
}

function LineSection({
  title,
  lines,
  editable,
  accent,
  onSave,
  onRemove,
  onAdd,
}: {
  title: string;
  lines: { id: number; label: string; amount: string }[];
  editable: boolean;
  accent: string;
  onSave: (id: number, patch: { label?: string; amount?: number }) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {title}
        </span>
        {editable && (
          <button type="button" onClick={onAdd} className={`${ghostBtn} h-[30px] py-0`}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>
      {lines.length === 0 ? (
        <p className="text-[12px] text-gray-400 px-1 py-2">No items.</p>
      ) : (
        <div className="space-y-2">
          {lines.map((l) => (
            <LineRow key={l.id} line={l} editable={editable} onSave={onSave} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

function LineRow({
  line,
  editable,
  onSave,
  onRemove,
}: {
  line: { id: number; label: string; amount: string };
  editable: boolean;
  onSave: (id: number, patch: { label?: string; amount?: number }) => void;
  onRemove: (id: number) => void;
}) {
  const [label, setLabel] = useState(line.label);
  const [amount, setAmount] = useState(line.amount);

  // Keep local state in sync when the server returns fresh data.
  useEffect(() => {
    setLabel(line.label);
    setAmount(line.amount);
  }, [line.label, line.amount]);

  if (!editable) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
        <span className="text-[13px] text-gray-700">{line.label}</span>
        <span className="text-[13px] font-medium text-gray-900">
          {formatMoney(Number(line.amount) || 0)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 h-[36px] px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#bfdbfe]"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label !== line.label && onSave(line.id, { label })}
      />
      <input
        className="w-32 h-[36px] px-3 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#bfdbfe]"
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={() => amount !== line.amount && onSave(line.id, { amount: Number(amount) || 0 })}
      />
      <button
        type="button"
        title="Remove"
        onClick={() => onRemove(line.id)}
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: 36, height: 36, border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff" }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
      <span className="text-[13px] text-gray-600">{label}</span>
      <span className="text-[13px] font-medium text-gray-900">{value}</span>
    </div>
  );
}
