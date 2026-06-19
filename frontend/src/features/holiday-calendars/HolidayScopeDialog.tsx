"use client";

// Read-only "View" dialog for a holiday: shows its name / date / half-day and
// the resolved scope (which Locations, Departments and Sub-Departments it
// applies to). An empty scope means the whole organisation.

import { createPortal } from "react-dom";
import { CalendarDays, X } from "lucide-react";
import type { GlobalHoliday } from "./api/holiday-calendars.client";
import {
  employeeModalTitleClass,
  holidayIconWrapClass,
  holidayModalCancelClass,
} from "./holiday-calendars-theme";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOfWeek(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return DAY_NAMES[d.getUTCDay()] ?? "";
}

function namesFor(
  scope: GlobalHoliday["scope"],
  scopeType: string,
  names: Map<number, string>,
): string[] {
  return scope
    .filter((s) => s.scopeType === scopeType && s.scopeId != null)
    .map((s) => names.get(s.scopeId as number) ?? `#${s.scopeId}`);
}

export default function HolidayScopeDialog({
  holiday,
  branchNames,
  departmentNames,
  subDepartmentNames,
  onClose,
}: {
  holiday: GlobalHoliday | null;
  branchNames: Map<number, string>;
  departmentNames: Map<number, string>;
  subDepartmentNames: Map<number, string>;
  onClose: () => void;
}) {
  if (!holiday) return null;

  const locations = namesFor(holiday.scope, "Branch", branchNames);
  const departments = namesFor(holiday.scope, "Department", departmentNames);
  const subDepartments = namesFor(
    holiday.scope,
    "SubDepartment",
    subDepartmentNames,
  );
  const isEveryone =
    locations.length === 0 &&
    departments.length === 0 &&
    subDepartments.length === 0;

  const modal = (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[460px] max-h-[88vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={holidayIconWrapClass}>
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <h2 className={employeeModalTitleClass}>{holiday.name}</h2>
              <p className="text-[12.5px] text-gray-500 mt-0.5">
                {holiday.date}
                {dayOfWeek(holiday.date) ? ` · ${dayOfWeek(holiday.date)}` : ""}
                {holiday.isHalfDay ? " · Half-day" : ""}
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
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {isEveryone ? (
            <p className="text-[13px] text-gray-600">
              Applies to the <strong>entire organisation</strong> — no
              location, department or sub-department restriction.
            </p>
          ) : (
            <>
              <ScopeSection label="Locations" items={locations} />
              <ScopeSection label="Departments" items={departments} />
              <ScopeSection label="Sub-Departments" items={subDepartments} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end">
          <button type="button" onClick={onClose} className={holidayModalCancelClass}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}

function ScopeSection({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] font-semibold text-gray-700">{label}</p>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-gray-400 italic">All</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((name) => (
            <span
              key={name}
              className="inline-flex items-center bg-blue-50 border border-blue-200 text-[lab(36.9089%_35.0961_-85.6872)] px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
