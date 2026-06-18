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
import { Eye, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  deleteHolidayCalendar,
  listGlobalHolidays,
  listHolidayCalendars,
  getHolidayCalendar,
  type GlobalHoliday,
  type HolidayCalendarDetail,
  type HolidayCalendarSummary,
} from "./api/holiday-calendars.client";
import { cn } from "@/lib/utils";
import AddTeamDialog from "./AddTeamDialog";
import HolidaysManager from "./HolidaysManager";
import TeamHolidaysDialog from "./TeamHolidaysDialog";

interface TeamRow extends HolidayCalendarSummary {
  departmentName: string | null;
  subDepartmentName: string | null;
  locationName: string | null;
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

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<HolidayCalendarDetail | null>(null);

  // "teams" = main team table; "holidays" = full-screen Holidays manager.
  const [view, setView] = useState<"teams" | "holidays">("teams");
  // Team whose assigned-holidays dialog is open.
  const [viewingTeam, setViewingTeam] = useState<
    { id: number; name: string; status: string } | null
  >(null);

  // Org-setup lookups (for name resolution on each row).
  const [departmentNames, setDepartmentNames] = useState<Map<number, string>>(
    new Map(),
  );
  const [subDepartmentNames, setSubDepartmentNames] = useState<
    Map<number, string>
  >(new Map());
  const [branchNames, setBranchNames] = useState<Map<number, string>>(new Map());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch teams + holidays + lookups in parallel.
      const [teamSummaries, holidayList, deptRes, subRes, branchRes] =
        await Promise.all([
          listHolidayCalendars(),
          listGlobalHolidays(),
          fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/sub-departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/branches?limit=500", { credentials: "include" }),
        ]);
      setTeams(teamSummaries);
      setHolidays(holidayList);
      if (deptRes.ok) {
        const body = (await deptRes.json()) as { data: Array<{ id: number; name: string }> };
        setDepartmentNames(new Map(body.data.map((r) => [r.id, r.name])));
      }
      if (subRes.ok) {
        const body = (await subRes.json()) as { data: Array<{ id: number; name: string }> };
        setSubDepartmentNames(new Map(body.data.map((r) => [r.id, r.name])));
      }
      if (branchRes.ok) {
        const body = (await branchRes.json()) as { data: Array<{ id: number; name: string }> };
        setBranchNames(new Map(body.data.map((r) => [r.id, r.name])));
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
      const deptIds: number[] = [];
      const subDeptIds: number[] = [];
      const branchIds: number[] = [];
      let hasCompany = false;
      const holidayCount = detail?.holidayIds.length ?? t.holidayCount ?? 0;
      if (detail) {
        for (const s of detail.scope) {
          if (s.scopeType === "Company") hasCompany = true;
          else if (s.scopeType === "Department" && s.scopeId != null) deptIds.push(s.scopeId);
          else if (s.scopeType === "SubDepartment" && s.scopeId != null) subDeptIds.push(s.scopeId);
          else if (s.scopeType === "Branch" && s.scopeId != null) branchIds.push(s.scopeId);
        }
      }
      const joinNames = (ids: number[], names: Map<number, string>): string | null =>
        ids.length === 0 ? null : ids.map((id) => names.get(id) ?? `#${id}`).join(", ");
      return {
        ...t,
        departmentName: hasCompany ? "All" : joinNames(deptIds, departmentNames),
        subDepartmentName: hasCompany ? "All" : joinNames(subDeptIds, subDepartmentNames),
        locationName: hasCompany ? "All locations" : joinNames(branchIds, branchNames),
        holidayCount,
      };
    });
  }, [teams, teamDetails, departmentNames, subDepartmentNames, branchNames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.departmentName?.toLowerCase().includes(q) ?? false) ||
        (r.subDepartmentName?.toLowerCase().includes(q) ?? false) ||
        (r.locationName?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

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
      

      {/* Search left, actions right — clean single row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => setView("holidays")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold text-[lab(36.9089%_35.0961_-85.6872)] bg-white border border-gray-200 hover:border-[lab(36.9089%_35.0961_-85.6872)] hover:bg-blue-50/60 shadow-sm transition-colors"
          >
            <Plus size={14} /> Add Holiday
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTeam(null);
              setTeamDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] shadow-sm hover:shadow-md transition-shadow"
          >
            <Plus size={14} /> Add Policy
          </button>
        </div>
      </div>

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
                <Th>Location</Th>
                <Th>Department</Th>
                <Th>Sub-Department</Th>
                <Th className="text-center">Holidays</Th>
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
                      className="font-semibold text-gray-900 hover:text-[lab(30%_38_-90)] hover:underline text-left"
                    >
                      {r.name}
                    </button>
                  </Td>
                  <Td className="text-gray-700">
                    {r.locationName ?? <span className="text-gray-400 italic">—</span>}
                  </Td>
                  <Td className="text-gray-700">
                    {r.departmentName ?? <span className="text-gray-400 italic">—</span>}
                  </Td>
                  <Td className="text-gray-700">
                    {r.subDepartmentName ?? <span className="text-gray-400 italic">—</span>}
                  </Td>
                  <Td className="text-center">
                    <span className="inline-block bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)] font-semibold text-[12px] px-2.5 py-0.5 rounded-full">
                      {r.holidayCount}
                    </span>
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
                        className="text-[lab(36.9089%_35.0961_-85.6872)] hover:text-[lab(30%_38_-90)]"
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

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}
