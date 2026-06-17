"use client";

import { cn } from "@/lib/utils";

export type LeaveScope = "mine" | "team";

const OPTIONS: { value: LeaveScope; label: string }[] = [
  { value: "mine", label: "My Leave" },
  { value: "team", label: "Team Leave" },
];

export default function LeaveScopeToggle({
  scope,
  onSelect,
}: {
  scope: LeaveScope;
  onSelect: (scope: LeaveScope) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 gap-0.5"
      role="tablist"
      aria-label="Leave scope"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = scope === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(value)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-[5px] transition-colors cursor-pointer border-0 whitespace-nowrap",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700 bg-transparent",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
