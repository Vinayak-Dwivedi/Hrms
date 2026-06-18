"use client";

// Holiday Policy — table-driven admin view (mirrors the Location page).
//
// Top: search + filter row, then two action buttons:
//   - Add Team     → AddTeamDialog (name + dept + sub-dept + holiday checklist)
//   - Add Holiday  → AddHolidayDialog (multi-row date/day/name)
//
// Main table: one row per Team with NAME / LOCATION / DEPARTMENT /
// SUB-DEPARTMENT / HOLIDAYS / STATUS / ACTION columns.
//
// Data model (unchanged from earlier session):
//   Teams (= holiday_calendars) carry scope rows.
//   Holidays are first-class rows; linked to teams via holiday_team_links.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Pencil, PlusCircle, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  employeeBtnOutlineSmClass,
  employeeBtnSmClass,
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeIconMd,
  employeeIconPen,
  employeeIconSm,
  employeeIconXs,
  employeeInputClass,
  employeeListResetBtnClass,
  employeeListTableEmptyClass,
  employeeListTableFooterClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
  employeeListTableSummaryClass,
  employeeSelectClass,
  employeeViewIconBtnClass,
  holidayCountBadgeClass,
  holidayNameLinkClass,
} from "./holiday-calendars-theme";
import {
  deleteHolidayCalendar,
  listGlobalHolidays,
  listHolidayCalendars,
  getHolidayCalendar,
  type GlobalHoliday,
  type HolidayCalendarDetail,
  type HolidayCalendarSummary,
} from "./api/holiday-calendars.client";
import AddTeamDialog from "./AddTeamDialog";
import HolidaysManager from "./HolidaysManager";
import TeamHolidaysDialog from "./TeamHolidaysDialog";
import { scopeToLabels } from "./scope-labels";
import { fetchDepartmentsList } from "@/features/departments/api/departments.client";
import { fetchBranches } from "@/features/employees/api/employees.client";
import { API_BASE } from "@/lib/hrms-client";

interface TeamRow extends HolidayCalendarSummary {
  locationLabel: string | null;
  departmentLabel: string | null;
  subDepartmentLabel: string | null;
  holidayCount: number;
}

async function fetchSubDepartmentNames(): Promise<Map<number, string>> {
  const res = await fetch(`${API_BASE}/api/hrms/sub-departments?limit=500`, {
    credentials: "include",
  });
  if (!res.ok) return new Map();
  const body = (await res.json()) as {
    data: Array<{ id: number; name: string }>;
  };
  const map = new Map<number, string>();
  for (const row of body.data ?? []) {
    map.set(row.id, row.name);
  }
  return map;
}

export default function HolidayPolicyPage() {
  const [teams, setTeams] = useState<HolidayCalendarSummary[]>([]);
  const [teamDetails, setTeamDetails] = useState<
    Map<number, HolidayCalendarDetail>
  >(new Map());
  const [holidays, setHolidays] = useState<GlobalHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<HolidayCalendarDetail | null>(null);

  // "teams" = main team table; "holidays" = full-screen Holidays manager.
  const [view, setView] = useState<"teams" | "holidays">("teams");
  // Team whose assigned-holidays dialog is open.
  const [viewingTeam, setViewingTeam] = useState<
    { id: number; name: string; status: string } | null
  >(null);

  const [branchNames, setBranchNames] = useState<Map<number, string>>(
    new Map(),
  );
  const [departmentNames, setDepartmentNames] = useState<Map<number, string>>(
    new Map(),
  );
  const [subDepartmentNames, setSubDepartmentNames] = useState<
    Map<number, string>
  >(new Map());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamSummaries, holidayList, branches, deptList, subNames] =
        await Promise.all([
          listHolidayCalendars(),
          listGlobalHolidays(),
          fetchBranches(),
          fetchDepartmentsList(),
          fetchSubDepartmentNames(),
        ]);
      setTeams(teamSummaries);
      setHolidays(holidayList);

      const brNames = new Map<number, string>();
      for (const b of branches) brNames.set(b.id, b.name);
      setBranchNames(brNames);

      const deptNames = new Map<number, string>();
      for (const d of deptList) deptNames.set(d.id, d.name);
      setDepartmentNames(deptNames);
      setSubDepartmentNames(subNames);

      // Hydrate team details for the table (need scope + holidayIds per row).
      const details = await Promise.all(
        teamSummaries.map((t) =>
          getHolidayCalendar(t.id).catch(() => null),
        ),
      );
      const map = new Map<number, HolidayCalendarDetail>();
      for (const d of details) {
        if (d) map.set(d.id, d);
      }
      setTeamDetails(map);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Compose table rows from team summaries + their details.
  const rows = useMemo<TeamRow[]>(() => {
    return teams.map((t) => {
      const detail = teamDetails.get(t.id);
      const holidayCount = detail?.holidayIds.length ?? t.holidayCount ?? 0;
      const labels = detail
        ? scopeToLabels(
            detail.scope,
            branchNames,
            departmentNames,
            subDepartmentNames,
          )
        : {
            locationLabel: null,
            departmentLabel: null,
            subDepartmentLabel: null,
          };
      return {
        ...t,
        ...labels,
        holidayCount,
      };
    });
  }, [teams, teamDetails, branchNames, departmentNames, subDepartmentNames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.locationLabel?.toLowerCase().includes(q) ?? false) ||
        (r.departmentLabel?.toLowerCase().includes(q) ?? false) ||
        (r.subDepartmentLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, statusFilter]);

  async function handleDelete(team: TeamRow) {
    if (!confirm(`Delete team "${team.name}"? Holiday links will be removed.`)) {
      return;
    }
    try {
      await deleteHolidayCalendar(team.id);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
  }

  // Full-screen Holidays manager (Add Holiday + all-holidays table).
  if (view === "holidays") {
    return (
      <HolidaysManager
        holidays={holidays}
        teams={teams}
        onBack={() => setView("teams")}
        onChanged={refresh}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
        Holiday Policy
      </h1>

      {/* Search + filter card */}
      <section className={`${employeeCardClass} p-5`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Search">
            <div className="relative">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${employeeIconXs} text-slate-400`}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams…"
                className={`${employeeInputClass} pl-9`}
              />
            </div>
          </Field>
          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={employeeSelectClass}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={resetFilters}
            className={employeeListResetBtnClass}
          >
            <RotateCcw className={employeeIconXs} /> Reset Filters
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("holidays")}
              className={employeeBtnOutlineSmClass}
            >
              <PlusCircle className={employeeIconSm} /> Add Holiday
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTeam(null);
                setTeamDialogOpen(true);
              }}
              className={employeeBtnSmClass}
            >
              <PlusCircle className={employeeIconSm} /> Add Team
            </button>
          </div>
        </div>
      </section>

      {/* Errors */}
      {error && (
        <div className={employeeErrorBannerClass}>
          {error}
        </div>
      )}

      {/* Team table */}
      <section className={`${employeeCardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th>Name</Th>
                <Th>Location</Th>
                <Th>Department</Th>
                <Th>Sub-Department</Th>
                <Th className="text-center">Holidays</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={employeeListTableEmptyClass}>
                    <Loader2 className={`${employeeIconSm} animate-spin inline mr-2`} />
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className={employeeListTableEmptyClass}>
                    No teams.{" "}
                    {teams.length === 0
                      ? 'Click "Add Team" to create one.'
                      : "Try adjusting the filters."}
                  </td>
                </tr>
              )}

              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={employeeListTableRowClass}
                >
                  <Td>
                    <button
                      type="button"
                      onClick={() =>
                        setViewingTeam({
                          id: r.id,
                          name: r.name,
                          status: r.status,
                        })
                      }
                      className={holidayNameLinkClass}
                    >
                      {r.name}
                    </button>
                  </Td>
                  <Td className="text-gray-700 max-w-[160px]">
                    <ScopeCell label={r.locationLabel} />
                  </Td>
                  <Td className="text-gray-700 max-w-[160px]">
                    <ScopeCell label={r.departmentLabel} />
                  </Td>
                  <Td className="text-gray-700 max-w-[160px]">
                    <ScopeCell label={r.subDepartmentLabel} />
                  </Td>
                  <Td className="text-center">
                    <span className={holidayCountBadgeClass}>
                      {r.holidayCount}
                    </span>
                  </Td>
                  <Td className="text-center">
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td className="text-right pr-6">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingTeam({
                            id: r.id,
                            name: r.name,
                            status: r.status,
                          })
                        }
                        title="View holidays"
                        className={employeeViewIconBtnClass}
                      >
                        <Eye className={employeeIconMd} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = teamDetails.get(r.id);
                          if (d) {
                            setEditingTeam(d);
                            setTeamDialogOpen(true);
                          }
                        }}
                        title="Edit"
                        className={employeeEditIconBtnClass}
                      >
                        <Pencil className={employeeIconPen} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
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

        {filtered.length > 0 && (
          <div className={employeeListTableFooterClass}>
            <p className={employeeListTableSummaryClass}>
              Showing 1 to {filtered.length} of {filtered.length} result
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </section>

      {/* Dialogs */}
      <AddTeamDialog
        open={teamDialogOpen}
        initial={editingTeam}
        availableHolidays={holidays}
        onClose={() => {
          setTeamDialogOpen(false);
          setEditingTeam(null);
        }}
        onSaved={() => {
          setTeamDialogOpen(false);
          setEditingTeam(null);
          refresh();
        }}
      />

      <TeamHolidaysDialog
        team={viewingTeam}
        holidays={holidays}
        onClose={() => setViewingTeam(null)}
        onChanged={refresh}
      />
    </div>
  );
}

// ─── tiny components ──────────────────────────────────────────────────────

function ScopeCell({ label }: { label: string | null }) {
  if (label == null) {
    return <span className="text-gray-400 italic">—</span>;
  }
  return (
    <span className="block truncate" title={label}>
      {label}
    </span>
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

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        employeeListTableHeadClass,
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={["px-4 py-3 align-middle", className ?? ""].join(" ")}>
      {children}
    </td>
  );
}
