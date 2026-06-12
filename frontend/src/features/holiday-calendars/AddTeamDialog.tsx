"use client";

// Add / Edit Team dialog. Captures:
//   - Team name
//   - Department (one)
//   - Sub-Department / Designation (one, optional, filtered to chosen dept)
//   - Holidays multi-select checklist (existing holidays to link)
//
// Saving creates / updates a holiday_calendar with scope rows {Department, [Designation]}
// and links the selected holidays via holiday_team_links.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Save, Search, X } from "lucide-react";
import {
  createHolidayCalendar,
  updateHolidayCalendar,
  type GlobalHoliday,
  type HolidayCalendarDetail,
  type HolidayCalendarStatus,
} from "./api/holiday-calendars.client";

interface LookupRow {
  id: number;
  name: string;
  departmentId?: number | null;
}

const STATUSES: HolidayCalendarStatus[] = ["Draft", "Published", "Archived"];

export default function AddTeamDialog({
  open,
  initial,
  availableHolidays,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Existing team being edited, or null for create. */
  initial: HolidayCalendarDetail | null;
  /** Holidays available to attach (typically all from the global list). */
  availableHolidays: GlobalHoliday[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [subDepartmentId, setSubDepartmentId] = useState<number | null>(null);
  const [status, setStatus] = useState<HolidayCalendarStatus>("Published");
  const [selectedHolidayIds, setSelectedHolidayIds] = useState<Set<number>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<LookupRow[] | null>(null);
  const [designations, setDesignations] = useState<LookupRow[] | null>(null);

  // Load org lookups once when dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [deptRes, desigRes] = await Promise.all([
          fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/designations?limit=500", { credentials: "include" }),
        ]);
        if (deptRes.ok) {
          const body = (await deptRes.json()) as {
            data: Array<{ id: number; name: string }>;
          };
          if (!cancelled) setDepartments(body.data);
        }
        if (desigRes.ok) {
          const body = (await desigRes.json()) as {
            data: Array<{ id: number; name: string; department_id: number | null }>;
          };
          if (!cancelled)
            setDesignations(
              body.data.map((d) => ({
                id: d.id,
                name: d.name,
                departmentId: d.department_id ?? null,
              })),
            );
        }
      } catch {
        // Best-effort; the dropdowns just show empty lists on error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset / hydrate form when opening.
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setStatus(initial.status);
      let deptId: number | null = null;
      let subId: number | null = null;
      for (const s of initial.scope) {
        if (s.scopeType === "Department" && deptId == null) deptId = s.scopeId;
        if (s.scopeType === "Designation" && subId == null) subId = s.scopeId;
      }
      setDepartmentId(deptId);
      setSubDepartmentId(subId);
      setSelectedHolidayIds(new Set(initial.holidayIds));
    } else {
      setName("");
      setDepartmentId(null);
      setSubDepartmentId(null);
      setStatus("Published");
      setSelectedHolidayIds(new Set());
    }
    setError(null);
  }, [open, initial]);

  // Designations filtered to selected department.
  const filteredDesignations = useMemo(() => {
    if (!designations) return [];
    if (departmentId == null) return designations;
    return designations.filter(
      (d) => d.departmentId == null || d.departmentId === departmentId,
    );
  }, [designations, departmentId]);

  // If department changes and the picked sub-dept doesn't belong, clear it.
  useEffect(() => {
    if (subDepartmentId == null) return;
    const match = filteredDesignations.find((d) => d.id === subDepartmentId);
    if (!match) setSubDepartmentId(null);
  }, [filteredDesignations, subDepartmentId]);

  if (!open) return null;

  const editing = initial !== null;
  const canSave = name.trim().length > 0 && departmentId != null;

  function toggleHoliday(id: number) {
    setSelectedHolidayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const scope = [
        {
          scopeType: "Department" as const,
          scopeId: departmentId!,
          priority: 100,
        },
        ...(subDepartmentId != null
          ? [
              {
                scopeType: "Designation" as const,
                scopeId: subDepartmentId,
                priority: 90,
              },
            ]
          : []),
      ];
      if (editing && initial) {
        await updateHolidayCalendar(initial.id, {
          name: name.trim(),
          status,
          scope,
          holidayIds: Array.from(selectedHolidayIds),
        });
      } else {
        await createHolidayCalendar({
          name: name.trim(),
          description: null,
          status,
          holidays: [],
          scope,
          holidayIds: Array.from(selectedHolidayIds),
        });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
              {editing ? "Edit Team" : "Add Team"}
            </h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">
              A team is a department/sub-department group that receives the
              picked holidays.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 -mt-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Delhi"
              autoFocus
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <select
                value={departmentId ?? ""}
                onChange={(e) =>
                  setDepartmentId(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
              >
                <option value="">Pick department…</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sub-Department">
              <select
                value={subDepartmentId ?? ""}
                onChange={(e) =>
                  setSubDepartmentId(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] disabled:bg-gray-50"
                disabled={departmentId == null}
              >
                <option value="">
                  {departmentId == null
                    ? "Pick department first"
                    : "Any sub-department"}
                </option>
                {filteredDesignations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Status">
            <div className="flex gap-2">
              {STATUSES.map((s) => {
                const active = status === s;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    className={[
                      "px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold transition-all",
                      active
                        ? "border-[#FF014F] bg-pink-50 text-[#FF014F]"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#FF014F]/40",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="border-t border-gray-100 pt-4">
            <HolidayChecklist
              holidays={availableHolidays}
              selected={selectedHolidayIds}
              onToggle={toggleHoliday}
            />
          </div>

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-2 justify-end">
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
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editing ? "Save Changes" : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── checklist dropdown for holidays ───────────────────────────────────────

function HolidayChecklist({
  holidays,
  selected,
  onToggle,
}: {
  holidays: GlobalHoliday[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return holidays;
    return holidays.filter(
      (h) =>
        h.name.toLowerCase().includes(q) || h.date.includes(q),
    );
  }, [holidays, query]);

  const selectedHolidays = holidays.filter((h) => selected.has(h.id));

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[12px] font-bold tracking-widest text-gray-500 uppercase">
          Holidays
        </p>
        <p className="text-[11px] text-gray-400">
          {selected.size === 0 ? "None selected" : `${selected.size} selected`}
        </p>
      </div>

      {/* Selected chips */}
      {selectedHolidays.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedHolidays.map((h) => (
            <span
              key={h.id}
              className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-200 text-[#be185d] px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
            >
              {h.name} · {h.date}
              <button
                type="button"
                onClick={() => onToggle(h.id)}
                className="text-pink-400 hover:text-pink-700"
                aria-label={`Remove ${h.name}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <Check size={13} className="text-gray-400" />
          {open ? "Hide holidays" : "Pick holidays to include"}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[280px] overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 relative">
            <Search
              size={13}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search holidays…"
              autoFocus
              className="w-full pl-7 pr-2 py-1.5 rounded text-[12.5px] focus:outline-none border-0"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-gray-500 italic">
                {holidays.length === 0
                  ? 'No holidays yet — click "Add Holiday" first.'
                  : "No holidays match your search."}
              </p>
            )}
            {filtered.map((h) => {
              const checked = selected.has(h.id);
              return (
                <label
                  key={h.id}
                  className={[
                    "flex items-center gap-2 px-3 py-1.5 text-[12.5px] cursor-pointer select-none",
                    checked
                      ? "bg-pink-50 text-[#be185d]"
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(h.id)}
                    className="rounded text-[#FF014F] focus:ring-[#fda4af]"
                  />
                  <span className="flex-1 truncate">{h.name}</span>
                  <span className="text-gray-400 text-[11px]">{h.date}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
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
