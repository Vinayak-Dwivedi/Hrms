"use client";

// Phase 4 — Leave Policies (bundle plans). Left: a list of plans. Right: a
// create/edit panel that sets per-leave-type annual quotas, links a weekly-off
// config, toggles comp-off, and assigns scope. Saving an Active plan auto-seeds
// employee leave balances (the API returns how many it created).

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Loader2,
  Pencil,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeBtnSmClass,
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeIconPen,
  employeeIconXs,
  employeeInputClass,
  employeeListResetBtnClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";
import {
  archiveLeavePlan,
  createLeavePlan,
  getLeavePlan,
  listLeavePlans,
  updateLeavePlan,
  type AccrualMethod,
  type LeavePlanDetail,
  type LeavePlanStatus,
  type LeavePlanSummary,
  type PlanScopeRow,
} from "./api/leave-plans.client";
import { listLeaveTypes, type LeaveType } from "./api/leave-types.client";
import {
  listWorkflows,
  type ApprovalWorkflow,
} from "./api/approval-workflows.client";
import {
  listWeeklyOff,
  type WeeklyOffSummary,
} from "@/features/weekly-off/api/weekly-off.client";
import LeavePlanHierarchyScopeEditor from "./LeavePlanHierarchyScopeEditor";
import {
  hydrateCascadeFromRows,
  isCascadeScopeValid,
} from "./lib/leave-plan-scope";

const STATUSES: LeavePlanStatus[] = ["Draft", "Active", "Archived"];
const DEFAULT_SCOPE: PlanScopeRow[] = [
  { scopeType: "Company", scopeId: null, priority: 100 },
];

type Target = LeavePlanSummary | "new" | null;

export default function LeavePoliciesSection() {
  const [plans, setPlans] = useState<LeavePlanSummary[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [weeklyOffs, setWeeklyOffs] = useState<WeeklyOffSummary[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Target>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t, w, wf] = await Promise.all([
        listLeavePlans(),
        listLeaveTypes(),
        listWeeklyOff(),
        listWorkflows(),
      ]);
      setPlans(p);
      setLeaveTypes(t.filter((x) => x.isActive));
      setWeeklyOffs(w);
      setWorkflows(wf);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const woName = (id: number | null) =>
    id == null ? null : (weeklyOffs.find((w) => w.id === id)?.name ?? `#${id}`);

  async function clonePlan(plan: LeavePlanSummary) {
    try {
      const full = await getLeavePlan(plan.id);
      await createLeavePlan({
        name: `${full.name} (Copy)`,
        description: full.description,
        status: "Draft", // clone lands as Draft so it doesn't auto-seed
        isDefault: false,
        weeklyOffConfigId: full.weeklyOffConfigId,
        compOffEnabled: full.compOffEnabled,
        accrualMethod: full.accrualMethod,
        carryForwardCap: full.carryForwardCap,
        proRataJoiners: false,
        approvalWorkflowId: full.approvalWorkflowId,
        allocations: full.allocations.map((a) => ({
          leaveTypeId: a.leaveTypeId,
          annualQuota: a.annualQuota,
        })),
        scope: full.scope.map((s) => ({
          scopeType: s.scopeType,
          scopeId: s.scopeId,
          priority: s.priority,
        })),
      });
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header card */}
      <section className={`${employeeCardClass} px-6 py-5 flex items-center justify-between gap-4`}>
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
            Leave Policies
          </h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
            Bundle annual quotas, a weekly-off pattern and comp-off into a
            policy, then assign it to a group.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className={employeeListResetBtnClass}
          >
            <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={employeeBtnSmClass}
          >
            <PlusCircle className={employeeIconXs} /> Create Policy
          </button>
        </div>
      </section>

      {error && (
        <div className={employeeErrorBannerClass}>
          {error}
        </div>
      )}

      {/* Table */}
      <section className={`${employeeCardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th>Name</Th>
                <Th>Quotas</Th>
                <Th>Week Off</Th>
                <Th className="text-center">Comp Off</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading && plans.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && plans.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-[12.5px]">
                    No policies yet. Click “Create Policy” to add one.
                  </td>
                </tr>
              )}
              {plans.map((p) => {
                const quotaSummary = p.allocations
                  .filter((a) => a.annualQuota > 0)
                  .map((a) => `${a.code} ${a.annualQuota}`)
                  .join(" · ");
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <Td>
                      <span className="font-semibold text-gray-900">{p.name}</span>
                    </Td>
                    <Td className="text-gray-700">
                      {quotaSummary || (
                        <span className="text-gray-400 italic">No quotas</span>
                      )}
                    </Td>
                    <Td className="text-gray-700">
                      {woName(p.weeklyOffConfigId) ?? (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </Td>
                    <Td className="text-center">
                      {p.compOffEnabled ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                          On
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td className="text-center">
                      <StatusBadge status={p.status} />
                    </Td>
                    <Td className="text-right pr-6">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => clonePlan(p)}
                          title="Clone this policy"
                          className="text-gray-500 hover:text-gray-800"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          title="Configure"
                          className={employeeEditIconBtnClass}
                        >
                          <Pencil className={employeeIconPen} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {plans.length > 0 && (
          <div className="px-5 py-3 text-[12px] text-gray-500 border-t border-gray-100">
            {plans.length} polic{plans.length === 1 ? "y" : "ies"}
          </div>
        )}
      </section>

      <PlanEditor
        key={editing === null ? "closed" : editing === "new" ? "new" : `edit-${editing.id}`}
        target={editing}
        leaveTypes={leaveTypes}
        weeklyOffs={weeklyOffs}
        workflows={workflows}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    </div>
  );
}

// ─── editor (modal dialog) ────────────────────────────────────────────────────

function PlanEditor({
  target,
  leaveTypes,
  weeklyOffs,
  workflows,
  onClose,
  onSaved,
}: {
  target: Target;
  leaveTypes: LeaveType[];
  weeklyOffs: WeeklyOffSummary[];
  workflows: ApprovalWorkflow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<LeavePlanStatus>("Draft");
  const [weeklyOffConfigId, setWeeklyOffConfigId] = useState<number | null>(null);
  const [compOffEnabled, setCompOffEnabled] = useState(false);
  const [accrualMethod, setAccrualMethod] = useState<AccrualMethod>("Annual");
  const [carryForwardCap, setCarryForwardCap] = useState<number | null>(null);
  const [approvalWorkflowId, setApprovalWorkflowId] = useState<number | null>(null);
  const [quotas, setQuotas] = useState<Record<number, number>>({});
  const [scope, setScope] = useState<PlanScopeRow[]>(DEFAULT_SCOPE);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seededMsg, setSeededMsg] = useState<string | null>(null);

  useEffect(() => {
    if (target === "new") {
      setScope(DEFAULT_SCOPE);
    }
  }, [target]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (target === null || target === "new") return;
      setLoading(true);
      try {
        const full: LeavePlanDetail = await getLeavePlan(target.id);
        if (cancelled) return;
        setName(full.name);
        setDescription(full.description ?? "");
        setStatus(full.status);
        setWeeklyOffConfigId(full.weeklyOffConfigId);
        setCompOffEnabled(full.compOffEnabled);
        setAccrualMethod(full.accrualMethod);
        setCarryForwardCap(full.carryForwardCap);
        setApprovalWorkflowId(full.approvalWorkflowId);
        setQuotas(
          Object.fromEntries(
            full.allocations.map((a) => [a.leaveTypeId, a.annualQuota]),
          ),
        );
        setScope(full.scope);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (target === null) return null;

  const editing = target !== "new";
  // Precomputed here (where control-flow narrowing applies) so the async
  // callbacks below don't trip over `target`'s union type.
  const editId = target !== "new" ? target.id : null;

  const scopeValid = isCascadeScopeValid(hydrateCascadeFromRows(scope));

  async function save() {
    if (!scopeValid) {
      setError(
        "Applies to: select a location or choose Entire organization.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    setSeededMsg(null);
    try {
      const body = {
        name,
        description: description.trim() ? description.trim() : null,
        status,
        isDefault: false,
        weeklyOffConfigId,
        compOffEnabled,
        accrualMethod,
        carryForwardCap,
        proRataJoiners: false,
        approvalWorkflowId,
        allocations: leaveTypes.map((t) => ({
          leaveTypeId: t.id,
          annualQuota: quotas[t.id] ?? 0,
        })),
        scope,
      };
      const res =
        editId != null
          ? await updateLeavePlan(editId, body)
          : await createLeavePlan(body);
      if (status === "Active") {
        setSeededMsg(
          res.balancesSeeded > 0
            ? `Seeded ${res.balancesSeeded} employee leave-balance rows.`
            : "No new balances seeded (none matched, or already present).",
        );
        // Brief pause so the admin sees the seed result before the list refreshes.
        setTimeout(onSaved, 900);
      } else {
        onSaved();
      }
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function archive() {
    if (editId == null) return;
    if (!confirm("Archive this policy?")) return;
    setSaving(true);
    try {
      await archiveLeavePlan(editId);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h4 className="text-[16px] font-bold text-gray-900">
            {editing ? "Edit Policy" : "Create Policy"}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 -mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          )}
          <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Policy Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corporate Policy"
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeavePlanStatus)}
              className={employeeSelectClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description…"
            rows={2}
            className={`${employeeInputClass} resize-none`}
          />
        </Field>

        {/* Annual quota per leave type */}
        <Field label="Annual Quota (days per leave type)">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            {leaveTypes.length === 0 && (
              <p className="text-[12px] text-gray-400 px-1 py-2">
                No active leave types. Add some in “Leave Types” first.
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {leaveTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-1.5 bg-white border border-gray-100 rounded-lg px-3 py-2.5"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    {t.code}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={(quotas[t.id] ?? 0).toLocaleString("en-US")}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, "").trim();
                        const parsed = raw === "" ? 0 : Number(raw);
                        setQuotas((q) => ({
                          ...q,
                          [t.id]: Math.max(0, Number.isFinite(parsed) ? parsed : 0),
                        }));
                      }}
                      className={`${employeeInputClass} w-full text-right tabular-nums`}
                    />
                    <span className="text-[11px] text-gray-400 shrink-0">days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Field>

        {/* Weekly off + comp off */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weekly Off">
            <select
              value={weeklyOffConfigId ?? ""}
              onChange={(e) =>
                setWeeklyOffConfigId(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={employeeSelectClass}
            >
              <option value="">None</option>
              {weeklyOffs.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comp Off">
            <label className="inline-flex items-center gap-2 h-[38px] px-1 text-[13px] text-gray-700">
              <input
                type="checkbox"
                checked={compOffEnabled}
                onChange={(e) => setCompOffEnabled(e.target.checked)}
                className="h-4 w-4 accent-[lab(36.9089%_35.0961_-85.6872)]"
              />
              Enabled
            </label>
          </Field>
        </div>

        {/* Approval workflow */}
        <Field label="Approval Workflow">
          <select
            value={approvalWorkflowId ?? ""}
            onChange={(e) =>
              setApprovalWorkflowId(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
              className={employeeInputClass}
          >
            <option value="">Default (Manager only)</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.stages.length} stage{w.stages.length === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        </Field>

        {/* Accrual & carry-forward rules */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Accrual">
            <select
              value={accrualMethod}
              onChange={(e) => setAccrualMethod(e.target.value as AccrualMethod)}
              className={employeeSelectClass}
            >
              <option value="Annual">Annual (full up front)</option>
              <option value="Monthly">Monthly (accrue to date)</option>
            </select>
          </Field>
          <Field label="Carry-forward cap">
            <input
              type="number"
              min={0}
              value={carryForwardCap ?? ""}
              placeholder="No cap"
              onChange={(e) =>
                setCarryForwardCap(
                  e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0),
                )
              }
              className={employeeSelectClass}
            />
          </Field>
        </div>

        {/* Scope */}
        <div className="border-t border-gray-100 pt-3">
          <LeavePlanHierarchyScopeEditor scope={scope} onChange={setScope} />
        </div>

        {error && (
          <div className={employeeErrorBannerClass}>
            {error}
          </div>
        )}
        {seededMsg && (
          <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {seededMsg}
          </div>
        )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-2 justify-end shrink-0">
          {editing && (
            <button
              type="button"
              onClick={archive}
              disabled={saving || loading}
              className="mr-auto px-3 py-2.5 rounded-lg text-[13px] font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-50"
              title="Archive policy"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={employeeBtnOutlineSmClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !name.trim() || !scopeValid}
            className={employeeBtnClass}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {editing ? "Save Changes" : "Create Policy"}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to body so the page's tab-slide transform doesn't trap this fixed overlay.
  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}

// ─── tiny primitives ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeavePlanStatus }) {
  const map: Record<LeavePlanStatus, string> = {
    Draft: "bg-amber-50 text-amber-700 border-amber-200",
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Archived: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={[
        "inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border",
        map[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={employeeFilterLabelClass}>{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[employeeInputClass, props.className ?? ""].join(" ")}
    />
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={["text-[10.5px] font-bold tracking-widest uppercase px-4 py-3 text-left", className ?? ""].join(" ")}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={["px-4 py-3 align-middle", className ?? ""].join(" ")}>{children}</td>;
}
