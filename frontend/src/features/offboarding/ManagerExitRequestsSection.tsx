"use client";

import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createExitRequest,
  listManagerExitRequests,
  type EmployeeExitRequest,
  type ExitRequestStatus,
  type ManagerExitType,
} from "@/features/offboarding/api/offboarding.client";
import {
  avatarColor,
  cellStyle,
  DialogShell,
  EmptyRow,
  fmtDate,
  headStyle,
  initials,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";
import { fetchTeam, type TeamMember } from "@/lib/hrms-client";

const STATUS_META: Record<ExitRequestStatus, { bg: string; color: string; label: string }> = {
  Pending: { bg: "#fef9c3", color: "#b45309", label: "Pending HR" },
  Approved: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
};

const EXIT_TYPE_LABEL: Record<ManagerExitType, string> = {
  Absconding: "Absconding",
  ResignedWithoutNotice: "Resigned Without Notice",
};

function ExitTypePill({ type }: { type: ManagerExitType }) {
  const style =
    type === "Absconding"
      ? { bg: "#fee2e2", color: "#b91c1c" }
      : { bg: "#fef3c7", color: "#92400e" };
  return (
    <span
      className="font-semibold"
      style={{ background: style.bg, color: style.color, padding: "3px 10px", borderRadius: 6, fontSize: 12 }}
    >
      {EXIT_TYPE_LABEL[type]}
    </span>
  );
}

// ── Raise Exit Request Dialog ──────────────────────────────────────────────────

function RaiseDialog({
  team,
  onClose,
  onSuccess,
}: {
  team: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [exitType, setExitType] = useState<ManagerExitType>("Absconding");
  const [requestedLwd, setRequestedLwd] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    setBusy(true);
    try {
      const result = await createExitRequest({
        employeeId: Number(employeeId),
        exitType,
        requestedLwd: requestedLwd || null,
        evidenceNote: evidenceNote.trim() || null,
      });
      const emp = team.find((t) => t.id === Number(employeeId));
      const name = emp ? `${emp.firstName} ${emp.lastName}` : "Employee";
      let msg = `Exit request raised for ${name}.`;
      if (result.isBackdated) msg += " (Backdated LWD — attendance will be voided.)";
      if (result.activeLeavesCount > 0)
        msg += ` ${result.activeLeavesCount} active leave(s) captured in snapshot.`;
      toast.success(msg, { duration: 6000 });
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to raise exit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell title="Raise Exit Request" subtitle="Flag an employee's involuntary or no-notice departure to HR." onClose={onClose}>
      <div className="overflow-y-auto px-6 py-5 space-y-4">
        {/* Employee picker */}
        <div>
          <label className={labelClass}>Employee *</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : "")}
            className={inputClass}
            style={{ appearance: "none", cursor: "pointer" }}
          >
            <option value="">Select team member...</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} — {m.empId}
              </option>
            ))}
          </select>
        </div>

        {/* Exit type */}
        <div>
          <label className={labelClass}>Exit Type *</label>
          <div className="flex gap-3">
            {(["Absconding", "ResignedWithoutNotice"] as ManagerExitType[]).map((t) => {
              const active = exitType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setExitType(t)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    borderColor: active ? "#FF014F" : "#e5e7eb",
                    background: active ? "#fff1f5" : "#fff",
                    color: active ? "#FF014F" : "#6b7280",
                  }}
                >
                  {EXIT_TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Requested LWD (optional) */}
        <div>
          <label className={labelClass}>Last Working Date <span className="text-gray-400 normal-case font-normal">(optional — leave blank for HR to decide)</span></label>
          <input
            type="date"
            value={requestedLwd}
            onChange={(e) => setRequestedLwd(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Evidence note */}
        <div>
          <label className={labelClass}>Evidence / Remarks <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <textarea
            rows={3}
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
            placeholder="Describe what happened — last known activity, attendance gap, communication, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#bfdbfe] resize-none"
          />
        </div>

        {/* Warning */}
        <div
          className="flex items-start gap-2 rounded-lg p-3"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p className="text-xs m-0">
            This action will be reviewed by HR before the exit is finalised. The employee's access is not revoked until HR approves.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={busy} className={primaryBtn}>
          {busy ? "Submitting…" : "Submit to HR"}
        </button>
      </div>
    </DialogShell>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ManagerExitRequestsSection() {
  const [rows, setRows] = useState<EmployeeExitRequest[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaise, setShowRaise] = useState(false);
  const [filter, setFilter] = useState<"all" | ExitRequestStatus>("all");

  async function load() {
    setLoading(true);
    try {
      const [reqs, teamData] = await Promise.all([
        listManagerExitRequests(),
        fetchTeam(),
      ]);
      setRows(reqs);
      setTeam(teamData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load exit requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const view = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(["all", "Pending", "Approved", "Rejected"] as const).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  active ? "bg-[#FF014F] text-white" : "text-gray-600 hover:bg-gray-50",
                ].join(" ")}
              >
                {f === "all" ? "All" : STATUS_META[f].label}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setShowRaise(true)} className={primaryBtn}>
          <Plus size={15} />
          Raise Exit Request
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <TableShell minWidth={860}>
          <thead>
            <tr>
              {["Employee", "Exit Type", "Requested LWD", "Notice Days", "Status", "Raised On", "HR Remarks"].map((h) => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <EmptyRow colSpan={7} text="No exit requests found." />
            ) : (
              view.map((r) => {
                const s = STATUS_META[r.status];
                return (
                  <tr key={r.id} className="hover:bg-[#fafbfc] transition-colors">
                    <td style={cellStyle}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: avatarColor(r.employee.empId) }}
                        >
                          {initials(r.employee.firstName, r.employee.lastName)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 m-0">
                            {r.employee.firstName} {r.employee.lastName}
                          </p>
                          <p className="text-xs text-gray-500 m-0">{r.employee.empId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <ExitTypePill type={r.exitType as ManagerExitType} />
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {fmtDate(r.requestedLwd)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      {r.noticeRequiredDays ?? "—"}
                    </td>
                    <td style={cellStyle}>
                      <StatusPill bg={s.bg} color={s.color} label={s.label} />
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {fmtDate(r.createdAt)}
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 220 }}>
                      {r.hrRemarks ? (
                        <span className="text-sm text-gray-600">{r.hrRemarks}</span>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableShell>
      )}

      {showRaise && (
        <RaiseDialog
          team={team}
          onClose={() => setShowRaise(false)}
          onSuccess={() => {
            setShowRaise(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
