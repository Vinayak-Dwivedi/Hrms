"use client";

// "All my leave balances" — every leave type the employee currently holds a
// balance for (from their assigned policy + any comp-off credits). Shown on the
// Leave page; the dashboard "Leave Balance → View all" links here.

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { fetchMyLeaveBalances } from "@/lib/hrms-client";
import type { LeaveType } from "@/lib/dashboard";

export default function MyLeaveBalances() {
  const [rows, setRows] = useState<LeaveType[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMyLeaveBalances();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalAvail = (rows ?? []).reduce((s, r) => s + r.available, 0);

  return (
    <div className="rounded-2xl bg-white border border-gray-200 mb-5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#ec4899] to-[#be185d]">
            <Wallet size={17} className="text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
              My Leave Balances
            </h2>
            <p className="text-[11.5px] text-gray-400">
              All leave types available to you.
            </p>
          </div>
        </div>
        <span className="text-[12px] text-gray-500">
          <strong className="text-gray-900">{totalAvail}</strong> days available
        </span>
      </div>

      {error && (
        <div className="m-4 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {rows === null ? (
        <p className="text-center py-8 text-[12px] text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center py-8 text-[12px] text-gray-400">
          No leave balances yet — none of your policies grant leave.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <Th>Leave Type</Th>
              <Th className="text-center">Granted</Th>
              <Th className="text-center">Used</Th>
              <Th className="text-center">Available</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-t border-gray-100">
                <Td>
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-[#be185d] text-white font-bold text-[10px] mr-2 align-middle">
                    {r.code.slice(0, 2)}
                  </span>
                  <span className="font-semibold text-gray-900">{r.name}</span>
                </Td>
                <Td className="text-center text-gray-600">{r.total}</Td>
                <Td className="text-center text-gray-600">{r.used}</Td>
                <Td className="text-center">
                  <span className="font-bold text-emerald-700">{r.available}</span>
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
