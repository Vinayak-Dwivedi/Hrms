"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  type ExitInterviewResponse,
  submitMyExitInterview,
} from "@/features/offboarding/api/offboarding.client";
import ExitQuestionField from "@/features/offboarding/ExitQuestionField";
import { DialogShell, ghostBtn, primaryBtn } from "@/features/offboarding/offboarding-ui";

export default function ExitSurveyDialog({
  response,
  onClose,
  onSubmitted,
}: {
  response: ExitInterviewResponse;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const questions = response.template?.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, unknown>>(response.answers ?? {});
  const [busy, setBusy] = useState(false);

  function setAnswer(id: string, v: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  }

  function isAnswered(id: string): boolean {
    const v = answers[id];
    if (v == null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  async function submit() {
    const missing = questions.filter((q) => q.required && !isAnswered(q.id));
    if (missing.length > 0) {
      toast.error(`Please answer: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      await submitMyExitInterview(response.id, answers);
      toast.success("Exit interview submitted. Thank you for your feedback!");
      onSubmitted?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={response.template?.name ?? "Exit Interview"}
      subtitle={response.template?.description ?? "Your feedback helps us improve."}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            This survey has no questions.
          </p>
        ) : (
          questions.map((q) => (
            <ExitQuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy || questions.length === 0} type="button">
          {busy ? "Submitting…" : "Submit Survey"}
        </button>
      </div>
    </DialogShell>
  );
}
