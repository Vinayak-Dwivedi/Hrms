"use client";

// Approver-side comp-off panel (Approvals page). Lists pending comp-off
// requests the current user can action (their reports, or all if admin/HR) and
// approve → credits the employee's CO balance — or reject.

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  approveCompOff,
  listCompOffApprovals,
  rejectCompOff,
  type CompOffRequest,
} from "./api/comp-off.client";

export default function CompOffApprovals() {
  const [rows, setRows] = useState<CompOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listCompOffApprovals());
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
        await approveCompOff(id);
      } else {
        const remarks = prompt("Reason for rejection (optional):") ?? undefined;
        await rejectCompOff(id, remarks);
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
          Comp-Off Requests
          {rows.length > 0 && (
            <span className="ml-2 text-[11px] font-bold text-[#be185d] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
              {rows.length} pending
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
          No pending comp-off requests.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <Th>Employee</Th>
              <Th>Worked Date</Th>
              <Th>Days</Th>
              <Th>Reason</Th>
              <Th className="text-right pr-6">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <Td className="font-semibold text-gray-900">{r.employeeName}</Td>
                <Td className="text-gray-700 whitespace-nowrap">{r.workedDate}</Td>
                <Td className="text-gray-700">{r.days}</Td>
                <Td className="text-gray-700 max-w-[280px] truncate">{r.reason}</Td>
                <Td className="text-right pr-6">
                  <div className="inline-flex items-center gap-2">
                    {busyId === r.id ? (
                      <Loader2 size={15} className="animate-spin text-gray-400" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => decide(r.id, "approve")}
                          title="Approve & credit comp-off"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(r.id, "reject")}
                          title="Reject"
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
