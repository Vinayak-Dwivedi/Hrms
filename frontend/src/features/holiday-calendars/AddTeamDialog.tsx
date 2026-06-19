"use client";

// Add / Edit Holiday Policy dialog. Captures:
//   - Policy name
//   - "Applies To" scope: Entire Organisation | Location | Department |
//     Sub-Department. The non-org levels are multi-selects with "Select all",
//     so a policy can target one, several, or every unit at that level.
//   - Status (Draft / Published / Archived)
//   - Holidays multi-select checklist (existing holidays to link)
//
// Saving creates / updates a holiday_calendar with one scope row per selected
// unit (Company / Branch / Department / SubDepartment) — the resolver OR-matches
// them — and links the selected holidays via holiday_team_links.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
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
  // Combined scope: tick any locations + departments + sub-departments via the
  // dropdown checklists below. Leaving everything empty = entire organisation.
  const [branchIds, setBranchIds] = useState<Set<number>>(new Set());
  const [departmentIds, setDepartmentIds] = useState<Set<number>>(new Set());
  const [subDepartmentIds, setSubDepartmentIds] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<HolidayCalendarStatus>("Published");
  const [selectedHolidayIds, setSelectedHolidayIds] = useState<Set<number>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<LookupRow[] | null>(null);
  const [departments, setDepartments] = useState<LookupRow[] | null>(null);
  const [subDepartments, setSubDepartments] = useState<LookupRow[] | null>(null);

  // Load org lookups once when dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [deptRes, subRes, branchRes] = await Promise.all([
          fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/sub-departments?limit=500", {
            credentials: "include",
          }),
          fetch("/api/hrms/branches?limit=500", { credentials: "include" }),
        ]);
        if (branchRes.ok) {
          const body = (await branchRes.json()) as {
            data: Array<{ id: number; name: string }>;
          };
          if (!cancelled) setBranches(body.data);
        }
        if (deptRes.ok) {
          const body = (await deptRes.json()) as {
            data: Array<{ id: number; name: string }>;
          };
          if (!cancelled) setDepartments(body.data);
        }
        if (subRes.ok) {
          const body = (await subRes.json()) as {
            data: Array<{ id: number; name: string; departmentId: number | null }>;
          };
          if (!cancelled)
            setSubDepartments(
              body.data.map((d) => ({
                id: d.id,
                name: d.name,
                departmentId: d.departmentId ?? null,
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
      const brIds = new Set<number>();
      const deptIds = new Set<number>();
      const subIds = new Set<number>();
      for (const s of initial.scope) {
        if (s.scopeType === "SubDepartment" && s.scopeId != null) subIds.add(s.scopeId);
        else if (s.scopeType === "Department" && s.scopeId != null) deptIds.add(s.scopeId);
        else if (s.scopeType === "Branch" && s.scopeId != null) brIds.add(s.scopeId);
      }
      setBranchIds(brIds);
      setDepartmentIds(deptIds);
      setSubDepartmentIds(subIds);
      setSelectedHolidayIds(new Set(initial.holidayIds));
    } else {
      setName("");
      setBranchIds(new Set());
      setDepartmentIds(new Set());
      setSubDepartmentIds(new Set());
      setStatus("Published");
      setSelectedHolidayIds(new Set());
    }
    setError(null);
  }, [open, initial]);

  // Every department is selectable regardless of the chosen location — a
  // department can be scoped even with no employees there yet, and org-wide
  // ("All Locations") departments must always appear.
  const visibleDepartments = useMemo(() => departments ?? [], [departments]);

  // Drop any selected departments no longer offered for the chosen location(s).
  useEffect(() => {
    setDepartmentIds((prev) => {
      const allowed = new Set(visibleDepartments.map((d) => d.id));
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleDepartments]);

  // Sub-departments selectable for the currently-picked departments (linked).
  const filteredSubDepartments = useMemo(() => {
    if (!subDepartments) return [];
    if (departmentIds.size === 0) return [];
    return subDepartments.filter(
      (s) => s.departmentId != null && departmentIds.has(s.departmentId),
    );
  }, [subDepartments, departmentIds]);

  // Drop any selected sub-departments whose department is no longer picked.
  useEffect(() => {
    setSubDepartmentIds((prev) => {
      const allowed = new Set(filteredSubDepartments.map((s) => s.id));
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredSubDepartments]);

  if (!open) return null;

  const editing = initial !== null;
  // Scope is always valid: no selection = entire organisation.
  const canSave = name.trim().length > 0;

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
      // One row per ticked location / department / sub-department (the resolver
      // OR-matches them). Nothing ticked → a single Company row (entire org).
      const granular = [
        ...[...branchIds].map((id) => ({ scopeType: "Branch" as const, scopeId: id, priority: 80 })),
        ...[...departmentIds].map((id) => ({ scopeType: "Department" as const, scopeId: id, priority: 100 })),
        ...[...subDepartmentIds].map((id) => ({ scopeType: "SubDepartment" as const, scopeId: id, priority: 90 })),
      ];
      const scope: {
        scopeType: "Company" | "Branch" | "Department" | "SubDepartment";
        scopeId: number | null;
        priority: number;
      }[] =
        granular.length > 0 ? granular : [{ scopeType: "Company", scopeId: null, priority: 110 }];
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
      const msg = (e as Error).message;
      setError(msg);
      toast.error(msg);
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
        className="bg-white rounded-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
              {editing ? "Edit Holiday Policy" : "Add Holiday Policy"}
            </h2>

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
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
            />
          </Field>

          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-gray-700">Applies To</p>
            <p className="text-[11px] text-gray-400 -mt-1">
              Leave Location, Department and Sub-Department empty to apply to the{" "}
              <strong>entire organisation</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ScopeDropdown
                label="Location"
                options={branches}
                selected={branchIds}
                onChange={setBranchIds}
                placeholder="Pick locations…"
              />
              <ScopeDropdown
                label="Department"
                options={visibleDepartments}
                selected={departmentIds}
                onChange={setDepartmentIds}
                placeholder="Pick departments…"
              />
              <div className="md:col-span-2">
                <ScopeDropdown
                  label="Sub-Department"
                  options={departmentIds.size === 0 ? null : filteredSubDepartments}
                  selected={subDepartmentIds}
                  onChange={setSubDepartmentIds}
                  placeholder="Pick sub-departments…"
                  disabled={departmentIds.size === 0}
                  disabledHint="Pick department(s) first"
                />
              </div>
            </div>
          </div>

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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editing ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
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
              className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-[lab(36.9089%_35.0961_-85.6872)] px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
            >
              {h.name} · {h.date}
              <button
                type="button"
                onClick={() => onToggle(h.id)}
                className="text-blue-400 hover:text-blue-700"
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
                      ? "bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)]"
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(h.id)}
                    className="rounded text-[lab(36.9089%_35.0961_-85.6872)] focus:ring-[#bfdbfe]"
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

// ─── dropdown checklist with "Select all" for one scope level ───────────────
function ScopeDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder,
  disabled = false,
  disabledHint,
}: {
  label: string;
  options: LookupRow[] | null;
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  placeholder: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const list = options ?? [];
  const allSelected = list.length > 0 && list.every((o) => selected.has(o.id));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => o.name.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, query]);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }
  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(list.map((o) => o.id)));
  }

  const summary = disabled
    ? (disabledHint ?? placeholder)
    : allSelected
      ? `All ${label.toLowerCase()}s`
      : selected.size === 0
        ? placeholder
        : `${selected.size} selected`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold text-gray-700">{label}</label>
        {!disabled && list.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] font-semibold text-[lab(36.9089%_35.0961_-85.6872)] hover:underline"
          >
            {allSelected ? "Clear" : `Select all ${label.toLowerCase()}s`}
          </button>
        )}
        {!disabled && list.length === 0 && (
          <span className="text-[11px] text-gray-400">None available</span>
        )}
      </div>

      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={[
            "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-[13px] transition-colors",
            disabled
              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          <span className="flex items-center gap-2">
            <Check size={13} className="text-gray-400" />
            <span className={selected.size === 0 && !disabled ? "text-gray-400" : ""}>{summary}</span>
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && !disabled && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-[240px] overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-gray-100 relative">
              <Search size={13} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}s…`}
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 rounded text-[12.5px] focus:outline-none border-0"
              />
            </div>
            <label className="flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold cursor-pointer select-none border-b border-gray-100 text-gray-800 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)]"
              />
              Select all {label.toLowerCase()}s
            </label>
            <div className="overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-3 py-3 text-[12px] text-gray-500 italic">
                  {list.length === 0 ? "Nothing to choose yet." : "No matches."}
                </p>
              )}
              {filtered.map((o) => {
                const checked = selected.has(o.id);
                return (
                  <label
                    key={o.id}
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 text-[12.5px] cursor-pointer select-none",
                      checked ? "bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)]" : "hover:bg-gray-50 text-gray-700",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.id)}
                      className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)]"
                    />
                    <span className="flex-1 truncate">{o.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
