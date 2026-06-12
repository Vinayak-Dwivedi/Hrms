"use client";

// Approver-side multi-stage leave-approval panel (Approvals page). Shows leave
// requests where the current user is the approver for the request's CURRENT
// workflow stage. Approve advances to the next stage (or finalizes); reject
// stops the request.

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { API_BASE } from "@/lib/hrms-client";

interface PendingApproval {
  id: number;
  employeeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  leaveCode: string;
  leaveType: string;
  stageLabel: string;
  stageIndex: number;
  totalStages: number;
  stagePath: string[];
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/api/workflow-approvals${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = (body as { error?: { message?: string } }).error;
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export default function WorkflowApprovals() {
  const [rows, setRows] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await call<{ data: PendingApproval[] }>("");
      setRows(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function decide(id: number, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      if (action === "approve") {
        await call(`/${id}/approve`, { method: "POST" });
      } else {
        const remarks = prompt("Reason for rejection (optional):") ?? "";
        await call(`/${id}/reject`, { method: "POST", body: JSON.stringify({ remarks }) });
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 mb-5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-[14px] font-bold text-gray-900">
          Leave Approvals
          {rows.length > 0 && (
            <span className="ml-2 text-[11px] font-bold text-[#be185d] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
              {rows.length} awaiting you
            </span>
          )}
        </h2>
      </div>

      {error && (
        <div className="m-4 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center py-8 text-[12px] text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center py-8 text-[12px] text-gray-400">
          No leave requests awaiting your approval.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <Th>Employee</Th>
              <Th>Leave</Th>
              <Th>Dates</Th>
              <Th>Your Stage</Th>
              <Th className="text-right pr-6">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <Td className="font-semibold text-gray-900">{r.employeeName}</Td>
                <Td className="text-gray-700">
                  {r.leaveCode} · {r.days}d
                  <div className="text-[11px] text-gray-400 max-w-[220px] truncate">{r.reason}</div>
                </Td>
                <Td className="text-gray-700 whitespace-nowrap">
                  {r.fromDate}
                  {r.toDate !== r.fromDate ? ` → ${r.toDate}` : ""}
                </Td>
                <Td>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-pink-50 text-[#be185d] border border-pink-100">
                    {r.stageLabel}
                  </span>
                  <span className="ml-1.5 text-[11px] text-gray-400">
                    {r.stageIndex + 1}/{r.totalStages}
                  </span>
                </Td>
                <Td className="text-right pr-6">
                  <div className="inline-flex items-center gap-2">
                    {busyId === r.id ? (
                      <Loader2 size={15} className="animate-spin text-gray-400" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => decide(r.id, "approve")}
                          title={
                            r.stageIndex + 1 === r.totalStages
                              ? "Approve (final)"
                              : "Approve & forward to next stage"
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check size={13} />
                          {r.stageIndex + 1 === r.totalStages ? "Approve" : "Approve →"}
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(r.id, "reject")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50"
                        >
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={["text-[10.5px] font-bold tracking-widest uppercase px-4 py-3 text-left", className ?? ""].join(" ")}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={["px-4 py-3 align-middle", className ?? ""].join(" ")}>{children}</td>;
}
