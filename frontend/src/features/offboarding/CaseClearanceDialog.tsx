"use client";

import { Check, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CaseClearance,
  type ClearanceTaskStatus,
  clearanceTeamLabel,
  getCaseClearance,
  type OffboardingCase,
  updateClearanceTask,
} from "@/features/offboarding/api/offboarding.client";
import { DialogShell, fmtDate, ghostBtn, StatusPill } from "@/features/offboarding/offboarding-ui";

const TEAM_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#fef9c3", color: "#b45309" },
  InProgress: { bg: "#dbeafe", color: "#1d4ed8" },
  Completed: { bg: "#dcfce7", color: "#15803d" },
};

export default function CaseClearanceDialog({
  caseRow,
  onClose,
  onChanged,
}: {
  caseRow: OffboardingCase;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<CaseClearance | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load() {
    try {
      setData(await getCaseClearance(caseRow.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clearance.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(taskId: number, status: ClearanceTaskStatus) {
    setSavingId(taskId);
    try {
      const updated = await updateClearanceTask(caseRow.id, taskId, { status });
      setData(updated);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update task.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <DialogShell
      title={`Clearance · ${caseRow.caseNumber}`}
      subtitle={`${caseRow.employee.firstName} ${caseRow.employee.lastName} · LWD ${fmtDate(caseRow.lastWorkingDate)}`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !data || data.groups.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No clearance tasks for this case.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF014F] to-[#eb0249] transition-all"
                  style={{ width: `${data.summary.total ? (data.summary.done / data.summary.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-gray-600 shrink-0">
                {data.summary.done}/{data.summary.total} done
              </span>
            </div>

            {data.groups.map((g) => {
              const ts = TEAM_STATUS_STYLE[g.status] ?? TEAM_STATUS_STYLE.Pending;
              return (
                <div key={g.team} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[13px] font-semibold text-gray-800">
                      {clearanceTeamLabel(g.team)}
                    </span>
                    <StatusPill bg={ts.bg} color={ts.color} label={g.status === "InProgress" ? "In Progress" : g.status} />
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {g.tasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span
                          className={`text-[13px] ${task.status === "Completed" ? "text-gray-400 line-through" : task.status === "NA" ? "text-gray-400" : "text-gray-700"}`}
                        >
                          {task.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            title="Mark complete"
                            disabled={savingId === task.id}
                            onClick={() => setStatus(task.id, task.status === "Completed" ? "Pending" : "Completed")}
                            className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                            style={{
                              width: 30,
                              height: 30,
                              border: `1.5px solid ${task.status === "Completed" ? "#16a34a" : "#d1d5db"}`,
                              background: task.status === "Completed" ? "#16a34a" : "#fff",
                              color: task.status === "Completed" ? "#fff" : "#9ca3af",
                            }}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            type="button"
                            title="Not applicable"
                            disabled={savingId === task.id}
                            onClick={() => setStatus(task.id, task.status === "NA" ? "Pending" : "NA")}
                            className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                            style={{
                              width: 30,
                              height: 30,
                              border: `1.5px solid ${task.status === "NA" ? "#9ca3af" : "#d1d5db"}`,
                              background: task.status === "NA" ? "#9ca3af" : "#fff",
                              color: task.status === "NA" ? "#fff" : "#9ca3af",
                            }}
                          >
                            <Minus size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Close</button>
      </div>
    </DialogShell>
  );
}
