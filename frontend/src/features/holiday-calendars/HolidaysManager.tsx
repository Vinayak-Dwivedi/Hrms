"use client";

// Combined Holidays screen — replaces the old Add-Holiday modal.
//
// Top: a "← Back" affordance returns to the team table.
// Then an add-holiday card (same multi-row date / day / name format as before).
// Below: a table of ALL holidays in the system with edit + delete actions.
//
// All data flows from the parent (HolidayPolicyPage) via props; mutations call
// onChanged() so the parent re-fetches and pushes fresh `holidays` back down.

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  createGlobalHoliday,
  deleteGlobalHoliday,
  type GlobalHoliday,
  type HolidayCalendarSummary,
} from "./api/holiday-calendars.client";
import { cn } from "@/lib/utils";
import EditHolidayDialog from "./EditHolidayDialog";

interface AddRow {
  date: string;
  name: string;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function dayOfWeek(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return DAY_NAMES[d.getUTCDay()] ?? "";
}

function blankRow(): AddRow {
  return { date: "", name: "" };
}

export default function HolidaysManager({
  holidays,
  teams,
  onBack,
  onChanged,
}: {
  holidays: GlobalHoliday[];
  teams: HolidayCalendarSummary[];
  onBack: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<AddRow[]>([blankRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<GlobalHoliday | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const teamNames = useMemo(
    () => new Map(teams.map((t) => [t.id, t.name])),
    [teams],
  );

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  );

  const validCount = rows.filter(
    (r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.name.trim().length > 0,
  ).length;

  function updateRow(i: number, patch: Partial<AddRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
  }
  function removeRow(i: number) {
    setRows((rs) =>
      rs.length === 1 ? [blankRow()] : rs.filter((_, idx) => idx !== i),
    );
  }

  async function saveNew() {
    const valid = rows.filter(
      (r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.name.trim().length > 0,
    );
    if (valid.length === 0) {
      setError("Add at least one row with a date and a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const r of valid) {
        await createGlobalHoliday({
          date: r.date,
          name: r.name.trim(),
          type: "National",
          isHalfDay: false,
          description: null,
          scope: [],
          teamIds: [],
        });
      }
      setRows([blankRow()]);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(h: GlobalHoliday) {
    if (
      !confirm(
        `Delete "${h.name}" (${h.date})? This removes it from every team it's assigned to.`,
      )
    ) {
      return;
    }
    setBusyId(h.id);
    try {
      await deleteGlobalHoliday(h.id);
      await onChanged();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft size={15} /> Back to Teams
        </button>
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
          Holidays
        </h1>
      </div>

      {/* Add holiday card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-[lab(36.9089%_35.0961_-85.6872)]" />
          <h2 className="text-[14px] font-bold text-gray-900">Add Holiday</h2>
          <span className="text-[12px] text-gray-400">
            — add one or more, then assign to teams from the team dialog.
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 grid grid-cols-[150px_100px_1fr_auto] gap-2 items-center"
            >
              <input
                type="date"
                value={row.date}
                onChange={(e) => updateRow(idx, { date: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
              />
              <span
                className={[
                  "text-[12px] font-semibold text-center px-2 py-1.5 rounded",
                  row.date
                    ? "bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)]"
                    : "bg-gray-100 text-gray-400 italic",
                ].join(" ")}
              >
                {row.date ? dayOfWeek(row.date) : "Day"}
              </span>
              <input
                value={row.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                placeholder="Holiday name (e.g. Republic Day)"
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] focus:border-[#bfdbfe]"
              />
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={saving}
                className="text-gray-400 hover:text-rose-600 p-1 disabled:opacity-50"
                title="Remove row"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            disabled={saving}
            className="self-start inline-flex items-center gap-1.5 mt-0.5 text-[13px] font-bold text-[lab(36.9089%_35.0961_-85.6872)] hover:text-[lab(30%_38_-90)] disabled:opacity-50"
          >
            <Plus size={14} /> Add another
          </button>

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11.5px] text-gray-400">
              {validCount === 0
                ? "Fill a date and name to enable Save."
                : `${validCount} holiday${validCount === 1 ? "" : "s"} ready to save.`}
            </p>
            <button
              type="button"
              onClick={saveNew}
              disabled={saving || validCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>
          </div>
        </div>
      </section>

      {/* All holidays table */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-gray-900">All Holidays</h2>
          <span className="text-[12px] text-gray-400">
            {holidays.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <Th>Date</Th>
                <Th>Day</Th>
                <Th>Name</Th>
                <Th className="text-center">Teams</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody>
              {sortedHolidays.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-gray-400 text-[12.5px]"
                  >
                    No holidays yet. Add one above.
                  </td>
                </tr>
              )}
              {sortedHolidays.map((h) => (
                <tr
                  key={h.id}
                  className="border-t border-gray-100 hover:bg-gray-50/50"
                >
                  <Td className="font-semibold text-gray-900 whitespace-nowrap">
                    {h.date}
                    {h.isHalfDay && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Half-day
                      </span>
                    )}
                  </Td>
                  <Td className="text-gray-700">{dayOfWeek(h.date)}</Td>
                  <Td className="text-gray-900">{h.name}</Td>
                  <Td className="text-center">
                    {h.teamIds.length === 0 ? (
                      <span className="text-gray-400 italic text-[12px]">
                        Unassigned
                      </span>
                    ) : (
                      <span
                        title={h.teamIds
                          .map((id) => teamNames.get(id) ?? `#${id}`)
                          .join(", ")}
                        className="inline-block bg-blue-50 text-[lab(36.9089%_35.0961_-85.6872)] font-semibold text-[12px] px-2.5 py-0.5 rounded-full"
                      >
                        {h.teamIds.length}
                      </span>
                    )}
                  </Td>
                  <Td className="text-right pr-6">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(h)}
                        title="Edit"
                        className="text-[lab(36.9089%_35.0961_-85.6872)] hover:text-[lab(30%_38_-90)]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(h)}
                        disabled={busyId === h.id}
                        title="Delete"
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-40"
                      >
                        {busyId === h.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EditHolidayDialog
        open={editing !== null}
        holiday={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await onChanged();
        }}
      />
    </div>
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
