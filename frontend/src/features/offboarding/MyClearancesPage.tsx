"use client";

import { Check, ClipboardCheck, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CLEARANCE_TEAM_LABEL,
  type ClearanceTaskStatus,
  getMyClearances,
  type MyClearanceCase,
  updateMyClearanceTask,
} from "@/features/offboarding/api/offboarding.client";
import {
  avatarColor,
  fmtDate,
  initials,
  StatusPill,
} from "@/features/offboarding/offboarding-ui";

const TEAM_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#fef9c3", color: "#b45309" },
  InProgress: { bg: "#dbeafe", color: "#1d4ed8" },
  Completed: { bg: "#dcfce7", color: "#15803d" },
};

export default function MyClearancesPage() {
  const [cases, setCases] = useState<MyClearanceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load() {
    try {
      setCases(await getMyClearances());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clearances.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function setStatus(caseId: number, taskId: number, status: ClearanceTaskStatus) {
    setSavingId(taskId);
    try {
      setCases(await updateMyClearanceTask(caseId, taskId, { status }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update task.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">My Clearances</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Offboarding clearance tasks assigned to you. Complete the items your team is responsible
          for.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
      ) : cases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 flex flex-col items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-400">No clearance tasks are assigned to you right now.</p>
        </div>
      ) : (
        cases.map((c) => (
          <div key={c.caseId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                style={{ background: avatarColor(c.employee.empId) }}
              >
                {initials(c.employee.firstName, c.employee.lastName)}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 m-0 leading-tight">
                  {c.employee.firstName} {c.employee.lastName}
                  <span className="ml-2 text-[11px] font-medium text-gray-400">{c.caseNumber}</span>
                </p>
                <p className="text-[11.5px] text-gray-500 m-0 mt-0.5">
                  {c.departmentName ?? "—"} · Last working day {fmtDate(c.lastWorkingDate)}
                </p>
              </div>
              <span className="ml-auto text-[12px] font-semibold text-gray-600">
                {c.summary.done}/{c.summary.total} done
              </span>
            </div>

            <div className="p-5 space-y-4">
              {c.groups.map((g) => {
                const ts = TEAM_STATUS_STYLE[g.status] ?? TEAM_STATUS_STYLE.Pending;
                return (
                  <div key={g.team} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-[13px] font-semibold text-gray-800">
                        {CLEARANCE_TEAM_LABEL[g.team]}
                      </span>
                      <StatusPill
                        bg={ts.bg}
                        color={ts.color}
                        label={g.status === "InProgress" ? "In Progress" : g.status}
                      />
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
                              onClick={() =>
                                setStatus(c.caseId, task.id, task.status === "Completed" ? "Pending" : "Completed")
                              }
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
                              onClick={() =>
                                setStatus(c.caseId, task.id, task.status === "NA" ? "Pending" : "NA")
                              }
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
            </div>
          </div>
        ))
      )}
    </div>
  );
}
