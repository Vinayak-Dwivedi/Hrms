"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RotateCcw, Pencil, Save, X, Loader2 } from "lucide-react";
import {
  createLeaveType,
  listLeaveTypes,
  updateLeaveType,
  type LeaveType,
  type LeaveTypeUpsert,
} from "./api/leave-types.client";

// ─── colour palette ────────────────────────────────────────────────────────

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#10b981",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#475569",
];

// ─── tiny primitives (kept in-file so the section is self-contained) ──────

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

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={["flex flex-col gap-1.5", className].join(" ")}>
      <label className="text-[12px] font-semibold text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
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
  tone: "active" | "paid" | "unpaid" | "warn" | "info" | "gender";
  children: React.ReactNode;
}) {
  const map: Record<typeof tone, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-gray-100 text-gray-700 border-gray-200",
    unpaid: "bg-rose-50 text-rose-700 border-rose-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    gender: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  };
  return (
    <span
      className={[
        "inline-block text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border",
        map[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

// ─── catalog row ───────────────────────────────────────────────────────────

function CatalogRow({
  item,
  selected,
  onConfigure,
}: {
  item: LeaveType;
  selected: boolean;
  onConfigure: () => void;
}) {
  const initials = item.code.slice(0, 2).toUpperCase();
  return (
    <div
      className={[
        "flex items-start gap-4 p-4 rounded-xl border transition-all",
        selected
          ? "border-[#FF014F] bg-[#fff1f2]/30 shadow-sm"
          : "border-gray-100 bg-white hover:border-gray-200",
      ].join(" ")}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-[14px] tracking-wide"
        style={{ background: item.color }}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-[14px] font-bold text-gray-900">{item.name}</h4>
          {item.isActive && <Badge tone="active">Active</Badge>}
          {item.genderRestriction && (
            <Badge tone="gender">{item.genderRestriction}</Badge>
          )}
        </div>
        {item.description && (
          <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge tone={item.isPaid ? "paid" : "unpaid"}>
            {item.isPaid ? "Paid" : "Unpaid"}
          </Badge>
          <Badge tone="paid">Notice: {item.minNoticeDays} days</Badge>
          {item.requiresProofAfterDays !== null && (
            <Badge tone="warn">Proof needed &gt;{item.requiresProofAfterDays} days</Badge>
          )}
          {item.allowNegativeBalance && <Badge tone="warn">Negative allowed</Badge>}
          {item.maxContinuousDays !== null && (
            <Badge tone="info">Max stretch: {item.maxContinuousDays} days</Badge>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onConfigure}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-700 bg-white border border-gray-200 hover:border-[#fda4af] hover:text-[#be185d] hover:bg-[#fff1f2] transition-colors"
      >
        <Pencil size={12} /> Configure
      </button>
    </div>
  );
}

// ─── create/edit panel ─────────────────────────────────────────────────────

const BLANK_FORM: LeaveTypeUpsert = {
  name: "",
  code: "",
  color: PALETTE[0]!,
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

function EditPanel({
  initial,
  onClose,
  onSaved,
}: {
  initial: LeaveType | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = initial && initial !== "new";
  const [form, setForm] = useState<LeaveTypeUpsert>(
    editing
      ? {
          name: initial.name,
          code: initial.code,
          color: initial.color,
          description: initial.description,
          isActive: initial.isActive,
          isPaid: initial.isPaid,
          allowHalfDay: initial.allowHalfDay,
          allowNegativeBalance: initial.allowNegativeBalance,
          genderRestriction: initial.genderRestriction,
          minNoticeDays: initial.minNoticeDays,
          requiresProofAfterDays: initial.requiresProofAfterDays,
          maxContinuousDays: initial.maxContinuousDays,
          hourlyLeaveAllowed: initial.hourlyLeaveAllowed,
          carryForwardAllowed: initial.carryForwardAllowed,
          encashmentAllowed: initial.encashmentAllowed,
          attachmentRequired: initial.attachmentRequired,
          allowedInProbation: initial.allowedInProbation,
        }
      : BLANK_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!initial) {
    return (
      <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <Pencil size={18} className="text-gray-400" />
        </div>
        <h4 className="text-[14px] font-bold text-gray-700">
          Catalog Maintenance
        </h4>
        <p className="text-[12px] text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
          No leave type has been selected for editing. Pick an active catalog
          item to modify defaults or tap "Create Leave Type" above.
        </p>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateLeaveType(initial.id, form);
      } else {
        await createLeaveType(form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border-2 border-[#FF014F] rounded-2xl p-5 shadow-[0_8px_24px_-8px_rgba(255,1,79,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF014F]" />
          {editing ? "Edit Leave Type" : "Create Leave Type"}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Field label="Display Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Parental Sabbatical"
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

        <Field label="Catalog Accent Color">
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((c) => {
              const active = form.color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={[
                    "w-7 h-7 rounded-md transition-all flex items-center justify-center",
                    active
                      ? "ring-2 ring-offset-2 ring-[#FF014F] scale-110"
                      : "hover:scale-105",
                  ].join(" ")}
                  style={{ background: c }}
                  aria-label={`Pick ${c}`}
                >
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6.5l2.5 2.5L10 3.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Catalog Description">
          <textarea
            value={form.description ?? ""}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value || null })
            }
            placeholder="Enter short description explaining eligibility and conditions…"
            rows={2}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <FlagToggle
            label="Active Status"
            sub="Deployable in policies"
            checked={form.isActive}
            onChange={(v) => setForm({ ...form, isActive: v })}
          />
          <FlagToggle
            label="Paid Benefit"
            sub="Fully compensated"
            checked={form.isPaid}
            onChange={(v) => setForm({ ...form, isPaid: v })}
          />
          <FlagToggle
            label="Allow Half-Day"
            sub="0.5 day debit increments"
            checked={form.allowHalfDay}
            onChange={(v) => setForm({ ...form, allowHalfDay: v })}
          />
          <FlagToggle
            label="Negative Balance"
            sub="Borrow advance leaves"
            checked={form.allowNegativeBalance}
            onChange={(v) => setForm({ ...form, allowNegativeBalance: v })}
          />
          <FlagToggle
            label="Hourly Leave"
            sub="Apply in hour increments"
            checked={form.hourlyLeaveAllowed}
            onChange={(v) => setForm({ ...form, hourlyLeaveAllowed: v })}
          />
          <FlagToggle
            label="Carry Forward"
            sub="Roll over unused balance"
            checked={form.carryForwardAllowed}
            onChange={(v) => setForm({ ...form, carryForwardAllowed: v })}
          />
          <FlagToggle
            label="Encashment"
            sub="Convert balance to salary"
            checked={form.encashmentAllowed}
            onChange={(v) => setForm({ ...form, encashmentAllowed: v })}
          />
          <FlagToggle
            label="Attachment Required"
            sub="Mandate proof on apply"
            checked={form.attachmentRequired}
            onChange={(v) => setForm({ ...form, attachmentRequired: v })}
          />
          <FlagToggle
            label="Allowed in Probation"
            sub="Available before confirmation"
            checked={form.allowedInProbation}
            onChange={(v) => setForm({ ...form, allowedInProbation: v })}
          />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase mb-3">
            Regulations & Rules (catalog defaults)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender Restriction">
              <select
                value={form.genderRestriction ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    genderRestriction:
                      (e.target.value as "Male" | "Female" | "") || null,
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
                onChange={(e) =>
                  setForm({ ...form, minNoticeDays: Number(e.target.value) || 0 })
                }
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
            <Field label="Max Sabbatical Days">
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

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={saving || !form.name.trim() || !form.code.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
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
        <p className="text-[12px] font-semibold text-gray-800 leading-tight">
          {label}
        </p>
        <p className="text-[10.5px] text-gray-500 leading-tight">{sub}</p>
      </div>
    </div>
  );
}

// ─── main section ──────────────────────────────────────────────────────────

export default function MasterLeaveTypesSection() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeaveType | "new" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLeaveTypes();
      setItems(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
      {/* Left — catalog list */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
              Master Leave Catalog
            </h3>
            <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
              Configure default corporate dimensions & thresholds for HR leave
              types.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
            >
              <Plus size={12} /> Create Leave Type
            </button>
          </div>
        </header>

        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">
              Leave Type Catalog Items
            </p>
            <p className="text-[11px] text-gray-400">
              {items.length} Available Type{items.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading && items.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-[12px]">Loading catalog…</span>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {items.map((it) => (
              <CatalogRow
                key={it.id}
                item={it}
                selected={editing !== null && editing !== "new" && editing.id === it.id}
                onConfigure={() => setEditing(it)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Right — edit / create panel (sticky on large screens).
          The `key` forces a fresh mount whenever the user picks a different
          catalog row — without it, EditPanel's `useState(initial ? {...})`
          initializer only runs once and never re-syncs to the new row. */}
      <aside className="lg:sticky lg:top-4">
        <EditPanel
          key={
            editing === null
              ? "blank"
              : editing === "new"
                ? "new"
                : `edit-${editing.id}`
          }
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      </aside>
    </div>
  );
}
