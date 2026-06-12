"use client";

// Master Leave Types — table-driven catalog (mirrors the Holiday Policy table).
// "Create Leave Type" opens a modal dialog; rows have a Configure (edit) and a
// deactivate action. No accent colour — the catalog is purely functional.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createLeaveType,
  deactivateLeaveType,
  listLeaveTypes,
  updateLeaveType,
  type LeaveType,
  type LeaveTypeUpsert,
} from "./api/leave-types.client";

const BLANK_FORM: LeaveTypeUpsert = {
  name: "",
  code: "",
  description: null,
  isActive: true,
  isPaid: true,
  allowHalfDay: true,
  allowNegativeBalance: false,
  genderRestriction: null,
  minNoticeDays: 0,
  requiresProofAfterDays: null,
  maxContinuousDays: null,
  hourlyLeaveAllowed: false,
  carryForwardAllowed: false,
  encashmentAllowed: false,
  attachmentRequired: false,
  allowedInProbation: true,
};

export default function MasterLeaveTypesSection() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<LeaveType | "new" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listLeaveTypes());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDeactivate(item: LeaveType) {
    if (!confirm(`Deactivate "${item.name}"? It will be hidden from new requests.`)) {
      return;
    }
    try {
      await deactivateLeaveType(item.id);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header card */}
      <section className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
            Master Leave Catalog
          </h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
            Define corporate leave types and their default rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setDialog("new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
          >
            <Plus size={13} /> Create Leave Type
          </button>
        </div>
      </section>

      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th className="w-16">Code</Th>
                <Th>Name</Th>
                <Th>Attributes</Th>
                <Th className="text-center">Notice</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-[12.5px]">
                    No leave types. Click “Create Leave Type” to add one.
                  </td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <Td>
                    <span className="inline-flex items-center justify-center w-9 h-7 rounded-md bg-[#be185d] text-white font-bold text-[11px] tracking-wide">
                      {it.code.slice(0, 2).toUpperCase()}
                    </span>
                  </Td>
                  <Td>
                    <div className="font-semibold text-gray-900">{it.name}</div>
                    {it.description && (
                      <div className="text-[11.5px] text-gray-500 line-clamp-1 max-w-[280px]">
                        {it.description}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={it.isPaid ? "paid" : "unpaid"}>
                        {it.isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                      {it.genderRestriction && (
                        <Badge tone="gender">{it.genderRestriction}</Badge>
                      )}
                      {it.allowHalfDay && <Badge tone="info">Half-day</Badge>}
                      {it.carryForwardAllowed && <Badge tone="info">Carry-fwd</Badge>}
                      {it.encashmentAllowed && <Badge tone="info">Encash</Badge>}
                      {it.attachmentRequired && <Badge tone="warn">Proof req</Badge>}
                      {!it.allowedInProbation && <Badge tone="warn">No probation</Badge>}
                    </div>
                  </Td>
                  <Td className="text-center text-gray-600">
                    {it.minNoticeDays}d
                  </Td>
                  <Td className="text-center">
                    <Badge tone={it.isActive ? "active" : "muted"}>
                      {it.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-right pr-6">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDialog(it)}
                        title="Configure"
                        className="text-[#FF014F] hover:text-[#eb0249]"
                      >
                        <Pencil size={14} />
                      </button>
                      {it.isActive && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(it)}
                          title="Deactivate"
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length > 0 && (
          <div className="px-5 py-3 text-[12px] text-gray-500 border-t border-gray-100">
            {items.length} leave type{items.length === 1 ? "" : "s"}
          </div>
        )}
      </section>

      <LeaveTypeDialog
        key={dialog === null ? "closed" : dialog === "new" ? "new" : `edit-${dialog.id}`}
        target={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          refresh();
        }}
      />
    </div>
  );
}

// ─── create / edit dialog ────────────────────────────────────────────────────

function LeaveTypeDialog({
  target,
  onClose,
  onSaved,
}: {
  target: LeaveType | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = target !== null && target !== "new";
  const [form, setForm] = useState<LeaveTypeUpsert>(
    editing
      ? {
          name: target.name,
          code: target.code,
          description: target.description,
          isActive: target.isActive,
          isPaid: target.isPaid,
          allowHalfDay: target.allowHalfDay,
          allowNegativeBalance: target.allowNegativeBalance,
          genderRestriction: target.genderRestriction,
          minNoticeDays: target.minNoticeDays,
          requiresProofAfterDays: target.requiresProofAfterDays,
          maxContinuousDays: target.maxContinuousDays,
          hourlyLeaveAllowed: target.hourlyLeaveAllowed,
          carryForwardAllowed: target.carryForwardAllowed,
          encashmentAllowed: target.encashmentAllowed,
          attachmentRequired: target.attachmentRequired,
          allowedInProbation: target.allowedInProbation,
        }
      : BLANK_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (target === null) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateLeaveType(target.id, form);
      } else {
        await createLeaveType(form);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
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
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
            {editing ? "Edit Leave Type" : "Create Leave Type"}
          </h2>
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
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field label="Display Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Parental Sabbatical"
                autoFocus
              />
            </Field>
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="PS"
                maxLength={5}
                className="text-center font-bold tracking-wider"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value || null })}
              placeholder="Short description explaining eligibility and conditions…"
              rows={2}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <FlagToggle label="Active Status" sub="Deployable in policies" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <FlagToggle label="Paid Benefit" sub="Fully compensated" checked={form.isPaid} onChange={(v) => setForm({ ...form, isPaid: v })} />
            <FlagToggle label="Allow Half-Day" sub="0.5 day increments" checked={form.allowHalfDay} onChange={(v) => setForm({ ...form, allowHalfDay: v })} />
            <FlagToggle label="Negative Balance" sub="Borrow advance leaves" checked={form.allowNegativeBalance} onChange={(v) => setForm({ ...form, allowNegativeBalance: v })} />
            <FlagToggle label="Hourly Leave" sub="Apply in hour increments" checked={form.hourlyLeaveAllowed} onChange={(v) => setForm({ ...form, hourlyLeaveAllowed: v })} />
            <FlagToggle label="Carry Forward" sub="Roll over unused balance" checked={form.carryForwardAllowed} onChange={(v) => setForm({ ...form, carryForwardAllowed: v })} />
            <FlagToggle label="Encashment" sub="Convert balance to salary" checked={form.encashmentAllowed} onChange={(v) => setForm({ ...form, encashmentAllowed: v })} />
            <FlagToggle label="Attachment Required" sub="Mandate proof on apply" checked={form.attachmentRequired} onChange={(v) => setForm({ ...form, attachmentRequired: v })} />
            <FlagToggle label="Allowed in Probation" sub="Available before confirmation" checked={form.allowedInProbation} onChange={(v) => setForm({ ...form, allowedInProbation: v })} />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase mb-3">
              Regulations &amp; Rules
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gender Restriction">
                <select
                  value={form.genderRestriction ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      genderRestriction: (e.target.value as "Male" | "Female" | "") || null,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
                >
                  <option value="">None (All Employees)</option>
                  <option value="Male">Male only</option>
                  <option value="Female">Female only</option>
                </select>
              </Field>
              <Field label="Min Notice (Days)">
                <Input
                  type="number"
                  value={form.minNoticeDays}
                  min={0}
                  onChange={(e) => setForm({ ...form, minNoticeDays: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Proof Needed If > (Days)">
                <Input
                  type="number"
                  value={form.requiresProofAfterDays ?? ""}
                  min={0}
                  placeholder="Never"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiresProofAfterDays: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Max Continuous Days">
                <Input
                  type="number"
                  value={form.maxContinuousDays ?? ""}
                  min={1}
                  placeholder="Unlimited"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxContinuousDays: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !form.name.trim() || !form.code.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editing ? "Save Changes" : "Create Leave Type"}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to body so the page's tab-slide transform doesn't trap this
  // position:fixed overlay (a transformed ancestor becomes its containing block).
  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}

// ─── tiny primitives ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative shrink-0 rounded-full transition-colors duration-200 w-9 h-5",
        checked ? "bg-[#FF014F]" : "bg-gray-300",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span
        className="absolute top-0.5 bg-white rounded-full shadow-sm transition-[left] duration-200 w-4 h-4"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}

function FlagToggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
      <Toggle checked={checked} onChange={onChange} />
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{label}</p>
        <p className="text-[10.5px] text-gray-500 leading-tight">{sub}</p>
      </div>
    </div>
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
      <label className="text-[12px] font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] transition-shadow",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "active" | "muted" | "paid" | "unpaid" | "warn" | "info" | "gender";
  children: React.ReactNode;
}) {
  const map: Record<typeof tone, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    muted: "bg-gray-100 text-gray-500 border-gray-200",
    paid: "bg-gray-100 text-gray-700 border-gray-200",
    unpaid: "bg-rose-50 text-rose-700 border-rose-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    gender: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  };
  return (
    <span
      className={[
        "inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border",
        map[tone],
      ].join(" ")}
    >
      {children}
    </span>
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
