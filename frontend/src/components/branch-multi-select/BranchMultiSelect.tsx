"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import {
  holidayCheckboxClass,
  holidayChecklistSelectedClass,
  holidayChipClass,
} from "@/features/holiday-calendars/holiday-calendars-theme";

export type MultiSelectItem = { id: number; name: string };

export type BranchMultiSelectProps = {
  label: string;
  selectAllLabel?: string;
  variant?: "default" | "inline";
  items: MultiSelectItem[];
  allSelected: boolean;
  selectedIds: Set<number>;
  onAllChange: (all: boolean) => void;
  onSelectedChange: (ids: Set<number>) => void;
  placeholder: string;
};

export default function BranchMultiSelect({
  label,
  selectAllLabel = "",
  variant = "default",
  items,
  allSelected,
  selectedIds,
  onAllChange,
  onSelectedChange,
  placeholder,
}: BranchMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  function toggleItem(id: number) {
    if (allSelected) {
      onAllChange(false);
      onSelectedChange(
        new Set(items.filter((i) => i.id !== id).map((i) => i.id)),
      );
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function removeChip(id: number, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (allSelected) {
      onAllChange(false);
      onSelectedChange(
        new Set(items.filter((i) => i.id !== id).map((i) => i.id)),
      );
      return;
    }
    const next = new Set(selectedIds);
    next.delete(id);
    onSelectedChange(next);
  }

  const summaryText = allSelected && selectAllLabel
    ? selectAllLabel
    : selectedIds.size === 0
      ? "None selected"
      : `${selectedIds.size} selected`;

  const inlineSelectedItems =
    allSelected && !selectAllLabel ? items : selectedItems;

  function renderChip(item: MultiSelectItem) {
    return (
      <span key={item.id} className={holidayChipClass}>
        {item.name}
        <button
          type="button"
          onClick={(e) => removeChip(item.id, e)}
          className="text-slate-400 hover:text-slate-700"
          aria-label={`Remove ${item.name}`}
        >
          <X size={11} />
        </button>
      </span>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={[
          "flex items-baseline justify-between",
          variant === "inline" ? "mb-2" : "mb-2",
        ].join(" ")}
      >
        <p className="text-[12px] font-bold tracking-widest text-gray-500 uppercase">
          {label}
        </p>
        {variant === "default" && (
          <p className="text-[11px] text-gray-400">{summaryText}</p>
        )}
      </div>

      {variant === "default" &&
        (allSelected && selectAllLabel ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={holidayChipClass}>{selectAllLabel}</span>
          </div>
        ) : (
          selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedItems.map((item) => renderChip(item))}
            </div>
          )
        ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 hover:bg-gray-50",
          variant === "inline"
            ? "min-h-[38px] px-2 py-1.5"
            : "px-3 py-2",
        ].join(" ")}
      >
        {variant === "inline" ? (
          <span className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 text-left">
            {inlineSelectedItems.length === 0 ? (
              <span className="px-1 py-0.5 text-gray-400">{placeholder}</span>
            ) : (
              inlineSelectedItems.map((item) => renderChip(item))
            )}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Check size={13} className="text-gray-400" />
            {open ? `Hide ${label.toLowerCase()}` : placeholder}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[240px] overflow-hidden flex flex-col">
          <div className="overflow-y-auto">
            {selectAllLabel && (
              <label
                className={[
                  "flex items-center gap-2 px-3 py-2 text-[12.5px] cursor-pointer select-none border-b border-gray-100 font-medium",
                  allSelected
                    ? holidayChecklistSelectedClass
                    : "hover:bg-gray-50 text-gray-800",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onAllChange(!allSelected)}
                  className={holidayCheckboxClass}
                />
                <span>{selectAllLabel}</span>
              </label>
            )}

            {items.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-gray-500 italic">
                No options available.
              </p>
            )}

            {items.map((item) => {
              const checked = allSelected || selectedIds.has(item.id);
              return (
                <label
                  key={item.id}
                  className={[
                    "flex items-center gap-2 px-3 py-1.5 text-[12.5px] cursor-pointer select-none",
                    checked
                      ? holidayChecklistSelectedClass
                      : "hover:bg-gray-50 text-gray-700",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item.id)}
                    className={holidayCheckboxClass}
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
