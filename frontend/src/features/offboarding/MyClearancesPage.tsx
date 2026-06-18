"use client";

import { Check, ClipboardCheck, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearanceTeamLabel,
  type ClearanceTaskStatus,
  getMyClearances,
  type MyClearanceCase,
  updateMyClearanceTask,
} from "@/features/offboarding/api/offboarding.client";
import {
  avatarColor,
  cellStyle,
  DialogShell,
  EmptyRow,
  fmtDate,
  headStyle,
  initials,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";

const TEAM_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#fef9c3", color: "#b45309" },
  InProgress: { bg: "#dbeafe", color: "#1d4ed8" },
  Completed: { bg: "#dcfce7", color: "#15803d" },
};

// Overall case progress → a single pill for the table row.
function caseStatus(c: MyClearanceCase): { bg: string; color: string; label: string } {
  if (c.summary.total > 0 && c.summary.done >= c.summary.total) {
    return { bg: "#dcfce7", color: "#15803d", label: "Completed" };
  }
  if (c.summary.done > 0) return { bg: "#dbeafe", color: "#1d4ed8", label: "In Progress" };
  return { bg: "#fef9c3", color: "#b45309", label: "Pending" };
}

export default function MyClearancesPage() {
  const [cases, setCases] = useState<MyClearanceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

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

  const openCase = openId != null ? cases.find((c) => c.caseId === openId) ?? null : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">My Clearances</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Offboarding clearance tasks assigned to you. Click an employee to complete the items your
          team is responsible for.
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
        <TableShell minWidth={840}>
          <thead>
            <tr>
              <th style={headStyle}>Employee</th>
              <th style={headStyle}>Case No.</th>
              <th style={headStyle}>Department</th>
              <th style={headStyle}>Last Working Day</th>
              <th style={headStyle}>Progress</th>
              <th style={headStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const s = caseStatus(c);
              const pct = c.summary.total > 0 ? Math.round((c.summary.done / c.summary.total) * 100) : 0;
              return (
                <tr
                  key={c.caseId}
                  onClick={() => setOpenId(c.caseId)}
                  className="hover:bg-[#fafbfc] transition-colors cursor-pointer"
                >
                  <td style={cellStyle}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: avatarColor(c.employee.empId) }}
                      >
                        {initials(c.employee.firstName, c.employee.lastName)}
                      </div>
                      <div className="min-w-0">
                        <span className="block font-semibold text-gray-900 truncate">
                          {c.employee.firstName} {c.employee.lastName}
                        </span>
                        <span className="block text-[11px] text-gray-400">{c.employee.empId}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 600, color: "lab(36.9089% 35.0961 -85.6872)", whiteSpace: "nowrap" }}>
                    {c.caseNumber}
                  </td>
                  <td style={cellStyle}>{c.departmentName ?? "—"}</td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(c.lastWorkingDate)}</td>
                  <td style={cellStyle}>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? "#16a34a" : "lab(36.9089% 35.0961 -85.6872)",
                          }}
                        />
                      </div>
                      <span className="text-[12px] font-medium text-gray-500 whitespace-nowrap">
                        {c.summary.done}/{c.summary.total}
                      </span>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <StatusPill bg={s.bg} color={s.color} label={s.label} />
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && <EmptyRow colSpan={6} text="No clearance tasks assigned." />}
          </tbody>
        </TableShell>
      )}

      {openCase && (
        <ClearanceChecklistDialog
          caseRow={openCase}
          savingId={savingId}
          onSetStatus={setStatus}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

// The per-employee checklist — same grouped checkbox layout as before, now in a
// dialog opened from the table row.
function ClearanceChecklistDialog({
  caseRow: c,
  savingId,
  onSetStatus,
  onClose,
}: {
  caseRow: MyClearanceCase;
  savingId: number | null;
  onSetStatus: (caseId: number, taskId: number, status: ClearanceTaskStatus) => void;
  onClose: () => void;
}) {
  return (
    <DialogShell
      title={`${c.employee.firstName} ${c.employee.lastName} · ${c.caseNumber}`}
      subtitle={`${c.departmentName ?? "—"} · Last working day ${fmtDate(c.lastWorkingDate)} · ${c.summary.done}/${c.summary.total} done`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        {c.groups.map((g) => {
          const ts = TEAM_STATUS_STYLE[g.status] ?? TEAM_STATUS_STYLE.Pending;
          return (
            <div key={g.team} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[13px] font-semibold text-gray-800">
                  {clearanceTeamLabel(g.team)}
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
                          onSetStatus(c.caseId, task.id, task.status === "Completed" ? "Pending" : "Completed")
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
                          onSetStatus(c.caseId, task.id, task.status === "NA" ? "Pending" : "NA")
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
    </DialogShell>
  );
}
