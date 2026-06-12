"use client";

// Holiday Policy — table-driven admin view (mirrors the Location page).
//
// Top: search + filter row, then two action buttons:
//   - Add Team     → AddTeamDialog (name + dept + sub-dept + holiday checklist)
//   - Add Holiday  → AddHolidayDialog (multi-row date/day/name)
//
// Main table: one row per Team with NAME / DEPARTMENT / SUB-DEPARTMENT /
// HOLIDAYS / STATUS / ACTION columns.
//
// Data model (unchanged from earlier session):
//   Teams (= holiday_calendars) carry scope rows.
//   Holidays are first-class rows; linked to teams via holiday_team_links.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
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
import AddHolidayDialog from "./AddHolidayDialog";

interface TeamRow extends HolidayCalendarSummary {
  departmentName: string | null;
  subDepartmentName: string | null;
  holidayCount: number;
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
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);

  // Org-setup lookups (for name resolution on each row).
  const [departmentNames, setDepartmentNames] = useState<Map<number, string>>(
    new Map(),
  );
  const [designationNames, setDesignationNames] = useState<Map<number, string>>(
    new Map(),
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch teams + holidays + lookups in parallel.
      const [teamSummaries, holidayList, deptRes, desigRes] = await Promise.all([
        listHolidayCalendars(),
        listGlobalHolidays(),
        fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
        fetch("/api/hrms/designations?limit=500", { credentials: "include" }),
      ]);
      setTeams(teamSummaries);
      setHolidays(holidayList);
      if (deptRes.ok) {
        const body = (await deptRes.json()) as { data: Array<{ id: number; name: string }> };
        setDepartmentNames(new Map(body.data.map((r) => [r.id, r.name])));
      }
      if (desigRes.ok) {
        const body = (await desigRes.json()) as { data: Array<{ id: number; name: string }> };
        setDesignationNames(new Map(body.data.map((r) => [r.id, r.name])));
      }

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
      let deptId: number | null = null;
      let subDeptId: number | null = null;
      let holidayCount = detail?.holidayIds.length ?? t.holidayCount ?? 0;
      if (detail) {
        for (const s of detail.scope) {
          if (s.scopeType === "Department" && deptId == null) deptId = s.scopeId;
          if (s.scopeType === "Designation" && subDeptId == null)
            subDeptId = s.scopeId;
        }
      }
      return {
        ...t,
        departmentName: deptId != null ? departmentNames.get(deptId) ?? `#${deptId}` : null,
        subDepartmentName:
          subDeptId != null ? designationNames.get(subDeptId) ?? `#${subDeptId}` : null,
        holidayCount,
      };
    });
  }, [teams, teamDetails, departmentNames, designationNames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.departmentName?.toLowerCase().includes(q) ?? false) ||
        (r.subDepartmentName?.toLowerCase().includes(q) ?? false)
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

  return (
    <div className="flex flex-col gap-5 pb-10">
      <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
        Holiday Policy
      </h1>

      {/* Search + filter card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Search">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
              />
            </div>
          </Field>
          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
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
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-600 hover:text-gray-900"
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHolidayDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-[#FF014F] bg-white border border-[#FF014F] hover:bg-pink-50"
            >
              <Plus size={13} /> Add Holiday
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTeam(null);
                setTeamDialogOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
            >
              <Plus size={13} /> Add Team
            </button>
          </div>
        </div>
      </section>

      {/* Errors */}
      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Team table */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th>Name</Th>
                <Th>Department</Th>
                <Th>Sub-Department</Th>
                <Th className="text-center">Holidays</Th>
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

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-[12.5px]">
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
                  className="border-t border-gray-100 hover:bg-gray-50/50"
                >
                  <Td className="font-semibold text-gray-900">{r.name}</Td>
                  <Td className="text-gray-700">
                    {r.departmentName ?? <span className="text-gray-400 italic">—</span>}
                  </Td>
                  <Td className="text-gray-700">
                    {r.subDepartmentName ?? <span className="text-gray-400 italic">—</span>}
                  </Td>
                  <Td className="text-center">
                    <span className="inline-block bg-pink-50 text-[#be185d] font-semibold text-[12px] px-2.5 py-0.5 rounded-full">
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
                        onClick={() => {
                          const d = teamDetails.get(r.id);
                          if (d) {
                            setEditingTeam(d);
                            setTeamDialogOpen(true);
                          }
                        }}
                        title="View"
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        <Eye size={14} />
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
                        className="text-[#FF014F] hover:text-[#eb0249]"
                      >
                        <Pencil size={14} />
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
          <div className="px-5 py-3 text-[12px] text-gray-500 border-t border-gray-100">
            Showing 1 to {filtered.length} of {filtered.length} result
            {filtered.length === 1 ? "" : "s"}
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

      <AddHolidayDialog
        open={holidayDialogOpen}
        onClose={() => setHolidayDialogOpen(false)}
        onSaved={() => {
          setHolidayDialogOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

// ─── tiny components ──────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">
        {label}
      </label>
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
        "text-[10.5px] font-bold tracking-widest uppercase px-4 py-3 text-left",
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
