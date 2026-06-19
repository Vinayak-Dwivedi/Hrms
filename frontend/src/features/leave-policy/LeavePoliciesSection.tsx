"use client";

// Leave Policies — a scope-first allocation grid. Rows are the
// Location → Department → Sub-department tree (Location & Department cells are
// merged across their children). Columns are the active leave types (dynamic
// from the DB) with inline annual-quota inputs, plus a Week Off dropdown
// (dynamic from weekly-off configs). Each org leaf maps to one grid-managed
// leave_plan; editing a row upserts it and reflows employee balances. A row
// with any allocation or a week-off set is "live" and gets a premium tint.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { employeeCardClass, employeeListResetBtnClass } from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";
import {
  getLeaveGrid,
  scopeKeyOf,
  upsertLeaveGridCell,
  type LeaveGridData,
} from "./api/leave-plan-grid.client";

interface LeafRow {
  key: string;
  branchId: number;
  branchName: string;
  departmentId: number;
  departmentName: string;
  subDepartmentId: number | null;
  subDepartmentName: string | null;
  isFirstOfLocation: boolean;
  locationRowSpan: number;
  isFirstOfDepartment: boolean;
  departmentRowSpan: number;
}

interface RowState {
  alloc: Record<number, string>; // leaveTypeId → quota (string for free typing)
  weeklyOffConfigId: number | null;
  saving: boolean;
}

function buildLeafRows(tree: LeaveGridData["tree"]): LeafRow[] {
  const rows: LeafRow[] = [];
  for (const loc of tree) {
    const locTotal = loc.departments.reduce(
      (acc, d) => acc + Math.max(1, d.subDepartments.length),
      0,
    );
    let firstOfLoc = true;
    for (const dept of loc.departments) {
      const leaves =
        dept.subDepartments.length > 0
          ? dept.subDepartments.map((s) => ({ id: s.id, name: s.name }))
          : [null];
      let firstOfDept = true;
      for (const sub of leaves) {
        rows.push({
          key: scopeKeyOf(loc.branchId, dept.departmentId, sub?.id ?? null),
          branchId: loc.branchId,
          branchName: loc.branchName,
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          subDepartmentId: sub?.id ?? null,
          subDepartmentName: sub?.name ?? null,
          isFirstOfLocation: firstOfLoc,
          locationRowSpan: locTotal,
          isFirstOfDepartment: firstOfDept,
          departmentRowSpan: leaves.length,
        });
        firstOfLoc = false;
        firstOfDept = false;
      }
    }
  }
  return rows;
}

function initRowStates(data: LeaveGridData): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const [key, cell] of Object.entries(data.cells)) {
    const alloc: Record<number, string> = {};
    for (const [tid, q] of Object.entries(cell.allocations)) {
      if (Number(q) > 0) alloc[Number(tid)] = String(q);
    }
    out[key] = {
      alloc,
      weeklyOffConfigId: cell.weeklyOffConfigId,
      saving: false,
    };
  }
  return out;
}

function rowFilled(state: RowState | undefined): boolean {
  if (!state) return false;
  if (state.weeklyOffConfigId != null) return true;
  return Object.values(state.alloc).some((v) => Number(v) > 0);
}

export default function LeavePoliciesSection() {
  const [data, setData] = useState<LeaveGridData | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getLeaveGrid();
      setData(d);
      setRows(initRowStates(d));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const leafRows = useMemo(
    () => (data ? buildLeafRows(data.tree) : []),
    [data],
  );

  function stateFor(key: string): RowState {
    return rows[key] ?? { alloc: {}, weeklyOffConfigId: null, saving: false };
  }

  function patchRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [key]: { ...stateForFrom(prev, key), ...patch },
    }));
  }
  function stateForFrom(
    map: Record<string, RowState>,
    key: string,
  ): RowState {
    return map[key] ?? { alloc: {}, weeklyOffConfigId: null, saving: false };
  }

  // Persist a whole leaf row (all leave-type allocations + week-off).
  const saveRow = useCallback(
    async (leaf: LeafRow) => {
      if (!data) return;
      const current = rows[leaf.key] ?? {
        alloc: {},
        weeklyOffConfigId: null,
        saving: false,
      };
      patchRow(leaf.key, { saving: true });
      try {
        const result = await upsertLeaveGridCell({
          branchId: leaf.branchId,
          departmentId: leaf.departmentId,
          subDepartmentId: leaf.subDepartmentId,
          weeklyOffConfigId: current.weeklyOffConfigId,
          allocations: data.leaveTypes.map((t) => ({
            leaveTypeId: t.id,
            annualQuota: Number(current.alloc[t.id] ?? 0) || 0,
          })),
        });
        patchRow(leaf.key, { saving: false });
        if (result.balancesSeeded > 0) {
          toast.success(
            `Saved · ${result.balancesSeeded} employee balance${result.balancesSeeded === 1 ? "" : "s"} updated`,
          );
        } else {
          toast.success("Saved");
        }
      } catch (e) {
        patchRow(leaf.key, { saving: false });
        toast.error(`Save failed: ${(e as Error).message}`);
      }
    },
    [data, rows],
  );

  const leaveTypes = data?.leaveTypes ?? [];
  const weeklyOffs = data?.weeklyOffs ?? [];
  const colCount = 3 + leaveTypes.length + 1;

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header card */}
    

      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Grid */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th className="min-w-[140px]">Location</Th>
                <Th className="min-w-[150px]">Department</Th>
                <Th className="min-w-[150px]">Sub-Department</Th>
                {leaveTypes.map((t) => (
                  <Th key={t.id} className="text-center min-w-[78px]" title={t.name}>
                    {t.code}
                  </Th>
                ))}
                <Th className="min-w-[160px]">Week Off</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={colCount} className="text-center py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" />
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && leafRows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="text-center py-10 text-gray-400 text-[12.5px]">
                    No locations with departments found. Set up the org hierarchy
                    (Location → Department) first.
                  </td>
                </tr>
              )}

              {!loading &&
                leafRows.map((leaf) => {
                  const st = stateFor(leaf.key);
                  const filled = rowFilled(st);
                  const leafCell = cn(
                    "px-3 py-2.5 align-middle border-t border-gray-100 transition-colors",
                    filled
                      ? "bg-[lab(96.5%_3.5_-12)]"
                      : "bg-white",
                  );
                  return (
                    <tr key={leaf.key} className="group">
                      {leaf.isFirstOfLocation && (
                        <td
                          rowSpan={leaf.locationRowSpan}
                          className="px-3 py-2.5 align-top border-t border-gray-200 bg-gray-50/40 font-semibold text-gray-800"
                        >
                          {leaf.branchName}
                        </td>
                      )}
                      {leaf.isFirstOfDepartment && (
                        <td
                          rowSpan={leaf.departmentRowSpan}
                          className="px-3 py-2.5 align-top border-t border-gray-200 bg-gray-50/20 font-medium text-gray-700"
                        >
                          {leaf.departmentName}
                        </td>
                      )}
                      {/* Sub-department (leaf identity) */}
                      <td
                        className={cn(
                          leafCell,
                          filled &&
                            "border-l-2 border-l-[lab(36.9089%_35.0961_-85.6872)]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              leaf.subDepartmentName
                                ? "text-gray-800"
                                : "text-gray-400 italic"
                            }
                          >
                            {leaf.subDepartmentName ?? "All (dept-wide)"}
                          </span>
                          {st.saving && (
                            <Loader2
                              size={12}
                              className="animate-spin text-[lab(36.9089%_35.0961_-85.6872)] shrink-0"
                            />
                          )}
                        </div>
                      </td>
                      {/* Leave-type allocation inputs */}
                      {leaveTypes.map((t) => (
                        <td key={t.id} className={cn(leafCell, "text-center")}>
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label={`${t.code} days for ${leaf.subDepartmentName ?? leaf.departmentName}`}
                            value={st.alloc[t.id] ?? ""}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d.]/g, "");
                              setRows((prev) => {
                                const cur = stateForFrom(prev, leaf.key);
                                return {
                                  ...prev,
                                  [leaf.key]: {
                                    ...cur,
                                    alloc: { ...cur.alloc, [t.id]: raw },
                                  },
                                };
                              });
                            }}
                            onBlur={() => saveRow(leaf)}
                            className="w-[58px] text-center tabular-nums rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
                          />
                        </td>
                      ))}
                      {/* Week off */}
                      <td className={leafCell}>
                        <select
                          value={st.weeklyOffConfigId ?? ""}
                          onChange={(e) => {
                            const v =
                              e.target.value === "" ? null : Number(e.target.value);
                            setRows((prev) => {
                              const cur = stateForFrom(prev, leaf.key);
                              return {
                                ...prev,
                                [leaf.key]: { ...cur, weeklyOffConfigId: v },
                              };
                            });
                            // Save immediately on selection (use fresh value).
                            setTimeout(() => saveRowWith(leaf, v), 0);
                          }}
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[12.5px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
                        >
                          <option value="">None</option>
                          {weeklyOffs.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!loading && leafRows.length > 0 && (
          <div className="px-5 py-3 text-[12px] text-gray-500 border-t border-gray-100">
            {leafRows.length} allocation row{leafRows.length === 1 ? "" : "s"} ·{" "}
            {leaveTypes.length} leave type{leaveTypes.length === 1 ? "" : "s"}
          </div>
        )}
      </section>
    </div>
  );

  // Save a row using an explicit week-off value (avoids the state-update race
  // when saving right after selecting from the dropdown).
  function saveRowWith(leaf: LeafRow, weeklyOffConfigId: number | null) {
    if (!data) return;
    const current = rows[leaf.key] ?? {
      alloc: {},
      weeklyOffConfigId: null,
      saving: false,
    };
    patchRow(leaf.key, { saving: true });
    upsertLeaveGridCell({
      branchId: leaf.branchId,
      departmentId: leaf.departmentId,
      subDepartmentId: leaf.subDepartmentId,
      weeklyOffConfigId,
      allocations: data.leaveTypes.map((t) => ({
        leaveTypeId: t.id,
        annualQuota: Number(current.alloc[t.id] ?? 0) || 0,
      })),
    })
      .then((result) => {
        patchRow(leaf.key, { saving: false });
        toast.success(
          result.balancesSeeded > 0
            ? `Saved · ${result.balancesSeeded} employee balance${result.balancesSeeded === 1 ? "" : "s"} updated`
            : "Saved",
        );
      })
      .catch((e: unknown) => {
        patchRow(leaf.key, { saving: false });
        toast.error(`Save failed: ${(e as Error).message}`);
      });
  }
}

function Th({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <th
      title={title}
      className={cn(
        "text-[10.5px] font-bold tracking-widest uppercase px-3 py-3 text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}
