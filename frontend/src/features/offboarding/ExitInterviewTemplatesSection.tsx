"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createExitTemplate,
  deleteExitTemplate,
  EXIT_QUESTION_TYPE_LABEL,
  type ExitInterviewTemplate,
  type ExitQuestion,
  type ExitQuestionType,
  getExitTemplate,
  listExitTemplates,
  updateExitTemplate,
} from "@/features/offboarding/api/offboarding.client";
import {
  ActionBtn,
  DialogShell,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
} from "@/features/offboarding/offboarding-ui";

const TYPE_ORDER: ExitQuestionType[] = [
  "comments",
  "single_choice",
  "multiple_choice",
  "yes_no",
  "star",
  "rating_scale",
  "nps",
  "date",
];

function newQuestion(): ExitQuestion {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `q_${crypto.randomUUID().slice(0, 8)}`
      : `q_${Math.floor(Math.random() * 1e9)}`;
  return { id, type: "comments", label: "", required: false };
}

export default function ExitInterviewTemplatesSection() {
  const [rows, setRows] = useState<ExitInterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listExitTemplates());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(t: ExitInterviewTemplate) {
    if (!confirm(`Delete exit interview template "${t.name}"?`)) return;
    try {
      await deleteExitTemplate(t.id);
      toast.success("Template deleted.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={primaryBtn} onClick={() => setAddOpen(true)} type="button">
          <Plus className="w-4 h-4" /> Add Template
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">No templates yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-gray-900 leading-tight">{t.name}</h3>
                  {t.description && (
                    <p className="text-[11.5px] text-gray-400 mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ActionBtn title="Edit" border="#e5e7eb" color="#6b7280" onClick={() => setEditId(t.id)}>
                    <span className="text-[11px] font-semibold">Edit</span>
                  </ActionBtn>
                  <ActionBtn title="Delete" border="#fca5a5" color="#dc2626" onClick={() => remove(t)}>
                    <Trash2 size={15} />
                  </ActionBtn>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <StatusPill bg="#eef2ff" color="#4338ca" label={`${t.questions.length} questions`} />
                {t.isDefault && <StatusPill bg="#fce7f3" color="#be185d" label="Default" />}
                {t.isActive ? (
                  <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
                ) : (
                  <StatusPill bg="#f3f4f6" color="#6b7280" label="Inactive" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(addOpen || editId != null) && (
        <TemplateBuilderDialog
          templateId={editId}
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

function TemplateBuilderDialog({
  templateId,
  onClose,
  onSaved,
}: {
  templateId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [questions, setQuestions] = useState<ExitQuestion[]>([newQuestion()]);
  const [loading, setLoading] = useState(templateId != null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (templateId == null) return;
    (async () => {
      try {
        const t = await getExitTemplate(templateId);
        setName(t.name);
        setDescription(t.description ?? "");
        setIsActive(t.isActive);
        setIsDefault(t.isDefault);
        setQuestions(t.questions.length ? t.questions : [newQuestion()]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load template.");
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  function patchQuestion(i: number, patch: Partial<ExitQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const cleaned = questions
      .map((q) => ({ ...q, label: q.label.trim() }))
      .filter((q) => q.label);
    if (cleaned.length === 0) {
      toast.error("Add at least one question with a label.");
      return;
    }
    for (const q of cleaned) {
      if ((q.type === "single_choice" || q.type === "multiple_choice") && (!q.options || q.options.length === 0)) {
        toast.error(`"${q.label}" needs at least one option.`);
        return;
      }
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        questions: cleaned,
        isActive,
        isDefault,
      };
      if (templateId != null) await updateExitTemplate(templateId, body);
      else await createExitTemplate(body);
      toast.success(templateId != null ? "Template updated." : "Template created.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={templateId != null ? "Edit Exit Interview Template" : "New Exit Interview Template"}
      subtitle="Build a survey from the available question types"
      maxWidth="max-w-3xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Template Name</label>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Exit Interview" />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="flex items-center gap-5">
              <Toggle label="Active" checked={isActive} onChange={setIsActive} />
              <Toggle label="Default template" checked={isDefault} onChange={setIsDefault} />
            </div>

            <div className="space-y-3">
              <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">Questions</p>
              {questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  index={i}
                  question={q}
                  onPatch={(patch) => patchQuestion(i, patch)}
                  onRemove={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                />
              ))}
              <button
                type="button"
                onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
                className={`${ghostBtn} w-full justify-center`}
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy || loading} type="button">
          {busy ? "Saving…" : "Save Template"}
        </button>
      </div>
    </DialogShell>
  );
}

function QuestionEditor({
  index,
  question,
  onPatch,
  onRemove,
}: {
  index: number;
  question: ExitQuestion;
  onPatch: (patch: Partial<ExitQuestion>) => void;
  onRemove: () => void;
}) {
  const hasOptions = question.type === "single_choice" || question.type === "multiple_choice";
  const hasScale = question.type === "star" || question.type === "rating_scale";
  const [optDraft, setOptDraft] = useState("");

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-gray-400 w-6 shrink-0">Q{index + 1}</span>
        <input
          className={inputClass}
          value={question.label}
          onChange={(e) => onPatch({ label: e.target.value })}
          placeholder="Question text…"
        />
        <button
          type="button"
          title="Remove"
          onClick={onRemove}
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 38, height: 38, border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff" }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pl-8">
        <select
          className="h-[34px] px-2 border border-gray-300 rounded-md text-sm bg-white"
          value={question.type}
          onChange={(e) => {
            const type = e.target.value as ExitQuestionType;
            const next: Partial<ExitQuestion> = { type };
            if (type !== "single_choice" && type !== "multiple_choice") next.options = undefined;
            if (type !== "star" && type !== "rating_scale") next.scaleMax = undefined;
            if ((type === "single_choice" || type === "multiple_choice") && !question.options)
              next.options = [];
            if ((type === "star" || type === "rating_scale") && !question.scaleMax)
              next.scaleMax = 5;
            onPatch(next);
          }}
        >
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {EXIT_QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </select>

        {hasScale && (
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            Max
            <input
              type="number"
              min={2}
              max={10}
              value={question.scaleMax ?? 5}
              onChange={(e) => onPatch({ scaleMax: Number(e.target.value) || 5 })}
              className="w-16 h-[34px] px-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
        )}

        <Toggle label="Required" checked={question.required} onChange={(v) => onPatch({ required: v })} />
      </div>

      {hasOptions && (
        <div className="pl-8 space-y-2">
          {(question.options ?? []).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input
                className={inputClass}
                value={opt}
                onChange={(e) =>
                  onPatch({
                    options: (question.options ?? []).map((o, idx) => (idx === oi ? e.target.value : o)),
                  })
                }
              />
              <button
                type="button"
                onClick={() => onPatch({ options: (question.options ?? []).filter((_, idx) => idx !== oi) })}
                className="flex items-center justify-center rounded-lg shrink-0"
                style={{ width: 36, height: 36, border: "1.5px solid #e5e7eb", color: "#6b7280", background: "#fff" }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              className={inputClass}
              value={optDraft}
              onChange={(e) => setOptDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && optDraft.trim()) {
                  e.preventDefault();
                  onPatch({ options: [...(question.options ?? []), optDraft.trim()] });
                  setOptDraft("");
                }
              }}
              placeholder="Add an option…"
            />
            <button
              type="button"
              onClick={() => {
                if (!optDraft.trim()) return;
                onPatch({ options: [...(question.options ?? []), optDraft.trim()] });
                setOptDraft("");
              }}
              className={`${ghostBtn} h-[38px]`}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
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
