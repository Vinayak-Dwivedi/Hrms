"use client";

// Add / Edit Team dialog. Captures:
//   - Team name
//   - Location(s) from branches
//   - Department(s) filtered by selected location(s)
//   - Sub-Department(s) filtered by selected department(s)
//   - Holidays multi-select checklist (existing holidays to link)
//
// Saving creates / updates a holiday_calendar with scope rows and links
// the selected holidays via holiday_team_links.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Save, Search, X } from "lucide-react";
import {
  createHolidayCalendar,
  updateHolidayCalendar,
  type CalendarScopeRow,
  type GlobalHoliday,
  type HolidayCalendarDetail,
} from "./api/holiday-calendars.client";
import { fetchDepartmentsList } from "@/features/departments/api/departments.client";
import { fetchBranches } from "@/features/employees/api/employees.client";
import { API_BASE } from "@/lib/hrms-client";
import BranchMultiSelect from "@/components/branch-multi-select/BranchMultiSelect";
import {
  employeeBtnClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeInputClass,
  employeeModalTitleClass,
  holidayCheckboxClass,
  holidayChecklistSelectedClass,
  holidayChipClass,
  holidayModalCancelClass,
} from "./holiday-calendars-theme";

type LookupItem = { id: number; name: string };

type SubDepartmentItem = {
  id: number;
  name: string;
  departmentId: number | null;
};

type DepartmentItem = {
  id: number;
  name: string;
  locationArea: string | null;
};

async function fetchSubDepartmentsWithDept(): Promise<SubDepartmentItem[]> {
  const res = await fetch(`${API_BASE}/api/hrms/sub-departments?limit=500`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    data: Array<{ id: number; name: string; departmentId: number | null }>;
  };
  return (body.data ?? []).map((x) => ({
    id: x.id,
    name: x.name,
    departmentId: x.departmentId ?? null,
  }));
}

function hydrateScopeFromInitial(scope: CalendarScopeRow[]) {
  const hasCompany = scope.some((s) => s.scopeType === "Company");
  if (hasCompany) {
    return {
      allLocations: true,
      locationIds: new Set<number>(),
      allDepartments: true,
      departmentIds: new Set<number>(),
      allSubDepartments: true,
      subDepartmentIds: new Set<number>(),
    };
  }

  const branchIds = scope
    .filter((s) => s.scopeType === "Branch" && s.scopeId != null)
    .map((s) => s.scopeId!);
  const deptIds = scope
    .filter((s) => s.scopeType === "Department" && s.scopeId != null)
    .map((s) => s.scopeId!);
  const subIds = scope
    .filter((s) => s.scopeType === "SubDepartment" && s.scopeId != null)
    .map((s) => s.scopeId!);

  const allLocations = branchIds.length === 0;
  const allDepartments = deptIds.length === 0;
  const allSubDepartments = !allDepartments && subIds.length === 0;

  return {
    allLocations,
    locationIds: new Set(branchIds),
    allDepartments,
    departmentIds: new Set(deptIds),
    allSubDepartments,
    subDepartmentIds: new Set(subIds),
  };
}

function buildScopePayload(
  allLocations: boolean,
  locationIds: Set<number>,
  allDepartments: boolean,
  departmentIds: Set<number>,
  allSubDepartments: boolean,
  subDepartmentIds: Set<number>,
): CalendarScopeRow[] {
  if (allLocations && allDepartments) {
    return [{ scopeType: "Company", scopeId: null, priority: 100 }];
  }

  return [
    ...(!allLocations
      ? [...locationIds].map((id) => ({
          scopeType: "Branch" as const,
          scopeId: id,
          priority: 110,
        }))
      : []),
    ...(!allDepartments
      ? [...departmentIds].map((id) => ({
          scopeType: "Department" as const,
          scopeId: id,
          priority: 100,
        }))
      : []),
    ...(!allDepartments && !allSubDepartments
      ? [...subDepartmentIds].map((id) => ({
          scopeType: "SubDepartment" as const,
          scopeId: id,
          priority: 90,
        }))
      : []),
  ];
}

export default function AddTeamDialog({
  open,
  initial,
  availableHolidays,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: HolidayCalendarDetail | null;
  availableHolidays: GlobalHoliday[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [allLocations, setAllLocations] = useState(true);
  const [locationIds, setLocationIds] = useState<Set<number>>(new Set());
  const [allDepartments, setAllDepartments] = useState(false);
  const [departmentIds, setDepartmentIds] = useState<Set<number>>(new Set());
  const [allSubDepartments, setAllSubDepartments] = useState(true);
  const [subDepartmentIds, setSubDepartmentIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedHolidayIds, setSelectedHolidayIds] = useState<Set<number>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartmentItem[]>(
    [],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [brs, depts, subs] = await Promise.all([
          fetchBranches(),
          fetchDepartmentsList(),
          fetchSubDepartmentsWithDept(),
        ]);
        if (cancelled) return;
        setBranches(brs);
        setDepartments(
          depts.map((d) => ({
            id: d.id,
            name: d.name,
            locationArea: d.locationArea,
          })),
        );
        setSubDepartments(subs);
      } catch {
        // Best-effort; dropdowns show empty on error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      const hydrated = hydrateScopeFromInitial(initial.scope);
      setAllLocations(hydrated.allLocations);
      setLocationIds(hydrated.locationIds);
      setAllDepartments(hydrated.allDepartments);
      setDepartmentIds(hydrated.departmentIds);
      setAllSubDepartments(hydrated.allSubDepartments);
      setSubDepartmentIds(hydrated.subDepartmentIds);
      setSelectedHolidayIds(new Set(initial.holidayIds));
    } else {
      setName("");
      setAllLocations(true);
      setLocationIds(new Set());
      setAllDepartments(false);
      setDepartmentIds(new Set());
      setAllSubDepartments(true);
      setSubDepartmentIds(new Set());
      setSelectedHolidayIds(new Set());
    }
    setError(null);
  }, [open, initial]);

  const selectedBranchNames = useMemo(() => {
    if (allLocations) return null;
    const names = new Set<string>();
    for (const id of locationIds) {
      const branch = branches.find((b) => b.id === id);
      if (branch) names.add(branch.name);
    }
    return names;
  }, [allLocations, locationIds, branches]);

  const visibleDepartments = useMemo(() => {
    if (allLocations) return departments;
    if (!selectedBranchNames || selectedBranchNames.size === 0) return [];
    return departments.filter(
      (d) =>
        d.locationArea != null && selectedBranchNames.has(d.locationArea),
    );
  }, [allLocations, departments, selectedBranchNames]);

  const visibleSubDepartments = useMemo(() => {
    if (allDepartments) return [];
    if (departmentIds.size === 0) return [];
    return subDepartments.filter(
      (s) => s.departmentId != null && departmentIds.has(s.departmentId),
    );
  }, [allDepartments, departmentIds, subDepartments]);

  // Prune department selections when location filter changes.
  useEffect(() => {
    if (allLocations || allDepartments) return;
    const visibleIds = new Set(visibleDepartments.map((d) => d.id));
    setDepartmentIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleDepartments, allLocations, allDepartments]);

  // Prune sub-department selections when department filter changes.
  useEffect(() => {
    if (allDepartments || allSubDepartments) return;
    const visibleIds = new Set(visibleSubDepartments.map((s) => s.id));
    setSubDepartmentIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleSubDepartments, allDepartments, allSubDepartments]);

  // Clear sub-dept state when all departments selected.
  useEffect(() => {
    if (!allDepartments) return;
    setAllSubDepartments(true);
    setSubDepartmentIds(new Set());
  }, [allDepartments]);

  if (!open) return null;

  const editing = initial !== null;
  const canSave =
    name.trim().length > 0 &&
    (allLocations || locationIds.size > 0) &&
    (allDepartments || departmentIds.size > 0);

  function toggleHoliday(id: number) {
    setSelectedHolidayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllHolidays() {
    setSelectedHolidayIds(new Set(availableHolidays.map((h) => h.id)));
  }

  function clearAllHolidays() {
    setSelectedHolidayIds(new Set());
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const scope = buildScopePayload(
        allLocations,
        locationIds,
        allDepartments,
        departmentIds,
        allSubDepartments,
        subDepartmentIds,
      );
      if (editing && initial) {
        await updateHolidayCalendar(initial.id, {
          name: name.trim(),
          status: "Published",
          scope,
          holidayIds: Array.from(selectedHolidayIds),
        });
      } else {
        await createHolidayCalendar({
          name: name.trim(),
          description: null,
          status: "Published",
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
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className={employeeModalTitleClass}>
              {editing ? "Edit Team" : "Add Team"}
            </h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">
              Define location, department, and sub-department scope, then pick
              holidays for this team.
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

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Delhi"
              autoFocus
              className={employeeInputClass}
            />
          </Field>

          <BranchMultiSelect
            label="Location"
            selectAllLabel="Select All Locations"
            items={branches}
            allSelected={allLocations}
            selectedIds={locationIds}
            onAllChange={(v) => {
              setAllLocations(v);
              if (v) setLocationIds(new Set());
            }}
            onSelectedChange={(ids) => {
              setAllLocations(false);
              setLocationIds(ids);
            }}
            placeholder="Pick locations…"
          />

          <BranchMultiSelect
            label="Department"
            selectAllLabel="Select All Departments"
            items={visibleDepartments.map((d) => ({ id: d.id, name: d.name }))}
            allSelected={allDepartments}
            selectedIds={departmentIds}
            onAllChange={(v) => {
              setAllDepartments(v);
              if (v) {
                setDepartmentIds(new Set());
                setAllSubDepartments(true);
                setSubDepartmentIds(new Set());
              }
            }}
            onSelectedChange={(ids) => {
              setAllDepartments(false);
              setDepartmentIds(ids);
            }}
            placeholder="Pick departments…"
          />

          {!allDepartments && (
            <BranchMultiSelect
              label="Sub-Department"
              selectAllLabel="Select All Sub-Departments"
              items={visibleSubDepartments.map((s) => ({
                id: s.id,
                name: s.name,
              }))}
              allSelected={allSubDepartments}
              selectedIds={subDepartmentIds}
              onAllChange={(v) => {
                setAllSubDepartments(v);
                if (v) setSubDepartmentIds(new Set());
              }}
              onSelectedChange={(ids) => {
                setAllSubDepartments(false);
                setSubDepartmentIds(ids);
              }}
              placeholder="Pick sub-departments…"
            />
          )}

          <div className="border-t border-gray-100 pt-4">
            <HolidayChecklist
              holidays={availableHolidays}
              selected={selectedHolidayIds}
              onToggle={toggleHoliday}
              onSelectAll={selectAllHolidays}
              onClearAll={clearAllHolidays}
            />
          </div>

          {error && <div className={employeeErrorBannerClass}>{error}</div>}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={holidayModalCancelClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className={`${employeeBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
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
  onSelectAll,
  onClearAll,
}: {
  holidays: GlobalHoliday[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allSelected =
    holidays.length > 0 && selected.size === holidays.length;

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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
      (h) => h.name.toLowerCase().includes(q) || h.date.includes(q),
    );
  }, [holidays, query]);

  const selectedHolidays = holidays.filter((h) => selected.has(h.id));

  function toggleSelectAll() {
    if (allSelected) onClearAll();
    else onSelectAll();
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[12px] font-bold tracking-widest text-gray-500 uppercase">
          Holidays
        </p>
        <p className="text-[11px] text-gray-400">
          {allSelected
            ? "All selected"
            : selected.size === 0
              ? "None selected"
              : `${selected.size} selected`}
        </p>
      </div>

      {selectedHolidays.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedHolidays.map((h) => (
            <span key={h.id} className={holidayChipClass}>
              {h.name} · {h.date}
              <button
                type="button"
                onClick={() => onToggle(h.id)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Remove ${h.name}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

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
            {holidays.length > 0 && (
              <label
                className={[
                  "flex items-center gap-2 px-3 py-2 text-[12.5px] cursor-pointer select-none border-b border-gray-100 font-medium",
                  allSelected
                    ? holidayChecklistSelectedClass
                    : "hover:bg-gray-50 text-gray-800",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className={holidayCheckboxClass}
                />
                <span>Select all holidays</span>
              </label>
            )}

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
                      ? holidayChecklistSelectedClass
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(h.id)}
                    className={holidayCheckboxClass}
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
      <label className={employeeFilterLabelClass}>{label}</label>
      {children}
    </div>
  );
}
