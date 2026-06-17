"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ScopeRowsEditor, {
  type ScopeRowValue,
} from "@/components/scope/ScopeRowsEditor";
import type { ScopeType } from "@/components/scope/scope-lookups";
import {
  createFlow,
  deleteFlow,
  type FlowScopeRow,
  getFlow,
  listFlows,
  type ResignationFlow,
  updateFlow,
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

const FLOW_SCOPE_TYPES: ScopeType[] = [
  "Company",
  "Branch",
  "Department",
  "SubDepartment",
  "Designation",
  "Grade",
  "EmploymentType",
  "Employee",
];

export default function ResignationFlowsSection() {
  const [rows, setRows] = useState<ResignationFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listFlows());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load flows.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(f: ResignationFlow) {
    if (!confirm(`Delete resignation flow "${f.name}"?`)) return;
    try {
      await deleteFlow(f.id);
      toast.success("Flow deleted.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={primaryBtn} onClick={() => setAddOpen(true)} type="button">
          <Plus className="w-4 h-4" /> Add Flow
        </button>
      </div>

      <TableShell minWidth={760}>
        <thead>
          <tr>
            <th style={headStyle}>Name</th>
            <th style={headStyle}>Notice Period</th>
            <th style={headStyle}>Buyout</th>
            <th style={headStyle}>Default</th>
            <th style={headStyle}>Status</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow colSpan={6} text="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={6} text="No resignation flows configured." />
          ) : (
            rows.map((f) => (
              <tr key={f.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={{ ...cellStyle, fontWeight: 600, color: "#111827" }}>
                  {f.name}
                  {f.description && (
                    <span className="block text-[11px] font-normal text-gray-400">{f.description}</span>
                  )}
                </td>
                <td style={cellStyle}>{f.noticePeriodDays} days</td>
                <td style={cellStyle}>{f.buyoutAllowed ? "Allowed" : "Not allowed"}</td>
                <td style={cellStyle}>{f.isDefault ? "Yes" : "—"}</td>
                <td style={cellStyle}>
                  {f.isActive ? (
                    <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
                  ) : (
                    <StatusPill bg="#f3f4f6" color="#6b7280" label="Inactive" />
                  )}
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <div className="flex items-center justify-end gap-2">
                    <ActionBtn title="Edit" border="#e5e7eb" color="#6b7280" onClick={() => setEditId(f.id)}>
                      <Pencil size={15} />
                    </ActionBtn>
                    <ActionBtn title="Delete" border="#fca5a5" color="#dc2626" onClick={() => remove(f)}>
                      <Trash2 size={15} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>

      {(addOpen || editId != null) && (
        <FlowDialog
          flowId={editId}
          onClose={() => {
            setAddOpen(false);
            setEditId(null);
          }}
          onSaved={() => {
            setAddOpen(false);
            setEditId(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function FlowDialog({
  flowId,
  onClose,
  onSaved,
}: {
  flowId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [buyoutAllowed, setBuyoutAllowed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [scope, setScope] = useState<ScopeRowValue[]>([]);
  const [loading, setLoading] = useState(flowId != null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (flowId == null) return;
    (async () => {
      try {
        const f = await getFlow(flowId);
        setName(f.name);
        setDescription(f.description ?? "");
        setNoticePeriodDays(String(f.noticePeriodDays));
        setBuyoutAllowed(f.buyoutAllowed);
        setIsActive(f.isActive);
        setIsDefault(f.isDefault);
        setScope(
          f.scope.map((s) => ({ scopeType: s.scopeType as ScopeType, scopeId: s.scopeId, priority: s.priority })),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load flow.");
      } finally {
        setLoading(false);
      }
    })();
  }, [flowId]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Flow name is required.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        noticePeriodDays: Number(noticePeriodDays) || 0,
        buyoutAllowed,
        isActive,
        isDefault,
        scope: scope.map((s) => ({
          scopeType: s.scopeType as FlowScopeRow["scopeType"],
          scopeId: s.scopeId,
          priority: s.priority,
        })),
      };
      if (flowId != null) await updateFlow(flowId, body);
      else await createFlow(body);
      toast.success(flowId != null ? "Flow updated." : "Flow created.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save flow.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={flowId != null ? "Edit Resignation Flow" : "Add Resignation Flow"}
      subtitle="Notice period + the org units this flow applies to"
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div>
              <label className={labelClass}>Flow Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard 30-day Notice" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Notice Period (days)</label>
                <input className={inputClass} type="number" min={0} value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(e.target.value)} />
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <Toggle label="Notice buyout allowed" checked={buyoutAllowed} onChange={setBuyoutAllowed} />
                <Toggle label="Active" checked={isActive} onChange={setIsActive} />
                <Toggle label="Default flow (fallback)" checked={isDefault} onChange={setIsDefault} />
              </div>
            </div>
            <div className="pt-1">
              <ScopeRowsEditor
                rows={scope}
                availableTypes={FLOW_SCOPE_TYPES}
                onChange={setScope}
                title="Applies To"
                emptyHint="No scope rows — add one, or mark this as the default flow."
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy || loading} type="button">
          {busy ? "Saving…" : "Save Flow"}
        </button>
      </div>
    </DialogShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" className="w-4 h-4 accent-[#FF014F] cursor-pointer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
