"use client";

import { Calendar as CalendarIcon } from "lucide-react";

export type ViewMode = "calendar" | "table";

function TableIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

const btnClass = (active: boolean) =>
  [
    "w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors",
    active
      ? "bg-[#fff1f2] text-[#be185d] border border-[#fecdd3]"
      : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50",
  ].join(" ");

export default function ViewModeToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onChange("calendar")}
        aria-label="Calendar view"
        aria-pressed={view === "calendar" ? true : undefined}
        title="Calendar view"
        className={btnClass(view === "calendar")}
      >
        <CalendarIcon size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-label="Table view"
        aria-pressed={view === "table" ? true : undefined}
        title="Table view"
        className={btnClass(view === "table")}
      >
        <TableIcon size={16} />
      </button>
    </div>
  );
}
