"use client";

// Create / edit a Weekly-Off configuration in a dialog. Leads with ready-made
// off-day plans (Sunday only, Sat & Sun, Alternate Sat + Sun) and a "Custom"
// option that unlocks full control: Fixed (per-day + Saturday cadence),
// Rotational (a repeating multi-week off-day pattern) or Roster. Scope is the
// same Location / Department / Sub-department picker as the Holiday Policy.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Save, X } from "lucide-react";
import {
  createWeeklyOff,
  deleteWeeklyOff,
  getWeeklyOff,
  listWeeklyOff,
  updateWeeklyOff,
  type AlternateDayRule,
  type DayName,
  type FixedSettings,
  type RotationalSettings,
  type WeeklyOffMode,
  type WeeklyOffSettings,
  type WeeklyOffStatus,
  type WeeklyOffSummary,
  type WeeklyOffUpsert,
} from "./api/weekly-off.client";

type Target = WeeklyOffSummary | "new";
type Preset = "sun" | "satsun" | "altsatsun" | "custom";

const GRID_DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DOW_INDEX: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
const ROTATION_EPOCH = Date.UTC(2024, 0, 1); // must match the backend resolver

const PRESETS: { key: Preset; label: string; hint: string }[] = [
  { key: "sun", label: "Sunday only", hint: "Every Sunday off" },
  { key: "satsun", label: "Saturday & Sunday", hint: "Both weekend days off" },
  { key: "altsatsun", label: "Alternate Sat + Sun", hint: "Sun + 2nd & 4th Sat" },
  { key: "custom", label: "Custom", hint: "Full control" },
];

// Default config name per preset — used as the saved name when creating a
// non-custom plan (Custom uses the admin-typed name instead).
const PRESET_DEFAULT_NAME: Record<Exclude<Preset, "custom">, string> = {
  sun: "Sunday Off",
  satsun: "Saturday & Sunday Off",
  altsatsun: "Alternate Sat + Sun",
};

// Config names are unique and presets save under a fixed default name, so a
// preset can only exist once. Returns true if a config with this name already
// exists (case-insensitive) — used to block duplicate preset entries.
async function configNameExists(name: string): Promise<boolean> {
  try {
    const list = await listWeeklyOff();
    const wanted = name.trim().toLowerCase();
    return list.some((c) => c.name.trim().toLowerCase() === wanted);
  } catch {
    return false; // best effort — the backend unique constraint is the backstop
  }
}

function presetSettings(p: Exclude<Preset, "custom">): { mode: WeeklyOffMode; settings: WeeklyOffSettings } {
  if (p === "sun") return { mode: "Fixed", settings: { days: ["Sunday"] } };
  if (p === "satsun") return { mode: "Fixed", settings: { days: ["Saturday", "Sunday"] } };
  return {
    mode: "Fixed",
    settings: { days: ["Sunday"], alternateDays: [{ day: "Saturday", weeks: [2, 4] }] },
  };
}

function detectPreset(mode: WeeklyOffMode, settings: WeeklyOffSettings): Preset {
  if (mode !== "Fixed") return "custom";
  const s = settings as FixedSettings;
  const days = [...(s.days ?? [])].sort().join(",");
  const alt = s.alternateDays ?? [];
  const satAlt = alt.find((r) => r.day === "Saturday");
  const altKey = satAlt ? [...satAlt.weeks].sort((a, b) => a - b).join(",") : "";
  if (days === "Sunday" && alt.length === 0) return "sun";
  if (days === "Saturday,Sunday" && alt.length === 0) return "satsun";
  if (days === "Sunday" && alt.length === 1 && altKey === "2,4") return "altsatsun";
  return "custom";
}

export default function WeeklyOffDialog({
  target,
  onClose,
  onSaved,
}: {
  target: Target;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = target !== "new";
  const [loadedId, setLoadedId] = useState<number | null>(null);

  // `name` is auto-derived from the preset on create; for Custom it's the
  // admin-typed name. On edit we preserve the existing name.
  const [name, setName] = useState("");
  // New configs default to Published; publish/unpublish is managed from the
  // list's action button, so there's no status control inside the dialog. On
  // edit we preserve whatever status the config already had.
  const [status, setStatus] = useState<WeeklyOffStatus>("Published");
  const [preset, setPreset] = useState<Preset>("sun");
  const [mode, setMode] = useState<WeeklyOffMode>("Fixed");
  const [settings, setSettings] = useState<WeeklyOffSettings>({ days: ["Sunday"] });

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target === "new") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const full = await getWeeklyOff(target.id);
        if (cancelled) return;
        setLoadedId(full.id);
        setName(full.name);
        setStatus(full.status);
        const detected = detectPreset(full.mode, full.settings);
        setPreset(detected);
        if (detected === "custom" && full.mode !== "Fixed") {
          // Rotational/Roster modes were removed — fall back to a Fixed pattern.
          setMode("Fixed");
          setSettings({ days: ["Sunday"] });
        } else {
          setMode(full.mode);
          setSettings(full.settings);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  function choosePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const { mode: m, settings: s } = presetSettings(p);
      setMode(m);
      setSettings(s);
    } else {
      // Custom is Fixed-only now (Rotational/Roster were removed). Keep the
      // current days if already a Fixed pattern, else start from Sunday.
      setMode("Fixed");
      setSettings((prev) =>
        prev && "days" in (prev as FixedSettings) ? prev : { days: ["Sunday"] },
      );
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Resolve the name: Custom uses the typed name; a preset uses its fixed
      // default name (kept as-is on edit). A preset can only exist once, so
      // block re-creating one that already exists instead of duplicating it.
      let finalName: string;
      if (preset === "custom") {
        finalName = name.trim();
        if (!finalName) {
          setError("Please name this custom plan.");
          setSaving(false);
          return;
        }
      } else if (editing) {
        finalName = name.trim() || PRESET_DEFAULT_NAME[preset];
      } else {
        finalName = PRESET_DEFAULT_NAME[preset];
        if (await configNameExists(finalName)) {
          setError(
            `A "${finalName}" configuration already exists. Edit or delete it instead.`,
          );
          setSaving(false);
          return;
        }
      }

      const body: WeeklyOffUpsert = {
        name: finalName,
        description: null,
        status,
        mode,
        settings,
        // No scope picker — weekly-off configs now apply to the entire org.
        scope: [{ scopeType: "Company", scopeId: null, priority: 100 }],
      };
      if (editing && loadedId != null) await updateWeeklyOff(loadedId, body);
      else await createWeeklyOff(body);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!editing || loadedId == null) return;
    if (!confirm("Delete this configuration? Scope assignments will also be removed.")) return;
    setSaving(true);
    try {
      await deleteWeeklyOff(loadedId);
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
        className="bg-white rounded-2xl w-full max-w-[680px] max-h-[92vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
            {editing ? "Edit Weekly-Off Configuration" : "New Weekly-Off Configuration"}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 -mt-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <>
              {/* ── Off-day plan (dropdown) ──────────────────────────── */}
              <Field label="Off-day plan">
                <select
                  value={preset}
                  onChange={(e) => choosePreset(e.target.value as Preset)}
                  className={inputCls}
                  autoFocus
                >
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label} — {p.hint}
                    </option>
                  ))}
                </select>
              </Field>

              {/* ── Custom controls (name + pattern) ─────────────────── */}
              {preset === "custom" && (
                <div className="rounded-xl border border-gray-200 p-3 flex flex-col gap-3 bg-gray-50/40">
                  <Field label="Name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Night Shift"
                      className={inputCls}
                    />
                  </Field>
                  <FixedEditor settings={settings as FixedSettings} onChange={setSettings} />
                </div>
              )}

              <Preview mode={mode} settings={settings} />

              {error && (
                <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-2 justify-end">
          {editing && (
            <button
              type="button"
              onClick={destroy}
              disabled={saving}
              className="mr-auto px-3 py-2 rounded-lg text-[13px] font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
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
            disabled={saving || loading || (preset === "custom" && !name.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editing ? "Save Changes" : "Create"}
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

// ─── custom editors ─────────────────────────────────────────────────────────

type SatCadence = "every" | "1_3" | "2_4" | "none";
const SAT_OPTIONS: { value: SatCadence; label: string }[] = [
  { value: "every", label: "Every" },
  { value: "1_3", label: "1st & 3rd" },
  { value: "2_4", label: "2nd & 4th" },
  { value: "none", label: "Working" },
];

function satCadenceOf(s: FixedSettings): SatCadence {
  if (s.days.includes("Saturday")) return "every";
  const rule = s.alternateDays?.find((r) => r.day === "Saturday");
  if (rule) {
    const w = [...rule.weeks].sort((a, b) => a - b).join(",");
    if (w === "1,3") return "1_3";
    if (w === "2,4") return "2_4";
  }
  return "none";
}
function applySat(s: FixedSettings, c: SatCadence): FixedSettings {
  const days: DayName[] = s.days.filter((d) => d !== "Saturday");
  const alt: AlternateDayRule[] = (s.alternateDays ?? []).filter((r) => r.day !== "Saturday");
  if (c === "every") days.push("Saturday");
  else if (c === "1_3") alt.push({ day: "Saturday", weeks: [1, 3] });
  else if (c === "2_4") alt.push({ day: "Saturday", weeks: [2, 4] });
  return { days, ...(alt.length > 0 ? { alternateDays: alt } : {}) };
}

function FixedEditor({
  settings,
  onChange,
}: {
  settings: FixedSettings;
  onChange: (s: FixedSettings) => void;
}) {
  const cadence = satCadenceOf(settings);
  function toggle(day: DayName) {
    const has = settings.days.includes(day);
    onChange({ ...settings, days: has ? settings.days.filter((d) => d !== day) : [...settings.days, day] });
  }
  return (
    <div className="flex flex-col gap-3">
      <Field label="Off days (every week)">
        <div className="grid grid-cols-6 gap-1.5">
          {GRID_DAYS.filter((d) => d !== "Saturday").map((d) => {
            const active = settings.days.includes(d);
            return (
              <DayBtn key={d} active={active} onClick={() => toggle(d)}>
                {d.slice(0, 3)}
              </DayBtn>
            );
          })}
        </div>
      </Field>
      <Field label="Saturdays">
        <div className="grid grid-cols-4 gap-1.5">
          {SAT_OPTIONS.map((o) => (
            <DayBtn key={o.value} active={cadence === o.value} onClick={() => onChange(applySat(settings, o.value))}>
              {o.label}
            </DayBtn>
          ))}
        </div>
      </Field>
    </div>
  );
}

function DayBtn({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        small ? "px-1 py-1.5 text-[10.5px]" : "px-2 py-2 text-[11.5px]",
        "rounded-lg border font-semibold transition-all",
        active
          ? "border-[lab(36.9089%_35.0961_-85.6872)] bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)]"
          : "border-gray-200 bg-white text-gray-600 hover:border-[lab(36.9089%_35.0961_-85.6872)]/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─── live preview (next 4 weeks) ────────────────────────────────────────────

function isOff(date: Date, mode: WeeklyOffMode, settings: WeeklyOffSettings): boolean {
  const wd = date.getDay();
  if (mode === "Fixed") {
    const s = settings as FixedSettings;
    if ((s.days ?? []).some((d) => DOW_INDEX[d] === wd)) return true;
    const nth = Math.floor((date.getDate() - 1) / 7) + 1;
    return (s.alternateDays ?? []).some((r) => DOW_INDEX[r.day] === wd && r.weeks.includes(nth));
  }
  if (mode === "Rotational") {
    const s = settings as RotationalSettings;
    if (s.pattern && s.pattern.length > 0) {
      const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const weeks = Math.floor((utc - ROTATION_EPOCH) / (7 * 24 * 60 * 60 * 1000));
      const wk = ((weeks % s.pattern.length) + s.pattern.length) % s.pattern.length;
      return (s.pattern[wk] ?? []).some((d) => DOW_INDEX[d] === wd);
    }
    return wd === 0;
  }
  return false;
}

function Preview({ mode, settings }: { mode: WeeklyOffMode; settings: WeeklyOffSettings }) {
  const start = useMemo(() => {
    const x = new Date();
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    x.setHours(0, 0, 0, 0);
    return x;
  }, []);
  const weeks = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, day) => {
      const c = new Date(start);
      c.setDate(start.getDate() + w * 7 + day);
      return c;
    }),
  );
  const note =
    mode === "Roster"
      ? "Roster mode has no automatic off-days — handled per published roster."
      : mode === "Rotational" && !(settings as RotationalSettings).pattern?.length
        ? "No rotation pattern — approximated as Sundays."
        : null;

  return (
    <Field label="Preview — next 4 weeks">
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((h) => (
            <div key={h} className="text-center text-[9.5px] font-bold uppercase tracking-wide text-gray-400">
              {h}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell) => {
                const off = isOff(cell, mode, settings);
                return (
                  <div
                    key={cell.toISOString()}
                    title={cell.toDateString()}
                    className={[
                      "h-7 rounded-md flex items-center justify-center text-[11px] font-semibold border",
                      off
                        ? "bg-[lab(36.9089%_35.0961_-85.6872)] text-white border-[lab(36.9089%_35.0961_-85.6872)]"
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
            <span className="w-2.5 h-2.5 rounded-sm bg-[lab(36.9089%_35.0961_-85.6872)] inline-block" />
            Off day
          </span>
          {note && <span className="italic text-amber-600">{note}</span>}
        </div>
      </div>
    </Field>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
