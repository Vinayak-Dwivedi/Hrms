"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Loader2, Plus, RotateCcw } from "lucide-react";
import {
  listWeeklyOff,
  type WeeklyOffSummary,
} from "./api/weekly-off.client";
import WeeklyOffEditor from "./WeeklyOffEditor";

type EditingTarget = WeeklyOffSummary | "new" | null;

export default function WeeklyOffPage() {
  const [items, setItems] = useState<WeeklyOffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingTarget>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listWeeklyOff());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
            Weekly Off
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Define non-working day patterns and assign them to employee groups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-5 items-start">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                Weekly Off Configurations
              </h3>
              <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
                Fixed (e.g. Sunday off), Rotational (e.g. 1-off / 4-week cycle),
                or Roster-based.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-[#ff014f] to-[#eb0249] hover:shadow-md transition-shadow"
              >
                <Plus size={12} /> New Configuration
              </button>
            </div>
          </header>

          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">
                Configurations
              </p>
              <p className="text-[11px] text-gray-400">
                {items.length} Config{items.length === 1 ? "" : "s"}
              </p>
            </div>

            {loading && items.length === 0 && (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 size={18} className="animate-spin mr-2" />
                <span className="text-[12px]">Loading…</span>
              </div>
            )}

            {error && (
              <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
                {error}
              </div>
            )}

            {!loading && items.length === 0 && !error && (
              <div className="text-center py-10 text-gray-400">
                <CalendarOff size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-[12.5px]">
                  No configurations yet. Click "New Configuration".
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {items.map((c) => (
                <ConfigRow
                  key={c.id}
                  item={c}
                  selected={
                    editing !== null && editing !== "new" && editing.id === c.id
                  }
                  onConfigure={() => setEditing(c)}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="lg:sticky lg:top-4">
          <WeeklyOffEditor
            target={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              refresh();
              setEditing(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ConfigRow({
  item,
  selected,
  onConfigure,
}: {
  item: WeeklyOffSummary;
  selected: boolean;
  onConfigure: () => void;
}) {
  const statusTone: Record<WeeklyOffSummary["status"], string> = {
    Draft: "bg-amber-50 text-amber-700 border-amber-200",
    Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Archived: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <button
      type="button"
      onClick={onConfigure}
      className={[
        "group flex items-center gap-4 text-left p-4 rounded-xl border transition-all",
        "bg-white hover:border-[#ff014f]/40 hover:shadow-sm",
        selected
          ? "border-[#ff014f] shadow-[0_4px_12px_-4px_rgba(255,1,79,0.25)]"
          : "border-gray-200",
      ].join(" ")}
    >
      <div className="shrink-0 w-10 h-10 rounded-xl bg-pink-50 text-[#ff014f] flex items-center justify-center group-hover:bg-[#eb0249] group-hover:text-white transition-colors">
        <CalendarOff size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-[14px] font-semibold text-gray-900 truncate">
            {item.name}
          </h4>
          <span
            className={[
              "inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border",
              statusTone[item.status],
            ].join(" ")}
          >
            {item.status}
          </span>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
            {item.mode}
          </span>
        </div>
        {item.description && (
          <p className="text-[12px] text-gray-500 truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>
    </button>
  );
}
