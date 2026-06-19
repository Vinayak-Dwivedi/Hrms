"use client";

// Holiday Policy — flat holiday table. Each row is one holiday (Name = the
// holiday's name). Location / Department / Sub-Department are inline multi-select
// dropdowns that write the holiday's per-holiday `scope` (empty = whole company);
// Location → Branch scope rows, Department → Department, Sub-Department →
// SubDepartment. A row's View opens a read-only scope dialog; Edit opens the
// holiday editor; Delete removes it. "+ Add Holiday" opens the compact add
// dialog and the new holiday appears here automatically.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteGlobalHoliday,
  listGlobalHolidays,
  updateGlobalHoliday,
  type GlobalHoliday,
  type PerHolidayScopeRow,
} from "./api/holiday-calendars.client";
import { cn } from "@/lib/utils";
import AddHolidayDialog from "./AddHolidayDialog";
import EditHolidayDialog from "./EditHolidayDialog";
import HolidayScopeDialog from "./HolidayScopeDialog";

type Lookup = { id: number; name: string };
type SubLookup = { id: number; name: string; departmentId: number | null };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOfWeek(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return DAY_NAMES[d.getUTCDay()] ?? "";
}

// Derive the three selection sets from a holiday's flat scope array.
function scopeToSelections(scope: PerHolidayScopeRow[]) {
  const branchIds = new Set<number>();
  const deptIds = new Set<number>();
  const subDeptIds = new Set<number>();
  for (const s of scope) {
    if (s.scopeId == null) continue;
    if (s.scopeType === "Branch" || s.scopeType === "Location") branchIds.add(s.scopeId);
    else if (s.scopeType === "Department") deptIds.add(s.scopeId);
    else if (s.scopeType === "SubDepartment") subDeptIds.add(s.scopeId);
  }
  return { branchIds, deptIds, subDeptIds };
}

function buildScope(
  branchIds: Set<number>,
  deptIds: Set<number>,
  subDeptIds: Set<number>,
): PerHolidayScopeRow[] {
  return [
    ...[...branchIds].map((id) => ({ scopeType: "Branch" as const, scopeId: id })),
    ...[...deptIds].map((id) => ({ scopeType: "Department" as const, scopeId: id })),
    ...[...subDeptIds].map((id) => ({ scopeType: "SubDepartment" as const, scopeId: id })),
  ];
}

export default function HolidayPolicyPage() {
  const [holidays, setHolidays] = useState<GlobalHoliday[]>([]);
  const [branches, setBranches] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalHoliday | null>(null);
  const [viewing, setViewing] = useState<GlobalHoliday | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, brRes, deptRes, subRes] = await Promise.all([
        listGlobalHolidays(),
        fetch("/api/hrms/branches?limit=500", { credentials: "include" }),
        fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
        fetch("/api/hrms/sub-departments?limit=500", { credentials: "include" }),
      ]);
      setHolidays(list);
      if (brRes.ok) {
        const b = (await brRes.json()) as { data: Lookup[] };
        setBranches(b.data);
      }
      if (deptRes.ok) {
        const b = (await deptRes.json()) as { data: Lookup[] };
        setDepartments(b.data);
      }
      if (subRes.ok) {
        const b = (await subRes.json()) as {
          data: Array<{ id: number; name: string; departmentId: number | null }>;
        };
        setSubDepartments(
          b.data.map((d) => ({ id: d.id, name: d.name, departmentId: d.departmentId ?? null })),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const branchNames = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches],
  );
  const departmentNames = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments],
  );
  const subDepartmentNames = useMemo(
    () => new Map(subDepartments.map((s) => [s.id, s.name])),
    [subDepartments],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
    if (!q) return rows;
    return rows.filter((h) => h.name.toLowerCase().includes(q) || h.date.includes(q));
  }, [holidays, search]);

  // Persist a rebuilt scope for one holiday, then patch it into local state.
  async function saveScope(
    h: GlobalHoliday,
    next: { branchIds: Set<number>; deptIds: Set<number>; subDeptIds: Set<number> },
  ) {
    setSavingId(h.id);
    setError(null);
    try {
      const updated = await updateGlobalHoliday(h.id, {
        scope: buildScope(next.branchIds, next.deptIds, next.subDeptIds),
      });
      setHolidays((hs) => hs.map((x) => (x.id === h.id ? updated : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(h: GlobalHoliday) {
    if (!confirm(`Delete holiday "${h.name}" (${h.date})?`)) return;
    try {
      await deleteGlobalHoliday(h.id);
      setHolidays((hs) => hs.filter((x) => x.id !== h.id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Search + Add Holiday */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search holidays…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
          />
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] shadow-sm hover:shadow-md transition-shadow sm:ml-auto"
        >
          <Plus size={14} /> Add Holiday
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Holiday table */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th>Name</Th>
                <Th>Date</Th>
                <Th>Location</Th>
                <Th>Department</Th>
                <Th>Sub-Department</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading && holidays.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-[12.5px]">
                    {holidays.length === 0
                      ? 'No holidays yet. Click "Add Holiday" to create one.'
                      : "No holidays match your search."}
                  </td>
                </tr>
              )}

              {filtered.map((h) => {
                const sel = scopeToSelections(h.scope);
                const rowSaving = savingId === h.id;
                // "Live" = the holiday is targeted to at least one location /
                // department / sub-department. Such rows get a premium blue tint;
                // untargeted rows stay neutral.
                const isLive =
                  sel.branchIds.size > 0 ||
                  sel.deptIds.size > 0 ||
                  sel.subDeptIds.size > 0;
                const subOptions = subDepartments.filter(
                  (s) => s.departmentId != null && sel.deptIds.has(s.departmentId),
                );
                return (
                  <tr
                    key={h.id}
                    className={cn(
                      "border-t border-gray-100 border-l-2 transition-colors",
                      isLive
                        ? "border-l-[lab(36.9089%_35.0961_-85.6872)] bg-gradient-to-r from-[lab(94.5%_4_-17)] to-[lab(98.5%_1.5_-6)] hover:from-[lab(92.5%_5.5_-21)] hover:to-[lab(97.5%_2.5_-9)]"
                        : "border-l-transparent bg-white hover:bg-gray-50/60",
                    )}
                  >
                    <Td>
                      <button
                        type="button"
                        onClick={() => setViewing(h)}
                        className="font-semibold text-gray-900 hover:text-[lab(30%_38_-90)] hover:underline text-left"
                      >
                        {h.name}
                      </button>
                      {h.isHalfDay && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Half-day
                        </span>
                      )}
                    </Td>
                    <Td className="text-gray-700 whitespace-nowrap">
                      {h.date}
                      <span className="text-gray-400 ml-1.5 text-[11.5px]">
                        {dayOfWeek(h.date)}
                      </span>
                    </Td>
                    <Td>
                      <ScopeCell
                        label="Locations"
                        options={branches}
                        selected={sel.branchIds}
                        saving={rowSaving}
                        onChange={(branchIds) =>
                          saveScope(h, { ...sel, branchIds })
                        }
                      />
                    </Td>
                    <Td>
                      <ScopeCell
                        label="Departments"
                        options={departments}
                        selected={sel.deptIds}
                        saving={rowSaving}
                        onChange={(deptIds) => {
                          // Drop sub-depts whose parent dept is no longer selected.
                          const allowed = new Set(
                            subDepartments
                              .filter((s) => s.departmentId != null && deptIds.has(s.departmentId))
                              .map((s) => s.id),
                          );
                          const subDeptIds = new Set(
                            [...sel.subDeptIds].filter((id) => allowed.has(id)),
                          );
                          saveScope(h, { ...sel, deptIds, subDeptIds });
                        }}
                      />
                    </Td>
                    <Td>
                      <ScopeCell
                        label="Sub-Departments"
                        options={subOptions}
                        selected={sel.subDeptIds}
                        saving={rowSaving}
                        disabled={sel.deptIds.size === 0}
                        disabledHint="Pick department(s) first"
                        onChange={(subDeptIds) => saveScope(h, { ...sel, subDeptIds })}
                      />
                    </Td>
                    <Td className="text-right pr-6">
                      <div className="inline-flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setViewing(h)}
                          title="View scope"
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(h)}
                          title="Edit holiday"
                          className="text-[lab(36.9089%_35.0961_-85.6872)] hover:text-[lab(30%_38_-90)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(h)}
                          title="Delete"
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 text-[12px] text-gray-500 border-t border-gray-100">
            {filtered.length} holiday{filtered.length === 1 ? "" : "s"}
          </div>
        )}
      </section>

      <AddHolidayDialog
        open={addOpen}
        existingHolidays={holidays}
        onEditExisting={(h) => {
          setAddOpen(false);
          setEditing(h);
        }}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          refresh();
        }}
      />

      <EditHolidayDialog
        open={editing !== null}
        holiday={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />

      <HolidayScopeDialog
        holiday={viewing}
        branchNames={branchNames}
        departmentNames={departmentNames}
        subDepartmentNames={subDepartmentNames}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

// ─── inline multi-select scope dropdown (portaled to escape table overflow) ──

function ScopeCell({
  label,
  options,
  selected,
  onChange,
  saving,
  disabled = false,
  disabledHint,
}: {
  label: string;
  options: Lookup[];
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  saving?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleOpen() {
    if (disabled) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
      setQuery("");
    }
    setOpen((o) => !o);
  }

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  // Show a fixed-width count ("All" / "2 Locations") rather than the picked
  // names, so the column width never shifts as selections grow.
  const allSelected = options.length > 0 && options.every((o) => selected.has(o.id));
  const noun = selected.size === 1 ? label.replace(/s$/, "") : label;
  const summary = disabled
    ? (disabledHint ?? "—")
    : selected.size === 0
      ? "All"
      : `${selected.size} ${noun}`;

  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={cn(
          "w-[150px] flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[12.5px] transition-colors",
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            : "border-gray-200 bg-white text-gray-700 hover:border-[#bfdbfe]",
        )}
      >
        <span
          className={cn(
            "truncate",
            !disabled && selected.size === 0 ? "text-gray-400" : "",
          )}
        >
          {summary}
        </span>
        {saving ? (
          <Loader2 size={13} className="animate-spin shrink-0 text-gray-400" />
        ) : (
          <ChevronDown
            size={14}
            className={cn("shrink-0 text-gray-400 transition-transform", open ? "rotate-180" : "")}
          />
        )}
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[1200] rounded-xl border border-gray-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.16)] p-1.5"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="flex items-center justify-between px-1.5 pb-1.5">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {label}
              </span>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => onChange(new Set())}
                  className="text-[11px] font-semibold text-[lab(36.9089%_35.0961_-85.6872)] hover:underline"
                >
                  Clear (all)
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onChange(allSelected ? new Set() : new Set(options.map((o) => o.id)))
              }
              className="w-full flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg hover:bg-gray-50 text-left border-b border-gray-100"
            >
              <span
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  allSelected
                    ? "bg-[lab(36.9089%_35.0961_-85.6872)] border-[lab(36.9089%_35.0961_-85.6872)]"
                    : "border-gray-300 bg-white",
                )}
              >
                {allSelected && <Check size={11} className="text-white" />}
              </span>
              <span className="text-[12.5px] font-semibold text-gray-700">Select all</span>
            </button>
            {options.length > 8 && (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full mb-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#bfdbfe]"
              />
            )}
            <div className="max-h-[220px] overflow-y-auto flex flex-col">
              {filtered.length === 0 && (
                <div className="px-2.5 py-3 text-[12px] text-gray-400 text-center">
                  No options
                </div>
              )}
              {filtered.map((o) => {
                const checked = selected.has(o.id);
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => toggle(o.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                        checked
                          ? "bg-[lab(36.9089%_35.0961_-85.6872)] border-[lab(36.9089%_35.0961_-85.6872)]"
                          : "border-gray-300 bg-white",
                      )}
                    >
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <span className="text-[12.5px] text-gray-700 truncate">{o.name}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "text-[10.5px] font-bold tracking-widest uppercase px-4 py-3 text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
