"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CLEARANCE_TEAM_LABEL,
  type ClearanceTemplate,
  listClearanceTemplates,
  updateClearanceTemplate,
} from "@/features/offboarding/api/offboarding.client";
import {
  DialogShell,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
} from "@/features/offboarding/offboarding-ui";

export default function ClearanceTemplatesSection() {
  const [rows, setRows] = useState<ClearanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ClearanceTemplate | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listClearanceTemplates());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clearance templates.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-gray-500">
        Default task lists seeded into every new offboarding case, per team.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900 leading-tight">{t.name}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{CLEARANCE_TEAM_LABEL[t.team]}</p>
              </div>
              <button
                title="Edit"
                type="button"
                onClick={() => setEditTarget(t)}
                className="flex items-center justify-center rounded-lg transition-colors shrink-0"
                style={{ width: 32, height: 32, border: "1.5px solid #e5e7eb", color: "#6b7280", background: "#fff" }}
              >
                <Pencil size={14} />
              </button>
            </div>
            <ul className="mt-3 space-y-1.5 flex-1">
              {t.tasks.map((task, i) => (
                <li key={i} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF014F] shrink-0" />
                  {task}
                </li>
              ))}
              {t.tasks.length === 0 && <li className="text-[12px] text-gray-400">No tasks.</li>}
            </ul>
            <div className="mt-4">
              {t.isActive ? (
                <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
              ) : (
                <StatusPill bg="#f3f4f6" color="#6b7280" label="Inactive" />
              )}
            </div>
          </div>
        ))}
      </div>

      {editTarget && (
        <TemplateDialog
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function TemplateDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ClearanceTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(target.name);
  const [tasks, setTasks] = useState<string[]>(target.tasks);
  const [isActive, setIsActive] = useState(target.isActive);
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);

  function addTask() {
    const v = newTask.trim();
    if (!v) return;
    setTasks((prev) => [...prev, v]);
    setNewTask("");
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setBusy(true);
    try {
      await updateClearanceTemplate(target.team, { name: name.trim(), tasks, isActive });
      toast.success("Clearance template saved.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={`Edit ${CLEARANCE_TEAM_LABEL[target.team]}`}
      subtitle="Tasks here are seeded into new offboarding cases"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        <div>
          <label className={labelClass}>Template Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Tasks</label>
          <ul className="space-y-2">
            {tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={task}
                  onChange={(e) =>
                    setTasks((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))
                  }
                />
                <button
                  type="button"
                  title="Remove"
                  onClick={() => setTasks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex items-center justify-center rounded-lg shrink-0"
                  style={{ width: 38, height: 38, border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff" }}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2">
            <input
              className={inputClass}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Add a task…"
            />
            <button type="button" onClick={addTask} className={`${ghostBtn} h-[38px]`}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#FF014F] cursor-pointer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className="text-sm text-gray-700">Active (seed into new cases)</span>
        </label>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy} type="button">
          {busy ? "Saving…" : "Save Template"}
        </button>
      </div>
    </DialogShell>
  );
}
