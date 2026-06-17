"use client";

// Manual leave-credit grant by Department / Sub-Department. Credits a fixed
// amount of one leave type to every active employee in the chosen group.
// Idempotent per (employee, type, period): re-running the same period skips
// already-credited staff, so you can't double-credit.

import { useEffect, useMemo, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/hrms-client";
import { listLeaveTypes, type LeaveType } from "@/features/leave-policy/api/leave-types.client";

interface LookupRow {
  id: number;
  name: string;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ManualCredit({ onCredited }: { onCredited?: () => void }) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<LookupRow[]>([]);
  const [subDepartments, setSubDepartments] = useState<LookupRow[]>([]);

  const [leaveTypeId, setLeaveTypeId] = useState<number | "">("");
  const [amount, setAmount] = useState("1");
  const [scopeType, setScopeType] = useState<"Department" | "SubDepartment">("Department");
  const [scopeId, setScopeId] = useState<number | "">("");
  const [period, setPeriod] = useState(currentPeriod());
  const [reason, setReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, dRes, sRes] = await Promise.all([
          listLeaveTypes(),
          fetch(`${API_BASE}/api/hrms/departments?limit=500`, { credentials: "include" }),
          fetch(`${API_BASE}/api/hrms/sub-departments?limit=500`, { credentials: "include" }),
        ]);
        setLeaveTypes(t.filter((x) => x.isActive));
        if (dRes.ok) setDepartments(((await dRes.json()).data as LookupRow[]) ?? []);
        if (sRes.ok) setSubDepartments(((await sRes.json()).data as LookupRow[]) ?? []);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const scopeOptions = scopeType === "Department" ? departments : subDepartments;
  const valid = useMemo(
    () => leaveTypeId !== "" && scopeId !== "" && Number(amount) > 0 && /^\d{4}-\d{2}$/.test(period),
    [leaveTypeId, scopeId, amount, period],
  );

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/leave-credits/run/manual`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: Number(leaveTypeId),
          amount: Number(amount),
          scopeType,
          scopeId: Number(scopeId),
          period,
          reason: reason.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? `Failed (${res.status})`);
      const { applied, skipped, total } = body.data;
      setResult(
        `Credited ${applied} of ${total} employee(s). ${
          skipped > 0 ? `${skipped} already credited for ${period} (skipped).` : ""
        }`,
      );
      onCredited?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 mb-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#ec4899] to-[#be185d]">
          <Coins size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
            Manual Credit (by Department / Sub-Department)
          </h2>
          <p className="text-[12px] text-gray-500">
            Grant a fixed amount to every active employee in a group. Safe to
            click â€” the same period can&apos;t be credited twice.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <Field label="Leave Type">
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value === "" ? "" : Number(e.target.value))}
            className={selectCls}
          >
            <option value="">Selectâ€¦</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Days">
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={selectCls}
          />
        </Field>
        <Field label="Period (YYYY-MM)">
          <input value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls} />
        </Field>
        <Field label="Apply to">
          <select
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value as "Department" | "SubDepartment");
              setScopeId("");
            }}
            className={selectCls}
          >
            <option value="Department">Department</option>
            <option value="SubDepartment">Sub-Department</option>
          </select>
        </Field>
        <Field label={scopeType === "Department" ? "Department" : "Sub-Department"}>
          <select
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value === "" ? "" : Number(e.target.value))}
            className={selectCls}
          >
            <option value="">Selectâ€¦</option>
            {scopeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason (optional)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Festival bonus"
            className={selectCls}
          />
        </Field>
      </div>

      {error && (
        <div className="mt-3 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {result && (
        <div className="mt-3 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {result}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !valid}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#ff014f] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />}
          Credit Group
        </button>
      </div>
    </div>
  );
}

const selectCls =
  "px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
