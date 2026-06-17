"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "calendar" | "table";

function TableIcon({
  size = 15,
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
  cn(
    "w-7 h-7 rounded-[5px] flex items-center justify-center cursor-pointer transition-colors border-0",
    active
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-500 hover:text-slate-700 bg-transparent",
  );

export default function ViewModeToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 gap-0.5 shrink-0"
      role="group"
      aria-label="Attendance view mode"
    >
      <button
        type="button"
        onClick={() => onChange("calendar")}
        aria-label="Calendar view"
        aria-pressed={view === "calendar"}
        title="Calendar view"
        className={btnClass(view === "calendar")}
      >
        <CalendarIcon size={15} />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-label="Table view"
        aria-pressed={view === "table"}
        title="Table view"
        className={btnClass(view === "table")}
      >
        <TableIcon />
      </button>
    </div>
  );
}
