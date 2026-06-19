"use client";

// Add Holiday dialog. Each row is one holiday: date, day-of-week (auto from
// date), and name. The clickable "+ Add Holiday" affordance in the centre
// inserts another empty row. Clear (top-right) empties all rows. Save
// (bottom-right) POSTs each row to /api/admin/holidays.
//
// Holidays here are standalone — they are not yet attached to any team. The
// Team dialog's checklist surfaces them so an admin can pick which teams
// receive each holiday later.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createGlobalHoliday,
  type GlobalHoliday,
} from "./api/holiday-calendars.client";
import {
  employeeBtnClass,
  employeeErrorBannerClass,
  employeeInputClass,
  employeeModalTitleClass,
  holidayDayBadgeClass,
  holidayDayBadgeEmptyClass,
  holidayLinkAccentClass,
  holidayModalCancelClass,
} from "./holiday-calendars-theme";

interface Row {
  date: string;
  name: string;
  isHalfDay: boolean;
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

function blankRow(): Row {
  return { date: "", name: "", isHalfDay: false };
}

function dayOfWeek(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return DAY_NAMES[d.getUTCDay()] ?? "";
}

export default function AddHolidayDialog({
  open,
  onClose,
  onSaved,
  existingHolidays = [],
  onEditExisting,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Already-saved holidays, used to warn on a duplicate date. */
  existingHolidays?: GlobalHoliday[];
  /** Open the editor for the holiday that already occupies a clashing date. */
  onEditExisting?: (holiday: GlobalHoliday) => void;
}) {
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRows([blankRow()]);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length === 1 ? [blankRow()] : rs.filter((_, idx) => idx !== i)));
  }
  function clearAll() {
    setRows([blankRow()]);
    setError(null);
  }

  async function save() {
    const valid = rows.filter(
      (r) => r.date.match(/^\d{4}-\d{2}-\d{2}$/) && r.name.trim().length > 0,
    );
    if (valid.length === 0) {
      setError("Add at least one row with a date and a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // A date that already has a holiday isn't duplicated — the admin combines
      // names on the existing one instead (e.g. "Diwali / Chhath Puja").
      const existingByDate = new Map(existingHolidays.map((h) => [h.date, h]));
      const clashes: GlobalHoliday[] = [];
      const seen = new Set<string>();
      let created = 0;
      // Sequential to keep error reporting precise (we report which row failed).
      for (const r of valid) {
        const clash = existingByDate.get(r.date);
        if (clash) {
          clashes.push(clash);
          continue;
        }
        if (seen.has(r.date)) continue; // duplicate date within this batch
        seen.add(r.date);
        await createGlobalHoliday({
          date: r.date,
          name: r.name.trim(),
          type: "National",
          isHalfDay: r.isHalfDay,
          description: null,
          scope: [],
          teamIds: [],
        });
        created++;
      }

      for (const clash of clashes) {
        toast.error(
          `A holiday already exists on ${clash.date}: “${clash.name}”. Edit it to add another name (e.g. “Diwali / Chhath Puja”).`,
          onEditExisting
            ? { action: { label: "Edit", onClick: () => onEditExisting(clash) } }
            : undefined,
        );
      }

      if (created > 0) onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const validCount = rows.filter(
    (r) => r.date.match(/^\d{4}-\d{2}-\d{2}$/) && r.name.trim().length > 0,
  ).length;

  const modal = (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[440px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className={employeeModalTitleClass}>
              Add Holiday
            </h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">
              Set scope per holiday in the table afterwards.
            </p>
          </div>
          {/* Clear button — top right */}
          <button
            type="button"
            onClick={clearAll}
            disabled={saving}
            title="Clear all rows"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(idx, { date: e.target.value })}
                  className={`${employeeInputClass} flex-1`}
                />
                <span
                  className={[
                    "text-[12px] font-semibold text-center px-2 py-1.5 rounded w-[58px] shrink-0",
                    row.date ? holidayDayBadgeClass : holidayDayBadgeEmptyClass,
                  ].join(" ")}
                >
                  {row.date ? dayOfWeek(row.date) : "Day"}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={saving}
                  className="text-gray-400 hover:text-rose-600 p-1 disabled:opacity-50 shrink-0"
                  title="Remove row"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                value={row.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                placeholder="Holiday name (e.g. Republic Day)"
                className={employeeInputClass}
              />
           
            </div>
          ))}

          {/* Clickable "+ Add Holiday" in the centre — not a button-shaped
              element, just an inline link-like affordance per the spec. */}
          <button
            type="button"
            onClick={addRow}
            disabled={saving}
            className={`self-center inline-flex items-center gap-1.5 mt-1 text-[13px] disabled:opacity-50 ${holidayLinkAccentClass}`}
          >
            <Plus size={14} /> Add Holiday
          </button>

          {error && (
            <div className={employeeErrorBannerClass}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[11.5px] text-gray-400">
            {validCount === 0
              ? "Fill a date and name to enable Save."
              : `${validCount} holiday${validCount === 1 ? "" : "s"} ready to save.`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={holidayModalCancelClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || validCount === 0}
              className={`${employeeBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}

// Quell unused import warnings.
void X;
