"use client";

// Edit a single holiday (date / name / type / half-day / description).
// Shared by the Holidays manager screen and the Team-holidays dialog.
// PATCHes /api/admin/holidays/:id and leaves team links untouched.

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  updateGlobalHoliday,
  type GlobalHoliday,
  type HolidayType,
} from "./api/holiday-calendars.client";
import {
  employeeBtnClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeInputClass,
  employeeModalTitleClass,
  holidayCheckboxClass,
  holidayModalCancelClass,
} from "./holiday-calendars-theme";

const HOLIDAY_TYPES: HolidayType[] = [
  "National",
  "Regional",
  "Optional",
  "Restricted",
  "Festival",
];

export default function EditHolidayDialog({
  open,
  holiday,
  onClose,
  onSaved,
}: {
  open: boolean;
  holiday: GlobalHoliday | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<HolidayType>("National");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && holiday) {
      setDate(holiday.date);
      setName(holiday.name);
      setType(holiday.type);
      setIsHalfDay(holiday.isHalfDay);
      setDescription(holiday.description ?? "");
      setError(null);
    }
  }, [open, holiday]);

  if (!open || !holiday) return null;

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && name.trim().length > 0;

  async function save() {
    if (!holiday || !valid) return;
    setSaving(true);
    setError(null);
    try {
      await updateGlobalHoliday(holiday.id, {
        date,
        name: name.trim(),
        type,
        isHalfDay,
        description: description.trim() ? description.trim() : null,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[460px] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className={employeeModalTitleClass}>
            Edit Holiday
          </h2>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full ${employeeInputClass}`}
            />
          </Field>
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Holiday name"
              className={`w-full ${employeeInputClass}`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as HolidayType)}
                className={`w-full ${employeeInputClass}`}
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Half day">
              <label className="inline-flex items-center gap-2 h-[38px] px-1 text-[13px] text-gray-700">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className={`h-4 w-4 ${holidayCheckboxClass}`}
                />
                Half-day holiday
              </label>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional note"
              className={`w-full ${employeeInputClass} resize-none`}
            />
          </Field>

          {error && (
            <div className={employeeErrorBannerClass}>
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
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
            disabled={saving || !valid}
            className={`${employeeBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>
    </div>
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
