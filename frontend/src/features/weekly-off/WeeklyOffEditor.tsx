"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import {
  createWeeklyOff,
  defaultSettingsForMode,
  deleteWeeklyOff,
  getWeeklyOff,
  updateWeeklyOff,
  type AlternateDayRule,
  type DayName,
  type FixedSettings,
  type RosterSettings,
  type RotationalSettings,
  type WeeklyOffMode,
  type WeeklyOffSettings,
  type WeeklyOffStatus,
  type WeeklyOffSummary,
  type WeeklyOffUpsert,
} from "./api/weekly-off.client";
import ScopeRowsEditor, {
  type ScopeRowValue,
} from "@/components/scope/ScopeRowsEditor";
import type { ScopeType } from "@/components/scope/scope-lookups";

type Target = WeeklyOffSummary | "new" | null;

const STATUSES: WeeklyOffStatus[] = ["Draft", "Published", "Archived"];
const MODES: WeeklyOffMode[] = ["Fixed", "Rotational", "Roster"];

const SCOPE_TYPES: ScopeType[] = [
  "Company",
  "Branch",
  "Location",
  "Department",
  "Designation",
  "Grade",
  "EmploymentType",
  "Employee",
];

const BLANK_FORM: WeeklyOffUpsert = {
  name: "",
  description: null,
  status: "Draft",
  mode: "Fixed",
  settings: { days: ["Sunday"] },
  scope: [],
};

export default function WeeklyOffEditor({
  target,
  onClose,
  onSaved,
}: {
  target: Target;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<WeeklyOffUpsert>(BLANK_FORM);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (target === null) {
        setForm(BLANK_FORM);
        setLoadedId(null);
        return;
      }
      if (target === "new") {
        setForm(BLANK_FORM);
        setLoadedId(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const full = await getWeeklyOff(target.id);
        if (cancelled) return;
        setForm({
          name: full.name,
          description: full.description,
          status: full.status,
          mode: full.mode,
          settings: full.settings,
          scope: full.scope.map((s) => ({ ...s })),
        });
        setLoadedId(full.id);
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

  if (target === null) {
    return (
      <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <Pencil size={18} className="text-gray-400" />
        </div>
        <h4 className="text-[14px] font-bold text-gray-700">
          Configuration Editor
        </h4>
        <p className="text-[12px] text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Pick a configuration on the left to edit, or click "New Configuration"
          to create one.
        </p>
      </div>
    );
  }

  const editing = target !== "new";

  function changeMode(mode: WeeklyOffMode) {
    setForm((f) => ({
      ...f,
      mode,
      // Reset settings to the shape this mode expects.
      settings: defaultSettingsForMode(mode),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (editing && loadedId != null) {
        await updateWeeklyOff(loadedId, form);
      } else {
        await createWeeklyOff(form);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!editing || loadedId == null) return;
    if (
      !confirm(
        "Delete this configuration? Scope assignments will also be removed.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteWeeklyOff(loadedId);
      onSaved();
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
          {editing ? "Edit Configuration" : "Create Configuration"}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-3">
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Corporate (Sunday Off)"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as WeeklyOffStatus,
                })
              }
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
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
            value={form.description ?? ""}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value || null })
            }
            placeholder="Short description…"
            rows={2}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none"
          />
        </Field>

        {/* ── Mode ──────────────────────────────────────────────────── */}
        <Field label="Mode">
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const active = form.mode === m;
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => changeMode(m)}
                  className={[
                    "px-3 py-2 rounded-lg border text-[12.5px] font-semibold transition-all",
                    active
                      ? "border-[#FF014F] bg-pink-50 text-[#FF014F]"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#FF014F]/40",
                  ].join(" ")}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </Field>

        {/* ── Mode-specific settings ────────────────────────────────── */}
        {form.mode === "Fixed" && (
          <FixedSettingsEditor
            settings={form.settings as FixedSettings}
            onChange={(s) => setForm((f) => ({ ...f, settings: s }))}
          />
        )}
        {form.mode === "Rotational" && (
          <RotationalSettingsEditor
            settings={form.settings as RotationalSettings}
            onChange={(s) => setForm((f) => ({ ...f, settings: s }))}
          />
        )}
        {form.mode === "Roster" && (
          <RosterSettingsEditor
            settings={form.settings as RosterSettings}
            onChange={(s) => setForm((f) => ({ ...f, settings: s }))}
          />
        )}

        {/* ── Live preview (next 4 weeks) ───────────────────────────── */}
        <WeeklyOffPreview mode={form.mode} settings={form.settings} />

        {/* ── Scope assignment ──────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-3">
          <ScopeRowsEditor
            rows={form.scope as ScopeRowValue[]}
            availableTypes={SCOPE_TYPES}
            onChange={(rows) =>
              setForm((f) => ({
                ...f,
                scope: rows.map((r) => ({
                  scopeType: r.scopeType as
                    | "Company"
                    | "Branch"
                    | "Location"
                    | "Department"
                    | "Designation"
                    | "Grade"
                    | "EmploymentType"
                    | "Employee",
                  scopeId: r.scopeId,
                  priority: r.priority,
                })),
              }))
            }
            title={`Applies to (${form.scope.length})`}
            emptyHint="No scope rows — this configuration will not apply to anyone."
          />
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
            disabled={saving || loading || !form.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {editing ? "Save Changes" : "Create Configuration"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={destroy}
              disabled={saving || loading}
              className="px-3 py-2.5 rounded-lg text-[13px] font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-50"
              title="Delete configuration"
            >
              <Trash2 size={14} />
            </button>
          )}
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

// ─── mode-specific editors ─────────────────────────────────────────────────

// Saturday is governed by its own cadence control (below), so the weekly grid
// only offers the other six days.
const WEEKLY_GRID_DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Sunday",
];

type SatCadence = "every" | "1_3" | "2_4" | "none";

const SAT_OPTIONS: { value: SatCadence; label: string }[] = [
  { value: "every", label: "Every" },
  { value: "1_3", label: "1st & 3rd" },
  { value: "2_4", label: "2nd & 4th" },
  { value: "none", label: "Working" },
];

function satCadenceOf(settings: FixedSettings): SatCadence {
  if (settings.days.includes("Saturday")) return "every";
  const rule = settings.alternateDays?.find((r) => r.day === "Saturday");
  if (rule) {
    const w = [...rule.weeks].sort((a, b) => a - b).join(",");
    if (w === "1,3") return "1_3";
    if (w === "2,4") return "2_4";
  }
  return "none";
}

function applySatCadence(
  settings: FixedSettings,
  cadence: SatCadence,
): FixedSettings {
  const daysNoSat = settings.days.filter((d) => d !== "Saturday");
  const altNoSat = (settings.alternateDays ?? []).filter(
    (r) => r.day !== "Saturday",
  );
  let days: DayName[] = daysNoSat;
  let alt: AlternateDayRule[] = altNoSat;
  if (cadence === "every") {
    days = [...daysNoSat, "Saturday"];
  } else if (cadence === "1_3") {
    alt = [...altNoSat, { day: "Saturday", weeks: [1, 3] }];
  } else if (cadence === "2_4") {
    alt = [...altNoSat, { day: "Saturday", weeks: [2, 4] }];
  }
  return { days, ...(alt.length > 0 ? { alternateDays: alt } : {}) };
}

function FixedSettingsEditor({
  settings,
  onChange,
}: {
  settings: FixedSettings;
  onChange: (s: FixedSettings) => void;
}) {
  function toggle(day: DayName) {
    const has = settings.days.includes(day);
    onChange({
      ...settings,
      days: has
        ? settings.days.filter((d) => d !== day)
        : [...settings.days, day],
    });
  }
  const cadence = satCadenceOf(settings);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Off Days (every week)">
        <div className="grid grid-cols-6 gap-1.5">
          {WEEKLY_GRID_DAYS.map((d) => {
            const active = settings.days.includes(d);
            return (
              <button
                type="button"
                key={d}
                onClick={() => toggle(d)}
                className={[
                  "px-2 py-2 rounded-lg border text-[11.5px] font-semibold transition-all",
                  active
                    ? "border-[#FF014F] bg-pink-50 text-[#FF014F]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#FF014F]/40",
                ].join(" ")}
              >
                {d.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Saturdays">
        <div className="grid grid-cols-4 gap-1.5">
          {SAT_OPTIONS.map((opt) => {
            const active = cadence === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => onChange(applySatCadence(settings, opt.value))}
                className={[
                  "px-2 py-2 rounded-lg border text-[11.5px] font-semibold transition-all",
                  active
                    ? "border-[#FF014F] bg-pink-50 text-[#FF014F]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#FF014F]/40",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function RotationalSettingsEditor({
  settings,
  onChange,
}: {
  settings: RotationalSettings;
  onChange: (s: RotationalSettings) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Offs Per Week">
        <Input
          type="number"
          min={1}
          max={7}
          value={settings.offsPerWeek}
          onChange={(e) =>
            onChange({
              ...settings,
              offsPerWeek: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </Field>
      <Field label="Cycle Length (Weeks)">
        <Input
          type="number"
          min={1}
          max={12}
          value={settings.cycleWeeks}
          onChange={(e) =>
            onChange({
              ...settings,
              cycleWeeks: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </Field>
    </div>
  );
}

function RosterSettingsEditor({
  settings,
  onChange,
}: {
  settings: RosterSettings;
  onChange: (s: RosterSettings) => void;
}) {
  return (
    <Field
      label="Roster Notes"
    >
      <textarea
        value={settings.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Describe the roster pattern (e.g. WX-A: Sun,Wed off; WX-B: Sat,Thu off…)"
        rows={3}
        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none"
      />
    </Field>
  );
}

// ─── live preview (next 4 weeks) ────────────────────────────────────────────

const DOW_INDEX: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const WEEK_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (x.getDay() + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}

function isOffDay(
  date: Date,
  start: Date,
  mode: WeeklyOffMode,
  settings: WeeklyOffSettings,
): boolean {
  const wd = date.getDay();
  if (mode === "Fixed") {
    const s = settings as FixedSettings;
    if (s.days.some((d) => DOW_INDEX[d] === wd)) return true;
    const nth = Math.floor((date.getDate() - 1) / 7) + 1;
    return (s.alternateDays ?? []).some(
      (r) => DOW_INDEX[r.day] === wd && r.weeks.includes(nth),
    );
  }
  if (mode === "Rotational") {
    const s = settings as RotationalSettings;
    if (s.pattern && s.pattern.length > 0) {
      const weeksFromStart = Math.floor(
        (date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      const week = s.pattern[weeksFromStart % s.pattern.length] ?? [];
      return week.some((d) => DOW_INDEX[d] === wd);
    }
    return wd === 0; // no explicit pattern → approximated as Sunday (matches resolver)
  }
  return false; // Roster — no automated expansion yet
}

function WeeklyOffPreview({
  mode,
  settings,
}: {
  mode: WeeklyOffMode;
  settings: WeeklyOffSettings;
}) {
  const start = startOfWeekMonday(new Date());
  const weeks = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, day) => {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + day);
      return cell;
    }),
  );
  const note =
    mode === "Roster"
      ? "Roster mode has no automatic off-days — handled per published roster."
      : mode === "Rotational" &&
          !(settings as RotationalSettings).pattern?.length
        ? "No rotation pattern set — approximated as Sundays."
        : null;

  return (
    <Field label="Preview — next 4 weeks">
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEK_HEADER.map((h) => (
            <div
              key={h}
              className="text-center text-[9.5px] font-bold uppercase tracking-wide text-gray-400"
            >
              {h}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell) => {
                const off = isOffDay(cell, start, mode, settings);
                return (
                  <div
                    key={cell.toISOString()}
                    title={cell.toDateString()}
                    className={[
                      "h-7 rounded-md flex items-center justify-center text-[11px] font-semibold border",
                      off
                        ? "bg-[#FF014F] text-white border-[#FF014F]"
                        : "bg-white text-gray-500 border-gray-200",
                    ].join(" ")}
                  >
                    {cell.getDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10.5px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF014F] inline-block" />
            Off day
          </span>
          {note && <span className="italic text-amber-600">{note}</span>}
        </div>
      </div>
    </Field>
  );
}

// ─── tiny primitives ───────────────────────────────────────────────────────

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
