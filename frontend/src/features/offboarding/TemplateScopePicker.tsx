"use client";

// "Applies To" scope picker for offboarding templates (exit interview, etc.).
// Mirrors the Holiday Policy dialog: Entire Organisation | Location | Department
// | Sub-Department, where the non-org levels are multi-selects with "Select
// all". Emits one scope row per selected unit (Company | Branch | Department |
// SubDepartment) — the backend OR-matches them and picks the most specific.

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type ScopeRow = {
  scopeType: "Company" | "Branch" | "Department" | "SubDepartment";
  scopeId: number | null;
};

type Mode = "Organisation" | "Location" | "Department" | "SubDepartment";
type Lookup = { id: number; name: string; departmentId?: number | null };

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "Organisation", label: "Entire Organisation", hint: "Every employee" },
  { key: "Location", label: "Location", hint: "Chosen location(s)" },
  { key: "Department", label: "Department", hint: "Chosen department(s)" },
  { key: "SubDepartment", label: "Sub-Department", hint: "Chosen sub-department(s)" },
];

export default function TemplateScopePicker({
  initial,
  onChange,
}: {
  initial: ScopeRow[];
  onChange: (rows: ScopeRow[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("Organisation");
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

  // Hydrate from initial scope rows once.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const br = new Set<number>();
    const de = new Set<number>();
    const su = new Set<number>();
    let m: Mode = "Organisation";
    for (const r of initial) {
      if (r.scopeType === "SubDepartment" && r.scopeId != null) {
        su.add(r.scopeId);
        m = "SubDepartment";
      } else if (r.scopeType === "Department" && r.scopeId != null) {
        de.add(r.scopeId);
        if (m === "Organisation" || m === "Location") m = "Department";
      } else if (r.scopeType === "Branch" && r.scopeId != null) {
        br.add(r.scopeId);
        if (m === "Organisation") m = "Location";
      }
    }
    setMode(m);
    setBranchIds(br);
    setDepartmentIds(de);
    setSubDepartmentIds(su);
  }, [initial]);

  const subDeptLabel = useMemo(() => {
    const deptName = new Map((departments ?? []).map((d) => [d.id, d.name]));
    const m = new Map<number, string>();
    for (const s of subDepartments ?? []) {
      const parent = s.departmentId != null ? deptName.get(s.departmentId) : null;
      m.set(s.id, parent ? `${s.name} · ${parent}` : s.name);
    }
    return m;
  }, [subDepartments, departments]);

  // Emit scope rows whenever the selection changes.
  function emit(m: Mode, br: Set<number>, de: Set<number>, su: Set<number>) {
    const rows: ScopeRow[] =
      m === "Organisation"
        ? [{ scopeType: "Company", scopeId: null }]
        : m === "Location"
          ? [...br].map((id) => ({ scopeType: "Branch" as const, scopeId: id }))
          : m === "Department"
            ? [...de].map((id) => ({ scopeType: "Department" as const, scopeId: id }))
            : [...su].map((id) => ({ scopeType: "SubDepartment" as const, scopeId: id }));
    onChange(rows);
  }

  // Re-emit on any change (including hydration).
  useEffect(() => {
    emit(mode, branchIds, departmentIds, subDepartmentIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, branchIds, departmentIds, subDepartmentIds]);

  return (
    <div className="space-y-3">
      <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">Applies To</p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button
              type="button"
              key={m.key}
              onClick={() => setMode(m.key)}
              className={[
                "flex flex-col items-start text-left px-3 py-2 rounded-lg border transition-all",
                active
                  ? "border-[lab(36.9089%_35.0961_-85.6872)] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-[lab(36.9089%_35.0961_-85.6872)]/40",
              ].join(" ")}
            >
              <span
                className={`text-[12.5px] font-semibold ${active ? "text-[lab(36.9089%_35.0961_-85.6872)]" : "text-gray-800"}`}
              >
                {m.label}
              </span>
              <span className="text-[11px] text-gray-400 leading-tight mt-0.5">{m.hint}</span>
            </button>
          );
        })}
      </div>

      {mode === "Location" && (
        <MultiSelect label="Locations" options={branches} selected={branchIds} onChange={setBranchIds} />
      )}
      {mode === "Department" && (
        <MultiSelect label="Departments" options={departments} selected={departmentIds} onChange={setDepartmentIds} />
      )}
      {mode === "SubDepartment" && (
        <MultiSelect
          label="Sub-Departments"
          options={subDepartments}
          selected={subDepartmentIds}
          onChange={setSubDepartmentIds}
          labelFor={(id) => subDeptLabel.get(id)}
        />
      )}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  labelFor,
}: {
  label: string;
  options: Lookup[] | null;
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  labelFor?: (id: number) => string | undefined;
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

  const summary = allSelected
    ? `All ${label.toLowerCase()}`
    : selected.size === 0
      ? `Pick ${label.toLowerCase()}…`
      : `${selected.size} selected`;

  return (
    <div>
      <label className="text-[12px] font-semibold text-gray-700">{label}</label>
      <div className="relative mt-1.5" ref={ref}>
        {selected.size > 0 && !allSelected && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {list
              .filter((o) => selected.has(o.id))
              .map((o) => (
                <span
                  key={o.id}
                  className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-[lab(36.9089%_35.0961_-85.6872)] px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
                >
                  {display(o)}
                  <button type="button" onClick={() => toggle(o.id)} className="text-blue-400 hover:text-blue-700">
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
          <span className={selected.size === 0 ? "text-gray-400" : ""}>{summary}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[240px] overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-gray-100 relative">
              <Search size={13} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 rounded text-[12.5px] focus:outline-none border-0"
              />
            </div>
            <label className="flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold cursor-pointer select-none border-b border-gray-100 text-gray-800 hover:bg-gray-50">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select all {label.toLowerCase()}
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
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.id)} className="rounded" />
                    <span className="flex-1 truncate">{display(o)}</span>
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
