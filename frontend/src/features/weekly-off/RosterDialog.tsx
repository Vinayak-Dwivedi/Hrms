"use client";

// Roster planner for a Roster-mode weekly-off config. Shows a month grid of the
// config's scoped employees × days; tick the cells that are off, then save.
// Off-days are stored per employee/date and read back by the weekly-off
// resolver (so they drive leave validation etc.).

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchRoster,
  saveRoster,
  type RosterData,
  type WeeklyOffSummary,
} from "./api/weekly-off.client";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function RosterDialog({
  config,
  onClose,
}: {
  config: WeeklyOffSummary;
  onClose: () => void;
}) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [data, setData] = useState<RosterData | null>(null);
  // employeeId → Set of "YYYY-MM-DD"
  const [off, setOff] = useState<Map<number, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const month = monthKey(anchor);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const d = await fetchRoster(config.id, month);
        if (cancelled) return;
        setData(d);
        const m = new Map<number, Set<string>>();
        for (const [empId, dates] of Object.entries(d.offDates)) {
          m.set(Number(empId), new Set(dates));
        }
        setOff(m);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load roster.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.id, month]);

  // Day columns for the month.
  const days = useMemo(() => {
    const y = anchor.getFullYear();
    const mo = anchor.getMonth();
    const n = new Date(y, mo + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => {
      const date = new Date(y, mo, i + 1);
      const iso = `${y}-${String(mo + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return { day: i + 1, iso, dow: date.getDay(), weekend: date.getDay() === 0 || date.getDay() === 6 };
    });
  }, [anchor]);

  function toggle(empId: number, iso: string) {
    setOff((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(empId) ?? []);
      if (set.has(iso)) set.delete(iso);
      else set.add(iso);
      next.set(empId, set);
      return next;
    });
  }
  // Set every Sunday of the month off for one employee (quick fill).
  function fillSundays(empId: number) {
    setOff((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(empId) ?? []);
      for (const d of days) if (d.dow === 0) set.add(d.iso);
      next.set(empId, set);
      return next;
    });
  }
  function clearRow(empId: number) {
    setOff((prev) => {
      const next = new Map(prev);
      next.set(empId, new Set());
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const entries: { employeeId: number; date: string }[] = [];
      for (const [empId, set] of off) for (const iso of set) entries.push({ employeeId: empId, date: iso });
      const saved = await saveRoster(config.id, month, entries);
      toast.success(`Roster saved — ${saved} off-day${saved === 1 ? "" : "s"} for ${monthLabel(anchor)}.`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save roster.");
    } finally {
      setSaving(false);
    }
  }

  const employees = data?.employees ?? [];

  const modal = (
    <div className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-[1040px] max-h-[92vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900 leading-tight">Roster — {config.name}</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Tick each employee's off-days for the month.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[13px] font-semibold text-gray-800 w-[130px] text-center">
                {monthLabel(anchor)}
              </span>
              <button
                type="button"
                onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-auto px-4 py-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <Loader2 size={18} className="animate-spin inline mr-2" />
              Loading roster…
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No employees are in this configuration's scope.
            </div>
          ) : (
            <table className="border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white text-left px-3 py-2 font-semibold text-gray-500 min-w-[180px]">
                    Employee
                  </th>
                  {days.map((d) => (
                    <th
                      key={d.iso}
                      className={`px-0 py-1 text-center font-semibold w-7 ${d.weekend ? "text-[lab(36.9089%_35.0961_-85.6872)]" : "text-gray-400"}`}
                    >
                      <div className="text-[9px] leading-none">{DOW[d.dow]}</div>
                      <div className="text-[11px] leading-tight">{d.day}</div>
                    </th>
                  ))}
                  <th className="px-2" />
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const set = off.get(e.id) ?? new Set<string>();
                  return (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                        <div className="font-semibold text-gray-900 leading-tight">{e.name}</div>
                        <div className="text-[10px] text-gray-400">{e.empId}</div>
                      </td>
                      {days.map((d) => {
                        const on = set.has(d.iso);
                        return (
                          <td key={d.iso} className="text-center p-0.5">
                            <button
                              type="button"
                              onClick={() => toggle(e.id, d.iso)}
                              title={`${e.name} · ${d.iso}`}
                              className={[
                                "w-6 h-6 rounded-md border text-[10px] font-semibold transition-colors",
                                on
                                  ? "bg-[lab(36.9089%_35.0961_-85.6872)] text-white border-[lab(36.9089%_35.0961_-85.6872)]"
                                  : d.weekend
                                    ? "bg-blue-50/50 border-gray-200 text-gray-400 hover:border-[lab(36.9089%_35.0961_-85.6872)]/50"
                                    : "bg-white border-gray-200 text-gray-300 hover:border-[lab(36.9089%_35.0961_-85.6872)]/50",
                              ].join(" ")}
                            >
                              {on ? "✓" : ""}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => fillSundays(e.id)}
                          className="text-[10.5px] font-semibold text-[lab(36.9089%_35.0961_-85.6872)] hover:underline"
                        >
                          Sundays
                        </button>
                        <span className="text-gray-300 mx-1">·</span>
                        <button
                          type="button"
                          onClick={() => clearRow(e.id)}
                          className="text-[10.5px] font-semibold text-gray-400 hover:text-gray-700"
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || employees.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save {monthLabel(anchor)}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}
