"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type ClearanceTemplate,
  clearanceTeamLabel,
  createClearanceTemplate,
  deleteClearanceTemplate,
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
  const [addOpen, setAddOpen] = useState(false);

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

  async function remove(t: ClearanceTemplate) {
    if (!confirm(`Delete the "${t.name}" clearance team? Its tasks won't be added to new cases.`)) {
      return;
    }
    try {
      await deleteClearanceTemplate(t.id);
      toast.success("Clearance team deleted.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-gray-500">
          Default task lists seeded into every new offboarding case, per team. Add your own
          clearance areas as needed.
        </p>
        <button className={primaryBtn} onClick={() => setAddOpen(true)} type="button">
          <Plus className="w-4 h-4" /> Add Clearance Team
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-gray-900 leading-tight">{t.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {clearanceTeamLabel(t.team)} ·{" "}
                    {t.scope.length === 0
                      ? "All departments"
                      : `${t.scope.length} dept/sub-dept scope${t.scope.length > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    title="Edit"
                    type="button"
                    onClick={() => setEditTarget(t)}
                    className="flex items-center justify-center rounded-lg transition-colors"
                    style={{ width: 32, height: 32, border: "1.5px solid #e5e7eb", color: "#6b7280", background: "#fff" }}
                  >
                    <Pencil size={14} />
                  </button>
                  {!t.isBuiltin && (
                    <button
                      title="Delete"
                      type="button"
                      onClick={() => remove(t)}
                      className="flex items-center justify-center rounded-lg transition-colors"
                      style={{ width: 32, height: 32, border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 flex-1">
                {t.tasks.map((task, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-[lab(36.9089%_35.0961_-85.6872)] shrink-0" />
                    {task}
                  </li>
                ))}
                {t.tasks.length === 0 && <li className="text-[12px] text-gray-400">No tasks.</li>}
              </ul>
              <div className="mt-4 flex items-center gap-2">
                {t.isActive ? (
                  <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
                ) : (
                  <StatusPill bg="#f3f4f6" color="#6b7280" label="Inactive" />
                )}
                {t.isBuiltin ? (
                  <StatusPill bg="#eef2ff" color="#4338ca" label="Built-in" />
                ) : (
                  <StatusPill bg="#fce7f3" color="#be185d" label="Custom" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(addOpen || editTarget) && (
        <TemplateDialog
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

function TemplateDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ClearanceTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = target != null;
  const [name, setName] = useState(target?.name ?? "");
  const [tasks, setTasks] = useState<string[]>(target?.tasks ?? []);
  const [isActive, setIsActive] = useState(target?.isActive ?? true);
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);

  // "Applies to" scope — checked departments / sub-departments.
  const [deptIds, setDeptIds] = useState<Set<number>>(
    () => new Set((target?.scope ?? []).filter((s) => s.scopeType === "Department").map((s) => s.scopeId)),
  );
  const [subDeptIds, setSubDeptIds] = useState<Set<number>>(
    () => new Set((target?.scope ?? []).filter((s) => s.scopeType === "SubDepartment").map((s) => s.scopeId)),
  );
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [subDepartments, setSubDepartments] = useState<
    { id: number; name: string; departmentId: number | null }[]
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const [dR, sR] = await Promise.all([
          fetch("/api/hrms/departments?limit=500", { credentials: "include" }),
          fetch("/api/hrms/sub-departments?limit=500", { credentials: "include" }),
        ]);
        const d = await dR.json();
        const s = await sR.json();
        setDepartments((d.data ?? []).map((x: { id: number; name: string }) => ({ id: x.id, name: x.name })));
        setSubDepartments(
          (s.data ?? []).map((x: { id: number; name: string; departmentId: number | null }) => ({
            id: x.id,
            name: x.name,
            departmentId: x.departmentId ?? null,
          })),
        );
      } catch {
        /* lookups are best-effort */
      }
    })();
  }, []);

  function toggle(setter: typeof setDeptIds, id: number) {
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

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
    const cleaned = tasks.map((t) => t.trim()).filter(Boolean);
    const scope = [
      ...Array.from(deptIds).map((id) => ({ scopeType: "Department" as const, scopeId: id })),
      ...Array.from(subDeptIds).map((id) => ({ scopeType: "SubDepartment" as const, scopeId: id })),
    ];
    setBusy(true);
    try {
      if (isEdit) {
        await updateClearanceTemplate(target!.id, { name: name.trim(), tasks: cleaned, isActive, scope });
      } else {
        await createClearanceTemplate({ name: name.trim(), tasks: cleaned, isActive, scope });
      }
      toast.success(isEdit ? "Clearance team saved." : "Clearance team created.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={isEdit ? `Edit ${target!.name}` : "New Clearance Team"}
      subtitle="Tasks here are seeded into new offboarding cases"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        <div>
          <label className={labelClass}>Team / Area Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Legal Clearance"
          />
          {!isEdit && (
            <p className="text-[11px] text-gray-400 mt-1">
              Tasks for a custom team are visible to super-admins/HR until a matching permission is
              granted.
            </p>
          )}
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
            {tasks.length === 0 && (
              <li className="text-[12px] text-gray-400">No tasks yet — add one below.</li>
            )}
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

        <div>
          <label className={labelClass}>Applies To (departments / sub-departments)</label>
          <p className="text-[11px] text-gray-400 mb-2">
            Leave everything unchecked to apply this clearance to <strong>all</strong> departments.
          </p>
          <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
            {departments.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-gray-400">No departments found.</div>
            ) : (
              departments.map((d) => {
                const subs = subDepartments.filter((s) => s.departmentId === d.id);
                return (
                  <div key={d.id} className="px-3 py-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)] cursor-pointer"
                        checked={deptIds.has(d.id)}
                        onChange={() => toggle(setDeptIds, d.id)}
                      />
                      <span className="text-[13px] font-medium text-gray-800">{d.name}</span>
                    </label>
                    {subs.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {subs.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 accent-[lab(36.9089%_35.0961_-85.6872)] cursor-pointer"
                              checked={subDeptIds.has(s.id)}
                              onChange={() => toggle(setSubDeptIds, s.id)}
                            />
                            <span className="text-[12px] text-gray-600">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)] cursor-pointer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className="text-sm text-gray-700">Active (seed into new cases)</span>
        </label>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy} type="button">
          {busy ? "Saving…" : isEdit ? "Save Team" : "Create Team"}
        </button>
      </div>
    </DialogShell>
  );
}
