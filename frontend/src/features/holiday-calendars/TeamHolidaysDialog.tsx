"use client";

// Team-holidays dialog. Opens when a team row is clicked. Lists every holiday
// assigned to that team (via holiday_team_links) with per-row Edit and Unlink.
//
//   Edit   → EditHolidayDialog (PATCHes the holiday itself).
//   Unlink → PATCH the holiday's teamIds, dropping just this team. The holiday
//            stays in the global Holidays table and on any other teams.
//
// Holiday data comes from the parent's `holidays` list (single source of
// truth); mutations call onChanged() so the parent refreshes and re-feeds us.

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Loader2, Pencil, Unlink, X } from "lucide-react";
import {
  updateGlobalHoliday,
  type GlobalHoliday,
} from "./api/holiday-calendars.client";
import EditHolidayDialog from "./EditHolidayDialog";
import {
  employeeEditIconBtnClass,
  employeeIconPen,
  employeeListTableEmptyClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
  employeeModalTitleClass,
  holidayIconWrapClass,
  holidayModalCancelClass,
} from "./holiday-calendars-theme";

const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function dayOfWeek(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return DAY_NAMES[d.getUTCDay()] ?? "";
}

export default function TeamHolidaysDialog({
  team,
  holidays,
  onClose,
  onChanged,
}: {
  team: { id: number; name: string; status: string } | null;
  holidays: GlobalHoliday[];
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<GlobalHoliday | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const teamHolidays = useMemo(() => {
    if (!team) return [];
    return holidays
      .filter((h) => h.teamIds.includes(team.id))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, team]);

  if (!team) return null;

  async function unlink(h: GlobalHoliday) {
    if (!team) return;
    if (!confirm(`Remove "${h.name}" from team "${team.name}"?`)) return;
    setBusyId(h.id);
    try {
      await updateGlobalHoliday(h.id, {
        teamIds: h.teamIds.filter((id) => id !== team.id),
      });
      await onChanged();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[720px] max-h-[88vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={holidayIconWrapClass}>
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <h2 className={employeeModalTitleClass}>
                {team.name}
              </h2>
              <p className="text-[12.5px] text-gray-500 mt-0.5">
                {teamHolidays.length} holiday
                {teamHolidays.length === 1 ? "" : "s"} assigned to this team
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                <Th>Date</Th>
                <Th>Day</Th>
                <Th>Name</Th>
                <Th className="text-right pr-6">Action</Th>
              </tr>
            </thead>
            <tbody>
              {teamHolidays.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className={employeeListTableEmptyClass}
                  >
                    No holidays assigned to this team yet. Use “Add Team” to edit
                    its holiday list, or assign holidays from the Holidays screen.
                  </td>
                </tr>
              )}
              {teamHolidays.map((h) => (
                <tr key={h.id} className={employeeListTableRowClass}>
                  <Td className="font-semibold text-gray-900 whitespace-nowrap">
                    {h.date}
                  </Td>
                  <Td className="text-gray-700">{dayOfWeek(h.date)}</Td>
                  <Td className="text-gray-900">
                    {h.name}
                    {h.isHalfDay && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Half-day
                      </span>
                    )}
                  </Td>
                  <Td className="text-right pr-6">
                    <div className="inline-flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditing(h)}
                        title="Edit holiday"
                        className={employeeEditIconBtnClass}
                      >
                        <Pencil className={employeeIconPen} />
                      </button>
                      <button
                        type="button"
                        onClick={() => unlink(h)}
                        disabled={busyId === h.id}
                        title="Remove from this team"
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-40"
                      >
                        {busyId === h.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Unlink size={14} />
                        )}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className={holidayModalCancelClass}
          >
            Close
          </button>
        </div>
      </div>

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

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={[employeeListTableHeadClass, className ?? ""].join(" ")}>
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
