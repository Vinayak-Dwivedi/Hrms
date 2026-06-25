"use client";

import { useEffect, useState } from "react";
import {
  rejectDocument,
  type OnboardingDocument,
} from "../api/hr-onboarding.client";
import EmployeeModalShell from "./EmployeeModalShell";
import { employeeInputClass } from "../employee-theme";

interface Props {
  open: boolean;
  document: OnboardingDocument | null;
  onClose: () => void;
  onRejected: () => void;
}

const MAX_REASON_LENGTH = 2000;

export default function RejectDocumentDialog({
  open,
  document,
  onClose,
  onRejected,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, document?.id]);

  async function handleSubmit() {
    if (!document) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Rejection reason is required.");
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(`Reason must be at most ${MAX_REASON_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await rejectDocument(document.id, trimmed);
      onRejected();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmployeeModalShell
      open={open}
      title={
        document
          ? `Reject — ${document.documentType}`
          : "Reject document"
      }
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 m-0">
          Enter a reason for rejecting{" "}
          <strong>{document?.originalFilename ?? "this document"}</strong>.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={MAX_REASON_LENGTH}
          placeholder="e.g. Document is blurry or incorrect document type"
          className={`${employeeInputClass} resize-y min-h-[100px]`}
          disabled={submitting}
        />
        {error && <p className="text-sm text-red-600 m-0">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 border-0 disabled:opacity-50"
          >
            {submitting ? "Rejecting…" : "Reject document"}
          </button>
        </div>
      </div>
    </EmployeeModalShell>
  );
}
