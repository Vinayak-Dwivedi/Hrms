"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchScopeOptions, type ScopeOptionItem } from "@/components/scope/scope-lookups";
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

export default function ResignationFlowsSection() {
  const [rows, setRows] = useState<ResignationFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [branchMap, setBranchMap] = useState<Map<number, string>>(new Map());
  const [branches, setBranches] = useState<ScopeOptionItem[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [flows, branchList] = await Promise.all([
        listFlows(),
        fetchScopeOptions("Branch"),
      ]);
      setRows(flows);
      setBranches(branchList);
      setBranchMap(new Map(branchList.map((b) => [b.id, b.name])));
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

  function locationLabel(flow: ResignationFlow): string {
    const branchScopes = flow.scope.filter((s) => s.scopeType === "Branch" && s.scopeId != null);
    if (branchScopes.length === 0) return "—";
    if (branchScopes.length > 2) {
      return `${branchMap.get(branchScopes[0].scopeId!) ?? `#${branchScopes[0].scopeId}`} +${branchScopes.length - 1} more`;
    }
    return branchScopes.map((s) => branchMap.get(s.scopeId!) ?? `Branch #${s.scopeId}`).join(", ");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={primaryBtn} onClick={() => setAddOpen(true)} type="button">
          <Plus className="w-4 h-4" /> Add Flow
        </button>
      </div>

      <TableShell minWidth={820}>
        <thead>
          <tr>
            <th style={headStyle}>Name</th>
            <th style={headStyle}>Location</th>
            <th style={headStyle}>Notice Period</th>
            <th style={headStyle}>Buyout</th>
            <th style={headStyle}>Default</th>
            <th style={headStyle}>Status</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow colSpan={7} text="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={7} text="No resignation flows configured." />
          ) : (
            rows.map((f) => (
              <tr key={f.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={{ ...cellStyle, fontWeight: 600, color: "#111827" }}>
                  {f.name}
                  {f.description && (
                    <span className="block text-[11px] font-normal text-gray-400">{f.description}</span>
                  )}
                </td>
                <td style={{ ...cellStyle, color: "#6b7280", fontSize: 13 }}>{locationLabel(f)}</td>
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
          branches={branches}
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

// ── Branch scope table (replaces ScopeRowsEditor for location-only scope) ──

function BranchScopeTable({
  branchIds,
  branches,
  onChange,
}: {
  branchIds: number[];
  branches: ScopeOptionItem[];
  onChange: (ids: number[]) => void;
}) {
  function add() {
    const first = branches.find((b) => !branchIds.includes(b.id)) ?? branches[0];
    if (first) onChange([...branchIds, first.id]);
  }

  function remove(idx: number) {
    onChange(branchIds.filter((_, i) => i !== idx));
  }

  function change(idx: number, newId: number) {
    const next = [...branchIds];
    next[idx] = newId;
    onChange(next);
  }

  return (
    <div>
      <label className={labelClass}>Applies To (Locations)</label>
      {branchIds.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">
          No specific locations — flow applies to all locations by default.
        </p>
      ) : (
        <div className="border border-gray-200 rounded overflow-hidden mb-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Branch / Location
                </th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {branchIds.map((bId, idx) => (
                <tr key={idx} className={idx > 0 ? "border-t border-gray-100" : ""}>
                  <td className="px-3 py-2">
                    <select
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-400"
                      value={bId}
                      onChange={(e) => change(idx, Number(e.target.value))}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={add}
        disabled={branches.length === 0}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={13} /> Add Location
      </button>
      {branches.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">No branches configured yet.</p>
      )}
    </div>
  );
}

// ── Add / Edit dialog ──

function FlowDialog({
  flowId,
  branches,
  onClose,
  onSaved,
}: {
  flowId: number | null;
  branches: ScopeOptionItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");
  const [buyoutAllowed, setBuyoutAllowed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [branchIds, setBranchIds] = useState<number[]>([]);
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
        setBranchIds(
          f.scope
            .filter((s) => s.scopeType === "Branch" && s.scopeId != null)
            .map((s) => s.scopeId!),
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
        scope: branchIds.map((id) => ({
          scopeType: "Branch" as FlowScopeRow["scopeType"],
          scopeId: id,
          priority: 100,
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
      subtitle="Notice period + the locations this flow applies to"
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
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard 30-day Notice"
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Notice Period (days)</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <Toggle label="Notice buyout allowed" checked={buyoutAllowed} onChange={setBuyoutAllowed} />
                <Toggle label="Active" checked={isActive} onChange={setIsActive} />
                <Toggle label="Default flow (fallback for all locations)" checked={isDefault} onChange={setIsDefault} />
              </div>
            </div>
            <BranchScopeTable branchIds={branchIds} branches={branches} onChange={setBranchIds} />
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryBtn} onClick={submit} disabled={busy || loading} type="button">
          {busy ? "Saving…" : "Save Flow"}
        </button>
      </div>
    </DialogShell>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)] cursor-pointer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
