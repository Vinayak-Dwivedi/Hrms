"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createExitReason,
  deleteExitReason,
  type ExitReason,
  listExitReasons,
  updateExitReason,
} from "@/features/offboarding/api/offboarding.client";
import {
  ActionBtn,
  cellStyle,
  DialogShell,
  EmptyRow,
  ghostBtn,
  headStyle,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";

export default function ExitReasonsSection() {
  const [rows, setRows] = useState<ExitReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ExitReason | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listExitReasons());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load exit reasons.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(r: ExitReason) {
    if (!confirm(`Delete exit reason "${r.label}"?`)) return;
    try {
      await deleteExitReason(r.id);
      toast.success("Exit reason deleted.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={primaryBtn} onClick={() => setAddOpen(true)} type="button">
          <Plus className="w-4 h-4" /> Add Reason
        </button>
      </div>

      <TableShell minWidth={560}>
        <thead>
          <tr>
            <th style={headStyle}>Reason</th>
            <th style={headStyle}>Sort Order</th>
            <th style={headStyle}>Status</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow colSpan={4} text="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={4} text="No exit reasons configured." />
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={{ ...cellStyle, fontWeight: 500, color: "#111827" }}>{r.label}</td>
                <td style={cellStyle}>{r.sortOrder}</td>
                <td style={cellStyle}>
                  {r.isActive ? (
                    <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
                  ) : (
                    <StatusPill bg="#f3f4f6" color="#6b7280" label="Inactive" />
                  )}
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <div className="flex items-center justify-end gap-2">
                    <ActionBtn title="Edit" border="#e5e7eb" color="#6b7280" onClick={() => setEditTarget(r)}>
                      <Pencil size={15} />
                    </ActionBtn>
                    <ActionBtn title="Delete" border="#fca5a5" color="#dc2626" onClick={() => remove(r)}>
                      <Trash2 size={15} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>

      {(addOpen || editTarget) && (
        <ExitReasonDialog
          target={editTarget}
          onClose={() => {
            setAddOpen(false);
            setEditTarget(null);
          }}
          onSaved={() => {
            setAddOpen(false);
            setEditTarget(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ExitReasonDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ExitReason | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(target?.label ?? "");
  const [sortOrder, setSortOrder] = useState(String(target?.sortOrder ?? 100));
  const [isActive, setIsActive] = useState(target?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!label.trim()) {
      toast.error("Reason label is required.");
      return;
    }
    setBusy(true);
    try {
      const body = { label: label.trim(), sortOrder: Number(sortOrder) || 100, isActive };
      if (target) await updateExitReason(target.id, body);
      else await createExitReason(body);
      toast.success(target ? "Exit reason updated." : "Exit reason added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell title={target ? "Edit Exit Reason" : "Add Exit Reason"} onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className={labelClass}>Reason</label>
          <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Better Opportunity" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sort Order</label>
            <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)] cursor-pointer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy} type="button">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </DialogShell>
  );
}
