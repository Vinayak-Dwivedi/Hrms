"use client";

import { Check, CheckCircle2, Eye, XCircle } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  approveOnboarding,
  computeOnboardingPipeline,
  fetchEmployeeOnboarding,
  HR_VERIFICATION_DOCUMENTS,
  invalidateToken,
  regenerateToken,
  verifyDocument,
  type OnboardingDocument,
  type OnboardingTimeline,
} from "../api/hr-onboarding.client";
import { employeeIconMd, employeeViewIconBtnClass } from "../employee-theme";
import {
  onboardingChecklistDoneClass,
  onboardingChecklistItemClass,
  onboardingChecklistMarkDoneClass,
  onboardingChecklistMarkPendingClass,
  onboardingDocTableCellClass,
  onboardingDocTableHeadClass,
  onboardingPrimaryBtnClass,
  onboardingStatusBannerInfoClass,
  onboardingStatusBannerSuccessClass,
  onboardingStatusBannerWarningClass,
} from "../onboarding-admin-theme";
import {
  ONBOARDING_BANK_ACCESS_PERMISSIONS,
  ONBOARDING_PANEL_ACCESS_PERMISSIONS,
  ONBOARDING_PERMISSIONS,
} from "@/features/onboarding/constants/permissions";
import { useAuth } from "@/lib/auth-context";
import OnboardingBankPanel from "./OnboardingBankPanel";
import OnboardingBehalfPanel from "./OnboardingBehalfPanel";
import OnboardingDocumentPreviewModal from "./OnboardingDocumentPreviewModal";
import OnboardingPipelineSteps from "./OnboardingPipelineSteps";
import OnboardingReviewSection from "./OnboardingReviewSection";
import RejectDocumentDialog from "./RejectDocumentDialog";

interface Props {
  employeeId: number;
  variant?: "embedded" | "page";
  sideContent?: ReactNode;
  onUpdated?: () => void;
  onOnboardingCompleted?: () => void;
  onTimelineLoaded?: (timeline: OnboardingTimeline) => void;
}

const STATUS_CLASS: Record<string, string> = {
  Uploaded: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  Verified: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  Rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const denyIconBtnClass =
  "text-red-600 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function hasOnboardingPanelAccess(
  hasAnyPermission: (codes: string[]) => boolean,
): boolean {
  return hasAnyPermission([...ONBOARDING_PANEL_ACCESS_PERMISSIONS]);
}

function stepStatusFor(
  stepNumber: number,
  currentStep: number,
  isCompleted: boolean,
): "default" | "active" | "complete" {
  if (isCompleted) return "complete";
  if (stepNumber < currentStep) return "complete";
  if (stepNumber === currentStep) return "active";
  return "default";
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={`${onboardingChecklistItemClass} ${done ? onboardingChecklistDoneClass : ""}`}
    >
      {done ? (
        <span className={onboardingChecklistMarkDoneClass} aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <span className={onboardingChecklistMarkPendingClass} aria-hidden />
      )}
      {label}
    </li>
  );
}

export default function OnboardingAdminPanel({
  employeeId,
  variant = "embedded",
  sideContent,
  onUpdated,
  onOnboardingCompleted,
  onTimelineLoaded,
}: Props) {
  const { hasAnyPermission, hasPermission } = useAuth();

  const canAccessPanel = hasOnboardingPanelAccess(hasAnyPermission);
  const canViewStatus = hasAnyPermission(["onboarding.view", "employees.view"]);
  const canManageOnBehalf = hasAnyPermission([ONBOARDING_PERMISSIONS.MANAGE]);
  const canResendInvitation = hasAnyPermission([
    ONBOARDING_PERMISSIONS.RESEND_INVITATION,
  ]);
  const canManageOnboarding = hasAnyPermission([ONBOARDING_PERMISSIONS.MANAGE]);
  const canVerifyDocuments = hasAnyPermission([
    ONBOARDING_PERMISSIONS.VERIFY_DOCUMENTS,
  ]);
  const canManageBank = hasAnyPermission([...ONBOARDING_BANK_ACCESS_PERMISSIONS]);

  const [timeline, setTimeline] = useState<OnboardingTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<OnboardingDocument | null>(null);
  const [approveNotes, setApproveNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployeeOnboarding(employeeId);
      setTimeline(data);
      onTimelineLoaded?.(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [employeeId, onTimelineLoaded]);

  useEffect(() => {
    if (!canAccessPanel) return;
    void load();
  }, [canAccessPanel, load]);

  async function runAction(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setActionMsg(null);
    try {
      await fn();
      if (key === "approve") {
        onOnboardingCompleted?.();
        return;
      }
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
    setActionMsg(
      "Document denied. Employee data is unlocked for corrections and resubmission.",
    );
    void load();
    onUpdated?.();
  }

  if (!canAccessPanel) return null;
  if (loading) {
    return <p className="text-sm text-gray-500 m-0">Loading onboarding…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 m-0">{error}</p>;
  }
  if (!timeline) return null;

  const pipeline = computeOnboardingPipeline(timeline);
  const isPage = variant === "page";
  const showInvitationActions = canResendInvitation || canManageOnboarding;

  const statusLine = pipeline.isCompleted ? (
    <>
      Completed
      {timeline.completedAt && (
        <> · {new Date(timeline.completedAt).toLocaleString("en-IN")}</>
      )}
    </>
  ) : pipeline.isSubmitted ? (
    <>
      Submitted for review
      {timeline.submittedAt && (
        <> · {new Date(timeline.submittedAt).toLocaleString("en-IN")}</>
      )}
    </>
  ) : (
    <>{timeline.onboardingStatus}</>
  );

  const documentVerificationSection =
    !pipeline.isCompleted && timeline.documents.length > 0 ? (
      <OnboardingReviewSection
        step={2}
        title="Verify documents"
        description="Review and approve each required document."
        status={stepStatusFor(
          2,
          pipeline.currentStep,
          pipeline.requiredVerified,
        )}
      >
        {!canVerifyDocuments && pipeline.isSubmitted && (
          <p className="text-xs text-amber-700 mb-3 m-0">
            Document verification requires onboarding.verify_documents permission.
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full border-collapse min-w-[280px]">
            <thead>
              <tr>
                <th className={onboardingDocTableHeadClass}>Document</th>
                <th className={onboardingDocTableHeadClass}>Status</th>
                <th
                  className={`${onboardingDocTableHeadClass} text-right w-[100px]`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timeline.documents.map((doc) => {
                const isRequired = (
                  HR_VERIFICATION_DOCUMENTS as readonly string[]
                ).includes(doc.documentType);
                return (
                  <tr key={doc.id} className="bg-white hover:bg-gray-50/60">
                    <td className={onboardingDocTableCellClass}>
                      <p className="font-medium text-gray-900 m-0">
                        {doc.documentType}
                        {isRequired && (
                          <span className="text-red-500 font-normal"> *</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 m-0 truncate max-w-[200px]">
                        {doc.originalFilename}
                      </p>
                      {doc.status === "Rejected" && doc.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1 m-0">
                          {doc.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className={onboardingDocTableCellClass}>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CLASS[doc.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className={`${onboardingDocTableCellClass} text-right`}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`View ${doc.documentType}`}
                          title="View"
                          className={employeeViewIconBtnClass}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye className={employeeIconMd} />
                        </button>
                        {canVerifyDocuments &&
                          pipeline.isSubmitted &&
                          doc.status === "Uploaded" && (
                            <>
                              <button
                                type="button"
                                aria-label={`Approve ${doc.documentType}`}
                                title="Approve"
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
                              <button
                                type="button"
                                aria-label={`Deny ${doc.documentType}`}
                                title="Deny"
                                disabled={!!busy}
                                className={denyIconBtnClass}
                                onClick={() => setRejectDoc(doc)}
                              >
                                <XCircle className={employeeIconMd} />
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pipeline.isSubmitted && pipeline.missingVerified.length > 0 && (
          <p className="text-xs text-gray-600 mt-3 mb-0">
            Pending verification: {pipeline.missingVerified.join(", ")}
          </p>
        )}
      </OnboardingReviewSection>
    ) : null;

  const markCompleteSection =
    !pipeline.isCompleted && pipeline.isSubmitted && canManageOnboarding ? (
      <OnboardingReviewSection
        step={4}
        title="Complete onboarding"
        description="Finalize onboarding after employee data, documents, and bank details are approved."
        status={stepStatusFor(4, pipeline.currentStep, pipeline.isCompleted)}
      >
        <ul className="space-y-2.5 m-0 p-0 list-none mb-4">
          <ChecklistRow
            done={pipeline.isSubmitted}
            label="Employee data submitted"
          />
          {HR_VERIFICATION_DOCUMENTS.map((type) => {
            const status = timeline.documents.find(
              (d) => d.documentType === type,
            )?.status;
            return (
              <ChecklistRow
                key={type}
                done={status === "Verified"}
                label={`${type} verified`}
              />
            );
          })}
          <ChecklistRow
            done={pipeline.bankApproved}
            label="Bank details approved"
          />
        </ul>

        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Review notes (optional)
        </label>
        <textarea
          value={approveNotes}
          onChange={(e) => setApproveNotes(e.target.value)}
          placeholder="Add internal notes for this onboarding completion"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-y mb-3 focus:outline-none focus:ring-1 focus:ring-slate-300"
          disabled={!pipeline.canMarkComplete || !!busy}
        />

        <button
          type="button"
          disabled={!pipeline.canMarkComplete || !!busy}
          onClick={() =>
            void runAction("approve", () =>
              approveOnboarding(employeeId, approveNotes.trim() || undefined),
            )
          }
          className={onboardingPrimaryBtnClass}
        >
          Mark onboarding complete
        </button>

        {!pipeline.canMarkComplete && (
          <p className="text-xs text-gray-600 mt-2 mb-0">
            Complete all checklist items above before finalizing.
          </p>
        )}
      </OnboardingReviewSection>
    ) : null;

  const invitationSection =
    showInvitationActions && !pipeline.isCompleted ? (
      <details className="rounded-lg border border-gray-200 bg-white text-sm">
        <summary className="cursor-pointer px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">
          Invitation management
        </summary>
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1 border-t border-gray-100">
          {canResendInvitation && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                void runAction("regen", () =>
                  regenerateToken(employeeId, { sendEmail: true }),
                )
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              Regenerate &amp; email
            </button>
          )}
          {canManageOnboarding && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                void runAction("invalidate", () => invalidateToken(employeeId))
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              Invalidate token
            </button>
          )}
        </div>
      </details>
    ) : null;

  const bankPanelSection =
    !pipeline.isCompleted && pipeline.isSubmitted ? (
      <OnboardingBankPanel
        employeeId={employeeId}
        canManageBank={canManageBank}
        isSubmitted={pipeline.isSubmitted}
        stepStatus={stepStatusFor(3, pipeline.currentStep, pipeline.bankApproved)}
        onUpdated={() => {
          void load();
          onUpdated?.();
        }}
      />
    ) : null;

  const behalfPanelSection =
    !pipeline.isCompleted && canManageOnBehalf && !pipeline.isSubmitted ? (
      <OnboardingBehalfPanel
        employeeId={employeeId}
        onboardingStatus={timeline.onboardingStatus}
        submittedAt={timeline.submittedAt}
        layout="flat"
        onUpdated={() => {
          void load();
          onUpdated?.();
        }}
      />
    ) : null;

  const alertBanners = (
    <>
      {pipeline.isCompleted && (
        <div className={onboardingStatusBannerSuccessClass}>
          Onboarding is complete. No further action is required.
        </div>
      )}
      {!pipeline.isCompleted && pipeline.hasRejected && !pipeline.isSubmitted && (
        <div className={onboardingStatusBannerWarningClass}>
          A document was rejected. Update employee data and submit again before
          continuing review.
        </div>
      )}
      {!pipeline.isCompleted && pipeline.isSubmitted && (
        <div className={onboardingStatusBannerInfoClass}>
          <strong className="font-semibold">Review in progress.</strong> Verify
          documents, approve bank details, then mark onboarding complete.
        </div>
      )}
    </>
  );

  const hasReviewSidebar = Boolean(
    documentVerificationSection ||
      bankPanelSection ||
      markCompleteSection ||
      invitationSection,
  );

  const reviewSidebar = (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 m-0 px-1">
        HR actions
      </p>
      {documentVerificationSection}
      {bankPanelSection}
      {markCompleteSection}
      {invitationSection}
      {actionMsg && (
        <p className="text-xs text-gray-600 m-0 px-1">{actionMsg}</p>
      )}
    </aside>
  );

  const profilePanel = sideContent ? (
    <div className="min-w-0">{sideContent}</div>
  ) : null;

  return (
    <>
      <div
        className={[
          "space-y-5",
          variant === "embedded" ? "border-t border-gray-100 pt-4 mt-4" : "",
        ].join(" ")}
      >
        {variant === "embedded" && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 m-0">
              Employee onboarding
            </h3>
            {canViewStatus && (
              <p className="text-sm text-gray-600 mt-1 mb-0">{statusLine}</p>
            )}
          </div>
        )}

        {alertBanners}

        <OnboardingPipelineSteps
          steps={pipeline.steps}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          layout={isPage ? "horizontal" : "vertical"}
        />

        {isPage ? (
          pipeline.isSubmitted || pipeline.isCompleted ? (
            hasReviewSidebar ? (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(300px,380px)_1fr] gap-6 items-start">
                {reviewSidebar}
                {profilePanel ?? (
                  <p className="text-sm text-gray-500 m-0">
                    No submitted profile data to display.
                  </p>
                )}
              </div>
            ) : (
              profilePanel
            )
          ) : (
            <div className="space-y-4">
              {behalfPanelSection}
              {invitationSection}
            </div>
          )
        ) : (
          <>
            {behalfPanelSection}
            {documentVerificationSection}
            {bankPanelSection}
            {markCompleteSection}
            {invitationSection}
            {actionMsg && <p className="text-xs text-gray-600 m-0">{actionMsg}</p>}
          </>
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
