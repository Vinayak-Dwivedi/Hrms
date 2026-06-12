"use client";

// Employee comp-off panel for the Leave page: raise a comp-off request for a
// holiday / weekly-off that was worked, and track the status of past requests.

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Plus, Save, X } from "lucide-react";
import {
  createCompOffRequest,
  listMyCompOffRequests,
  type CompOffRequest,
  type CompOffStatus,
} from "./api/comp-off.client";

export default function MyCompOff() {
  const [rows, setRows] = useState<CompOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listMyCompOffRequests());
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
    <div className="rounded-2xl bg-white border border-gray-200 mb-5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#ec4899] to-[#be185d]">
            <CalendarClock size={17} className="text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
              Compensatory Off
            </h2>
            <p className="text-[11.5px] text-gray-400">
              Worked a holiday or weekly off? Request a comp-off day.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
        >
          <Plus size={13} /> Request Comp-Off
        </button>
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
          No comp-off requests yet.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <Th>Worked Date</Th>
              <Th>Days</Th>
              <Th>Reason</Th>
              <Th className="text-center">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <Td className="font-semibold text-gray-900 whitespace-nowrap">
                  {r.workedDate}
                </Td>
                <Td className="text-gray-700">{r.days}</Td>
                <Td className="text-gray-700 max-w-[320px] truncate">{r.reason}</Td>
                <Td className="text-center">
                  <StatusPill status={r.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dialogOpen && (
        <RequestDialog
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function RequestDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workedDate, setWorkedDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(workedDate) && reason.trim().length > 0;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createCompOffRequest({ workedDate, reason: reason.trim() });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[440px] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-[17px] font-bold text-gray-900">Request Comp-Off</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-gray-700">
              Date worked (holiday / weekly off)
            </label>
            <input
              type="date"
              value={workedDate}
              onChange={(e) => setWorkedDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-gray-700">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Worked on Republic Day to cover a production release"
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none"
            />
          </div>
          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
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
            onClick={submit}
            disabled={saving || !valid}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CompOffStatus }) {
  const map: Record<CompOffStatus, string> = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={[
        "inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border",
        map[status],
      ].join(" ")}
    >
      {status}
    </span>
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
