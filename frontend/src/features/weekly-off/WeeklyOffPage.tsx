"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, ChevronRight, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteWeeklyOff,
  getWeeklyOff,
  listWeeklyOff,
  updateWeeklyOff,
  type AlternateDayRule,
  type DayName,
  type FixedSettings,
  type RotationalSettings,
  type WeeklyOffDetail,
  type WeeklyOffSummary,
} from "./api/weekly-off.client";
import { getLeaveGrid, type LeaveGridData } from "@/features/leave-policy/api/leave-plan-grid.client";
import { cn } from "@/lib/utils";
import RosterDialog from "./RosterDialog";
import WeeklyOffDialog from "./WeeklyOffDialog";

type Assignment = { branch: string; department: string; subDepartment: string | null };

type DialogTarget = WeeklyOffSummary | "new" | null;

const SHORT: Record<DayName, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

// Human summary of a config's off-days.
function offDaysSummary(d: WeeklyOffDetail): string {
  if (d.mode === "Roster") return "Per roster";
  if (d.mode === "Rotational") {
    const s = d.settings as RotationalSettings;
    return `Rotational · ${s.cycleWeeks ?? s.pattern?.length ?? 1}-week cycle`;
  }
  const s = d.settings as FixedSettings;
  const parts = (s.days ?? []).map((x) => SHORT[x]);
  for (const r of (s.alternateDays ?? []) as AlternateDayRule[]) {
    const wk = [...r.weeks].sort((a, b) => a - b).join(",");
    const label = wk === "1,3" ? "1st/3rd" : wk === "2,4" ? "2nd/4th" : `wk ${wk}`;
    parts.push(`${label} ${SHORT[r.day]}`);
  }
  return parts.length ? parts.join(", ") : "—";
}

function getWeeklyOffAssignments(configId: number, grid: LeaveGridData): Assignment[] {
  const result: Assignment[] = [];
  for (const loc of grid.tree) {
    for (const dept of loc.departments) {
      const deptKey = `B${loc.branchId}:D${dept.departmentId}`;
      const deptCell = grid.cells[deptKey];
      if (deptCell?.weeklyOffConfigId === configId) {
        result.push({ branch: loc.branchName, department: dept.departmentName, subDepartment: null });
      }
      for (const sub of dept.subDepartments) {
        const subKey = `B${loc.branchId}:D${dept.departmentId}:S${sub.id}`;
        const subCell = grid.cells[subKey];
        if (subCell?.weeklyOffConfigId === configId) {
          result.push({ branch: loc.branchName, department: dept.departmentName, subDepartment: sub.name });
        }
      }
    }
  }
  return result;
}

export default function WeeklyOffPage() {
  const [items, setItems] = useState<WeeklyOffSummary[]>([]);
  const [details, setDetails] = useState<Map<number, WeeklyOffDetail>>(new Map());
  const [leaveGrid, setLeaveGrid] = useState<LeaveGridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogTarget>(null);
  const [rosterFor, setRosterFor] = useState<WeeklyOffSummary | null>(null);
  const [scopeDialog, setScopeDialog] = useState<{ name: string; assignments: Assignment[] } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, grid] = await Promise.all([listWeeklyOff(), getLeaveGrid().catch(() => null)]);
      setItems(list);
      setLeaveGrid(grid);
      const full = await Promise.all(list.map((c) => getWeeklyOff(c.id).catch(() => null)));
      const m = new Map<number, WeeklyOffDetail>();
      for (const d of full) if (d) m.set(d.id, d);
      setDetails(m);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function togglePublish(c: WeeklyOffSummary) {
    const next = c.status === "Published" ? "Draft" : "Published";
    try {
      await updateWeeklyOff(c.id, { status: next });
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleDelete(c: WeeklyOffSummary) {
    if (!confirm(`Delete "${c.name}"? Scope assignments will also be removed.`)) return;
    try {
      await deleteWeeklyOff(c.id);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const rows = useMemo(
    () => items.map((c) => ({
      c,
      d: details.get(c.id),
      assignments: leaveGrid ? getWeeklyOffAssignments(c.id, leaveGrid) : null,
    })),
    [items, details, leaveGrid],
  );

  return (
    <div className="flex flex-col gap-5 pb-10">
     

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDialog("new")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] shadow-sm hover:shadow-md transition-shadow"
        >
          <Plus size={14} /> New Configuration
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th>Name</Th>
                <Th>Mode</Th>
                <Th>Off Days</Th>
                <Th>Applies To</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-[12.5px]">
                    No configurations yet. Click "New Configuration".
                  </td>
                </tr>
              )}
              {rows.map(({ c, d, assignments }) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <Td>
                    <button
                      type="button"
                      onClick={() => setDialog(c)}
                      className="font-semibold text-gray-900 hover:text-[lab(30%_38_-90)] hover:underline text-left"
                    >
                      {c.name}
                    </button>
                    {c.description && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[260px]">{c.description}</p>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-block text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)]">
                      {c.mode}
                    </span>
                  </Td>
                  <Td className="text-gray-700">{d ? offDaysSummary(d) : "…"}</Td>
                  <Td className="text-gray-700">
                    {assignments === null ? (
                      "…"
                    ) : assignments.length === 0 ? (
                      <span className="text-gray-400 italic">Unassigned</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setScopeDialog({ name: c.name, assignments })}
                        className="inline-flex items-center gap-1 text-[lab(36.9089%_35.0961_-85.6872)] hover:underline text-left"
                      >
                        {assignments.length === 1 ? "1 group" : `${assignments.length} groups`}
                        <ChevronRight size={12} className="shrink-0 opacity-60" />
                      </button>
                    )}
                  </Td>
                  <Td className="text-center">
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td className="text-right pr-6">
                    <div className="inline-flex items-center gap-2">
                      {c.mode === "Roster" && (
                        <button
                          type="button"
                          onClick={() => setRosterFor(c)}
                          title="Manage roster"
                          className="text-[lab(36.9089%_35.0961_-85.6872)] hover:text-[lab(30%_38_-90)]"
                        >
                          <CalendarRange size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePublish(c)}
                        title={c.status === "Published" ? "Unpublish" : "Publish"}
                        className={
                          c.status === "Published"
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        }
                      >
                        {c.status === "Published" ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog(c)}
                        title="Edit"
                        className="text-[lab(36.9089%_35.0961_-85.6872)] hover:text-[lab(30%_38_-90)]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        title="Delete"
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="px-5 py-3 text-[12px] text-gray-500 border-t border-gray-100">
            {rows.length} configuration{rows.length === 1 ? "" : "s"}
          </div>
        )}
      </section>

      {dialog && (
        <WeeklyOffDialog
          target={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}

      {rosterFor && <RosterDialog config={rosterFor} onClose={() => setRosterFor(null)} />}

      {scopeDialog && (
        <ScopeViewDialog name={scopeDialog.name} assignments={scopeDialog.assignments} onClose={() => setScopeDialog(null)} />
      )}
    </div>
  );
}

function ScopeViewDialog({
  name,
  assignments,
  onClose,
}: {
  name: string;
  assignments: Assignment[];
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">
            Weekly Off
          </p>
          <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">
            {name}
          </h2>
          <p className="text-[12px] text-gray-500 mt-1">
            Applied to {assignments.length === 1 ? "1 group" : `${assignments.length} groups`} in Leave Policy:
          </p>
        </div>

        {/* Assignments list */}
        <div className="px-5 py-3 max-h-72 overflow-y-auto">
          <ul className="divide-y divide-gray-100">
            {assignments.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1" />
                <div className="min-w-0 text-[13px] text-gray-800">
                  <span className="font-medium capitalize">{a.branch}</span>
                  <span className="text-gray-400 mx-1">›</span>
                  <span>{a.department}</span>
                  {a.subDepartment && (
                    <>
                      <span className="text-gray-400 mx-1">›</span>
                      <span>{a.subDepartment}</span>
                    </>
                  )}
                  {!a.subDepartment && (
                    <span className="text-[11px] text-gray-400 ml-1.5">(dept-wide)</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-medium text-gray-700 hover:text-gray-900 px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Draft: "bg-amber-50 text-amber-700 border-amber-200",
    Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Archived: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={[
        "inline-block text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border",
        map[status] ?? "bg-gray-100 text-gray-600 border-gray-200",
      ].join(" ")}
    >
      {status}
    </span>
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
