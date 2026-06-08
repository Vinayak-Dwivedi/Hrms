"use client";

import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  approveOnboarding,
  fetchEmployeeOnboarding,
  invalidateToken,
  regenerateToken,
  verifyDocument,
  type OnboardingDocument,
  type OnboardingTimeline,
} from "../api/hr-onboarding.client";
import {
  employeeIconMd,
  employeeViewIconBtnClass,
} from "../employee-theme";
import OnboardingDocumentPreviewModal from "./OnboardingDocumentPreviewModal";
import RejectDocumentDialog from "./RejectDocumentDialog";

interface Props {
  employeeId: number;
  onUpdated?: () => void;
}

const STATUS_CLASS: Record<string, string> = {
  Uploaded: "bg-blue-100 text-blue-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Verified: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const denyIconBtnClass =
  "text-red-600 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function OnboardingAdminPanel({
  employeeId,
  onUpdated,
}: Props) {
  const [timeline, setTimeline] = useState<OnboardingTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<OnboardingDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployeeOnboarding(employeeId);
      setTimeline(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setActionMsg(null);
    try {
      await fn();
      setActionMsg("Action completed.");
      await load();
      onUpdated?.();
    } catch (e) {
      setActionMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function handleRejected() {
    setActionMsg("Document denied.");
    void load();
    onUpdated?.();
  }

  if (loading) {
    return <p className="text-sm text-gray-500 m-0">Loading onboarding…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 m-0">{error}</p>;
  }
  if (!timeline) return null;

  const canApprove =
    timeline.onboardingStatus === "IN_PROGRESS" && timeline.submittedAt;

  return (
    <>
      <div className="space-y-4 border-t border-gray-100 pt-4 mt-4">
        <h3 className="text-sm font-semibold text-gray-900 m-0">
          Onboarding (HR)
        </h3>
        <p className="text-sm text-gray-600 m-0">
          Status: <strong>{timeline.onboardingStatus}</strong>
          {timeline.submittedAt && (
            <>
              {" "}
              · Submitted{" "}
              {new Date(timeline.submittedAt).toLocaleString("en-IN")}
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              void runAction("regen", () =>
                regenerateToken(employeeId, { sendEmail: true }),
              )
            }
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-200 bg-white"
          >
            Regenerate &amp; email
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              void runAction("invalidate", () => invalidateToken(employeeId))
            }
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-200 bg-white"
          >
            Invalidate token
          </button>
          {canApprove && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                void runAction("approve", () => approveOnboarding(employeeId))
              }
              className="px-3 py-1.5 text-xs font-semibold rounded text-white bg-pink-600 border-0"
            >
              Approve onboarding
            </button>
          )}
        </div>

        {timeline.documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 m-0">Documents</p>
            {timeline.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded border border-gray-100 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 m-0">
                    {doc.documentType}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CLASS[doc.status] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {doc.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1 m-0 truncate">
                    {doc.originalFilename}
                  </p>
                  {doc.status === "Rejected" && doc.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1 m-0">
                      Reason: {doc.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    aria-label={`View ${doc.documentType}`}
                    title="View document"
                    className={employeeViewIconBtnClass}
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <Eye className={employeeIconMd} />
                  </button>
                  {doc.status !== "Verified" && (
                    <button
                      type="button"
                      aria-label={`Approve ${doc.documentType}`}
                      title="Approve document"
                      disabled={!!busy}
                      className={employeeViewIconBtnClass}
                      onClick={() =>
                        void runAction(`v-${doc.id}`, () =>
                          verifyDocument(doc.id),
                        )
                      }
                    >
                      <CheckCircle2 className={employeeIconMd} />
                    </button>
                  )}
                  {doc.status !== "Rejected" && (
                    <button
                      type="button"
                      aria-label={`Deny ${doc.documentType}`}
                      title="Deny document"
                      disabled={!!busy}
                      className={denyIconBtnClass}
                      onClick={() => setRejectDoc(doc)}
                    >
                      <XCircle className={employeeIconMd} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {actionMsg && (
          <p className="text-xs text-gray-600 m-0">{actionMsg}</p>
        )}
      </div>

      <OnboardingDocumentPreviewModal
        open={previewDoc !== null}
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <RejectDocumentDialog
        open={rejectDoc !== null}
        document={rejectDoc}
        onClose={() => setRejectDoc(null)}
        onRejected={handleRejected}
      />
    </>
  );
}
