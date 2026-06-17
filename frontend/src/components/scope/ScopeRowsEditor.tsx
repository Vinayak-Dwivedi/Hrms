"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  fetchScopeOptions,
  scopeTypeLabel,
  type ScopeOptionItem,
  type ScopeType,
} from "./scope-lookups";

// Reusable scope-rows editor used across Holiday Calendars, Weekly Off,
// Leave Policies, etc. A scope row says "this calendar/config applies to
// scope_type=X with scope_id=Y, with priority P". Higher specificity →
// higher priority wins when resolving for an individual employee.

export interface ScopeRowValue {
  id?: number;
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
}

export default function ScopeRowsEditor({
  rows,
  availableTypes,
  onChange,
  title,
  emptyHint,
}: {
  rows: ScopeRowValue[];
  availableTypes: ScopeType[];
  onChange: (rows: ScopeRowValue[]) => void;
  title?: string;
  emptyHint?: string;
}) {
  function addRow() {
    const defaultType = availableTypes[0] ?? "Company";
    onChange([
      ...rows,
      { scopeType: defaultType, scopeId: null, priority: 100 },
    ]);
  }

  function updateRow(i: number, patch: Partial<ScopeRowValue>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">
          {title ?? `Scope (${rows.length})`}
        </p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#ff014f] hover:text-[#eb0249]"
        >
          <Plus size={12} /> Add Scope
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-[12px] text-gray-400 py-6 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
          {emptyHint ??
            "No scopes added — this calendar will not apply to anyone."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, idx) => (
            <ScopeRowEditor
              key={idx}
              row={r}
              availableTypes={availableTypes}
              onChange={(patch) => updateRow(idx, patch)}
              onRemove={() => removeRow(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── one row ───────────────────────────────────────────────────────────────

function ScopeRowEditor({
  row,
  availableTypes,
  onChange,
  onRemove,
}: {
  row: ScopeRowValue;
  availableTypes: ScopeType[];
  onChange: (patch: Partial<ScopeRowValue>) => void;
  onRemove: () => void;
}) {
  // Cache loaded options per scope type so switching back/forth doesn't
  // re-fetch immediately. Keyed by scopeType.
  const cacheRef = useRef<Record<string, ScopeOptionItem[]>>({});
  const [options, setOptions] = useState<ScopeOptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (row.scopeType === "Company" || row.scopeType === "Process") {
        setOptions([]);
        setLoadError(null);
        return;
      }
      if (cacheRef.current[row.scopeType]) {
        setOptions(cacheRef.current[row.scopeType] ?? []);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchScopeOptions(row.scopeType);
        if (cancelled) return;
        cacheRef.current[row.scopeType] = data;
        setOptions(data);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [row.scopeType]);

  const needsValuePicker = row.scopeType !== "Company" && row.scopeType !== "Process";

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={row.scopeType}
          onChange={(e) =>
            onChange({
              scopeType: e.target.value as ScopeType,
              scopeId:
                e.target.value === "Company" || e.target.value === "Process"
                  ? null
                  : null,
            })
          }
          className="flex-1 min-w-[130px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
        >
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {scopeTypeLabel(t)}
            </option>
          ))}
        </select>

        <div className="flex-1 min-w-[130px]">
          {needsValuePicker ? (
            loading ? (
              <div className="flex items-center gap-2 text-[12px] text-gray-500 px-2.5 py-1.5">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : loadError ? (
              <div className="text-[11.5px] text-rose-600 px-2.5 py-1.5 truncate">
                {loadError}
              </div>
            ) : (
              <select
                value={row.scopeId ?? ""}
                onChange={(e) =>
                  onChange({
                    scopeId:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
              >
                <option value="">Pick {scopeTypeLabel(row.scopeType)}…</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="text-[11.5px] italic text-gray-500 px-2.5 py-1.5">
              Applies to everyone
            </div>
          )}
        </div>

        <input
          type="number"
          min={0}
          value={row.priority}
          onChange={(e) => onChange({ priority: Number(e.target.value) || 0 })}
          className="w-16 shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
          title="Priority — higher wins when scopes overlap"
        />

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-gray-400 hover:text-rose-600 p-1"
          title="Remove scope"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
