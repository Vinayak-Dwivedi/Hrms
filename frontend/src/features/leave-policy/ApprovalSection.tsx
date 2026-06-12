"use client";

// Approval Workflows — define named, ordered approver chains (Manager →
// Department Head → HR) and assign them to a Leave Policy. A leave request then
// walks the assigned workflow one approver at a time. Table + modal dialog,
// matching the Leave Types / Leave Policies tabs.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow,
  STAGE_LABELS,
  type ApprovalWorkflow,
  type WorkflowStage,
} from "./api/approval-workflows.client";

const ALL_STAGES: WorkflowStage[] = ["Manager", "DeptHead", "HR"];

export default function ApprovalSection() {
  const [items, setItems] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ApprovalWorkflow | "new" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listWorkflows());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(w: ApprovalWorkflow) {
    if (!confirm(`Delete workflow "${w.name}"?`)) return;
    try {
      await deleteWorkflow(w.id);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <section className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
            Approval Workflows
          </h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
            Ordered approver chains. Assign one to a policy on the Leave Policies
            tab — leave requests then walk it stage by stage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setDialog("new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
          >
            <Plus size={13} /> Create Workflow
          </button>
        </div>
      </section>

      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <Th>Name</Th>
              <Th>Approval Chain</Th>
              <Th className="text-center">Status</Th>
              <Th className="text-right pr-6">Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <Loader2 size={18} className="animate-spin inline mr-2" /> Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400 text-[12.5px]">
                  No workflows yet. Click “Create Workflow”.
                </td>
              </tr>
            )}
            {items.map((w) => (
              <tr key={w.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <Td>
                  <div className="font-semibold text-gray-900">{w.name}</div>
                  {w.description && (
                    <div className="text-[11.5px] text-gray-500 line-clamp-1 max-w-[280px]">
                      {w.description}
                    </div>
                  )}
                </Td>
                <Td>
                  <StageChain stages={w.stages} />
                </Td>
                <Td className="text-center">
                  <span
                    className={[
                      "inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border",
                      w.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200",
                    ].join(" ")}
                  >
                    {w.isActive ? "Active" : "Inactive"}
                  </span>
                </Td>
                <Td className="text-right pr-6">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDialog(w)}
                      title="Edit"
                      className="text-[#FF014F] hover:text-[#eb0249]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(w)}
                      title="Delete"
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <WorkflowDialog
        key={dialog === null ? "closed" : dialog === "new" ? "new" : `edit-${dialog.id}`}
        target={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          refresh();
        }}
      />
    </div>
  );
}

function StageChain({ stages }: { stages: WorkflowStage[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-semibold text-gray-400">Employee</span>
      {stages.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-gray-300">→</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-[#be185d] border border-pink-100">
            {STAGE_LABELS[s]}
          </span>
        </span>
      ))}
      <span className="text-gray-300">→</span>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        Approved
      </span>
    </div>
  );
}

function WorkflowDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ApprovalWorkflow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = target !== null && target !== "new";
  const [name, setName] = useState(editing ? target.name : "");
  const [description, setDescription] = useState(editing ? (target.description ?? "") : "");
  const [stages, setStages] = useState<WorkflowStage[]>(editing ? target.stages : ["Manager"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (target === null) return null;
  const editId = target !== "new" ? target.id : null;

  function move(i: number, dir: -1 | 1) {
    setStages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  async function save() {
    if (!name.trim() || stages.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        stages,
        isActive: true,
      };
      if (editId != null) await updateWorkflow(editId, body);
      else await createWorkflow(body);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1100] bg-black/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-[17px] font-bold text-gray-900">
            {editing ? "Edit Workflow" : "Create Workflow"}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <Field label="Workflow Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corporate Workflow"
              autoFocus
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
            />
          </Field>
          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
            />
          </Field>

          <Field label="Approval Stages (in order)">
            <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-gray-50/60 p-2">
              {stages.length === 0 && (
                <p className="text-[12px] text-gray-400 px-1 py-2">
                  Add at least one stage.
                </p>
              )}
              {stages.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5"
                >
                  <span className="w-5 h-5 shrink-0 rounded-full bg-[#be185d] text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[12.5px] font-semibold text-gray-800">
                    {STAGE_LABELS[s]}
                  </span>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === stages.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStages((p) => p.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] text-gray-400 mr-1">Add:</span>
                {ALL_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStages((p) => [...p, s])}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#FF014F] hover:text-[#eb0249] border border-pink-100 bg-pink-50 px-2 py-1 rounded-lg"
                  >
                    <Plus size={11} /> {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </Field>

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
            onClick={save}
            disabled={saving || !name.trim() || stages.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editing ? "Save Changes" : "Create Workflow"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-gray-700">{label}</label>
      {children}
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
