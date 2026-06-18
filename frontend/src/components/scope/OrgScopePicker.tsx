"use client";

// Reusable "Applies To" scope picker (same UX as the Holiday Policy dialog):
// Location / Department / Sub-Department dropdown checklists with "Select all".
// Departments narrow to the chosen location(s) and sub-departments narrow to
// the chosen department(s). Leaving everything empty = entire organisation
// (emits a single Company row). Branch is surfaced as "Location".

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type OrgScopeRow = {
  scopeType: "Company" | "Branch" | "Department" | "SubDepartment";
  scopeId: number | null;
};

type Lookup = { id: number; name: string; departmentId?: number | null };

export default function OrgScopePicker({
  initial,
  onChange,
}: {
  initial: OrgScopeRow[];
  onChange: (rows: OrgScopeRow[]) => void;
}) {
  const [branchIds, setBranchIds] = useState<Set<number>>(new Set());
  const [departmentIds, setDepartmentIds] = useState<Set<number>>(new Set());
  const [subDepartmentIds, setSubDepartmentIds] = useState<Set<number>>(new Set());

  const [branches, setBranches] = useState<Lookup[] | null>(null);
  const [departments, setDepartments] = useState<Lookup[] | null>(null);
  const [subDepartments, setSubDepartments] = useState<Lookup[] | null>(null);

  // Load org lookups once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, s, b] = await Promise.all([
          fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/sub-departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/branches?limit=500", { credentials: "include" }),
        ]);
        if (d.ok && !cancelled) setDepartments((await d.json()).data);
        if (b.ok && !cancelled) setBranches((await b.json()).data);
        if (s.ok && !cancelled) {
          const body = (await s.json()) as {
            data: Array<{ id: number; name: string; departmentId: number | null }>;
          };
          setSubDepartments(
            body.data.map((x) => ({ id: x.id, name: x.name, departmentId: x.departmentId ?? null })),
          );
        }
      } catch {
        /* best effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate once from initial rows.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const br = new Set<number>();
    const de = new Set<number>();
    const su = new Set<number>();
    for (const r of initial) {
      if (r.scopeType === "Branch" && r.scopeId != null) br.add(r.scopeId);
      else if (r.scopeType === "Department" && r.scopeId != null) de.add(r.scopeId);
      else if (r.scopeType === "SubDepartment" && r.scopeId != null) su.add(r.scopeId);
    }
    setBranchIds(br);
    setDepartmentIds(de);
    setSubDepartmentIds(su);
  }, [initial]);

  // Every department is selectable regardless of the chosen location — a
  // department can be scoped even with no employees there yet, and org-wide
  // ("All Locations") departments must always appear.
  const visibleDepartments = useMemo(() => departments ?? [], [departments]);

  // Sub-departments of the chosen department(s).
  const visibleSubDepartments = useMemo(() => {
    if (!subDepartments || departmentIds.size === 0) return [];
    return subDepartments.filter(
      (s) => s.departmentId != null && departmentIds.has(s.departmentId),
    );
  }, [subDepartments, departmentIds]);

  const subDeptLabel = useMemo(() => {
    const deptName = new Map((departments ?? []).map((d) => [d.id, d.name]));
    const m = new Map<number, string>();
    for (const s of subDepartments ?? []) {
      const parent = s.departmentId != null ? deptName.get(s.departmentId) : null;
      m.set(s.id, parent ? `${s.name} · ${parent}` : s.name);
    }
    return m;
  }, [subDepartments, departments]);

  // Prune selections that fall out of the linked filters.
  useEffect(() => {
    setDepartmentIds((prev) => prune(prev, visibleDepartments.map((d) => d.id)));
  }, [visibleDepartments]);
  useEffect(() => {
    setSubDepartmentIds((prev) => prune(prev, visibleSubDepartments.map((s) => s.id)));
  }, [visibleSubDepartments]);

  // Emit scope rows on any change. Empty → entire org (Company).
  useEffect(() => {
    const rows: OrgScopeRow[] = [
      ...[...branchIds].map((id) => ({ scopeType: "Branch" as const, scopeId: id })),
      ...[...departmentIds].map((id) => ({ scopeType: "Department" as const, scopeId: id })),
      ...[...subDepartmentIds].map((id) => ({ scopeType: "SubDepartment" as const, scopeId: id })),
    ];
    onChange(rows.length > 0 ? rows : [{ scopeType: "Company", scopeId: null }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchIds, departmentIds, subDepartmentIds]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">
        Leave Location, Department and Sub-Department empty to apply to the{" "}
        <strong>entire organisation</strong>.
      </p>
      <Dropdown label="Location" options={branches} selected={branchIds} onChange={setBranchIds} />
      <Dropdown
        label="Department"
        options={visibleDepartments}
        selected={departmentIds}
        onChange={setDepartmentIds}
      />
      <Dropdown
        label="Sub-Department"
        options={departmentIds.size === 0 ? null : visibleSubDepartments}
        selected={subDepartmentIds}
        onChange={setSubDepartmentIds}
        labelFor={(id) => subDeptLabel.get(id)}
        disabled={departmentIds.size === 0}
        disabledHint="Pick department(s) first"
      />
    </div>
  );
}

function prune(prev: Set<number>, allowedIds: number[]): Set<number> {
  const allowed = new Set(allowedIds);
  let changed = false;
  const next = new Set<number>();
  for (const id of prev) {
    if (allowed.has(id)) next.add(id);
    else changed = true;
  }
  return changed ? next : prev;
}

function Dropdown({
  label,
  options,
  selected,
  onChange,
  labelFor,
  disabled = false,
  disabledHint,
}: {
  label: string;
  options: Lookup[] | null;
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  labelFor?: (id: number) => string | undefined;
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
  const display = (o: Lookup) => labelFor?.(o.id) ?? o.name;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => display(o).toLowerCase().includes(q));
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
    ? (disabledHint ?? "")
    : allSelected
      ? `All ${label.toLowerCase()}s`
      : selected.size === 0
        ? `Pick ${label.toLowerCase()}s…`
        : `${selected.size} selected`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold text-gray-700">{label}</label>
        {!disabled && list.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className={`text-[11px] font-semibold text-[lab(36.9089%_35.0961_-85.6872)] hover:underline`}
          >
            {allSelected ? "Clear" : `Select all ${label.toLowerCase()}s`}
          </button>
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
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && !disabled && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-[220px] overflow-hidden flex flex-col">
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
            <label className={`flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold cursor-pointer select-none border-b border-gray-100 text-gray-800 hover:bg-gray-50`}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className={`w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)]`} />
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
                      checked ? `bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)]` : "hover:bg-gray-50 text-gray-700",
                    ].join(" ")}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.id)} className={`w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)]`} />
                    <span className="flex-1 truncate">{display(o)}</span>
                    {checked && <X size={12} className="text-blue-400" />}
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
