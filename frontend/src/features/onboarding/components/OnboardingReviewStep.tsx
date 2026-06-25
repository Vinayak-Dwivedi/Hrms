"use client";

import { useRouter } from "next/navigation";
import type {
  EmployeeProfile,
  OnboardingDocumentRow,
  OnboardingStatus,
} from "../api/onboarding.client";
import {
  onboardingBtnOutlineClass,
  onboardingBtnPrimaryClass,
  onboardingReadOnlyLabelClass,
  onboardingReadOnlyValueClass,
  onboardingStatusPendingClass,
  onboardingStatusRejectedClass,
  onboardingStatusUploadedClass,
  onboardingStatusVerifiedClass,
} from "../constants/onboarding-theme";
import {
  getOnboardingDocumentSections,
  hasRejectedOnboardingDocuments,
  isOnboardingDocumentReady,
} from "../constants/documents";
import {
  buildOnboardingSubmitChecklist,
  isOnboardingSubmitReady,
} from "../lib/onboarding-checklist";
import type { OnboardingProfileValues } from "../schemas/onboarding.schema";
import OnboardingBankReadOnly from "./OnboardingBankReadOnly";
import OnboardingDocumentPreview from "./OnboardingDocumentPreview";
import OnboardingReviewSummaryCard from "./OnboardingReviewSummaryCard";
import OnboardingSubmitChecklist from "./OnboardingSubmitChecklist";

type DocStatus = OnboardingDocumentRow["status"];

interface Props {
  profile: OnboardingProfileValues;
  bank: EmployeeProfile["bank"];
  status: OnboardingStatus;
  completing: boolean;
  submitButtonLabel?: string;
  onComplete: () => void;
  onEditProfile?: () => void;
  onEditDocuments?: () => void;
  onEditBank?: () => void;
  fetchDocument?: (
    documentId: string,
  ) => Promise<{ blob: Blob; mimeType: string; filename: string }>;
}

const STATUS_CLASS: Record<DocStatus, string> = {
  Pending: onboardingStatusPendingClass,
  Uploaded: onboardingStatusUploadedClass,
  Verified: onboardingStatusVerifiedClass,
  Rejected: onboardingStatusRejectedClass,
};

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={onboardingReadOnlyLabelClass}>{label}</dt>
      <dd className={onboardingReadOnlyValueClass}>{value || "—"}</dd>
    </div>
  );
}

export default function OnboardingReviewStep({
  profile,
  bank,
  status,
  completing,
  submitButtonLabel = "Submit to HR for Review",
  onComplete,
  onEditProfile,
  onEditDocuments,
  onEditBank,
  fetchDocument,
}: Props) {
  const router = useRouter();
  const hasRejected = hasRejectedOnboardingDocuments(status.documents);
  const checklistItems = buildOnboardingSubmitChecklist(status);
  const canSubmit = isOnboardingSubmitReady(checklistItems);

  function findDocument(docType: string) {
    return status.documents.find((document) => document.documentType === docType);
  }

  function goToStep(step: "profile" | "documents" | "bank") {
    router.replace(`/employee/onboarding/profile?step=${step}`);
  }

  const documentSections = getOnboardingDocumentSections(status.academic);
  const docsComplete = status.pendingDocuments.length === 0 && !hasRejected;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 m-0">
            Review &amp; Submit
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-0">
            Confirm your profile, documents, and bank details before submitting
            to HR.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (onEditProfile ? onEditProfile() : goToStep("profile"))}
            className={onboardingBtnOutlineClass}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() =>
              onEditDocuments ? onEditDocuments() : goToStep("documents")
            }
            className={onboardingBtnOutlineClass}
          >
            Edit Documents
          </button>
          <button
            type="button"
            onClick={() => (onEditBank ? onEditBank() : goToStep("bank"))}
            className={onboardingBtnOutlineClass}
          >
            Edit Bank
          </button>
        </div>
      </div>

      <OnboardingReviewSummaryCard
        number={1}
        title="Personal & contact"
        statusLabel={status.profileComplete ? "Complete" : "Incomplete"}
        statusTone={status.profileComplete ? "complete" : "pending"}
        onEdit={() => (onEditProfile ? onEditProfile() : goToStep("profile"))}
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyRow label="Current address" value={profile.currentAddress} />
          <ReadOnlyRow
            label="Permanent address"
            value={profile.permanentAddress}
          />
          <ReadOnlyRow
            label="Emergency contact"
            value={profile.emergencyContactName}
          />
          <ReadOnlyRow
            label="Emergency phone"
            value={profile.emergencyContactPhone}
          />
          <ReadOnlyRow label="Marital status" value={profile.maritalStatus} />
          {profile.maritalStatus === "Married" ? (
            <ReadOnlyRow label="Spouse name" value={profile.spouseName ?? ""} />
          ) : null}
        </dl>
      </OnboardingReviewSummaryCard>

      <OnboardingReviewSummaryCard
        number={2}
        title="Identity & compliance"
        statusLabel={status.profileComplete ? "Complete" : "Incomplete"}
        statusTone={status.profileComplete ? "complete" : "pending"}
        onEdit={() => (onEditProfile ? onEditProfile() : goToStep("profile"))}
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyRow label="PAN number" value={profile.panNo} />
          <ReadOnlyRow label="Aadhaar number" value={profile.aadhaarNo} />
          <ReadOnlyRow label="UAN" value={profile.uanNo ?? ""} />
          <ReadOnlyRow label="ESIC" value={profile.esicNo ?? ""} />
          <ReadOnlyRow label="Nationality" value={profile.nationality} />
        </dl>
      </OnboardingReviewSummaryCard>

      <OnboardingReviewSummaryCard
        number={3}
        title="Documents & images"
        statusLabel={docsComplete ? "Complete" : hasRejected ? "Action needed" : "Incomplete"}
        statusTone={docsComplete ? "complete" : hasRejected ? "warning" : "pending"}
        onEdit={() =>
          onEditDocuments ? onEditDocuments() : goToStep("documents")
        }
      >
        {hasRejected ? (
          <p
            className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4 m-0"
            role="alert"
          >
            One or more documents were rejected by HR. Upload corrected files
            before resubmitting.
          </p>
        ) : null}

        <div className="space-y-6">
          {documentSections.map((section) => (
            <div key={section.id} className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 m-0">
                  {section.title}
                </h4>
                {section.description ? (
                  <p className="text-sm text-gray-500 mt-1 mb-0">
                    {section.description}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.types.map((docType) => {
                  const row = findDocument(docType);
                  const uploaded = !!row?.id;
                  const docStatus: DocStatus = row?.status ?? "Pending";
                  const isRejected = docStatus === "Rejected";
                  const ready = isOnboardingDocumentReady(row);

                  return (
                    <div
                      key={docType}
                      className={`rounded-lg border p-4 space-y-3 ${
                        isRejected
                          ? "border-red-200 bg-red-50/40"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 m-0">
                          {docType}
                        </p>
                        <span
                          className={
                            STATUS_CLASS[ready ? docStatus : "Pending"]
                          }
                        >
                          {ready ? docStatus : "Pending"}
                        </span>
                        {row?.originalFilename ? (
                          <p className="text-xs text-gray-500 mt-1 m-0 truncate">
                            {row.originalFilename}
                          </p>
                        ) : null}
                        {isRejected && row?.rejectionReason ? (
                          <p className="text-xs text-red-600 mt-1 m-0">
                            {row.rejectionReason}
                          </p>
                        ) : null}
                      </div>

                      {uploaded && row?.id ? (
                        <OnboardingDocumentPreview
                          documentId={row.id}
                          documentType={docType}
                          alt={row.originalFilename ?? docType}
                          fetchDocument={fetchDocument}
                        />
                      ) : (
                        <p className="text-sm text-gray-400 m-0 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                          Not uploaded
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </OnboardingReviewSummaryCard>

      <OnboardingReviewSummaryCard
        number={4}
        title="Bank account details"
        statusLabel={status.bankComplete ? "Complete" : "Incomplete"}
        statusTone={status.bankComplete ? "complete" : "pending"}
        onEdit={() => (onEditBank ? onEditBank() : goToStep("bank"))}
      >
        <OnboardingBankReadOnly bank={bank} />
      </OnboardingReviewSummaryCard>

      <OnboardingSubmitChecklist items={checklistItems} />

      <div className="space-y-3">
        <p className="text-sm text-gray-600 m-0">
          By submitting, you confirm the information above is accurate.
        </p>
        <button
          type="button"
          disabled={completing || !canSubmit}
          onClick={onComplete}
          className={onboardingBtnPrimaryClass}
        >
          {completing ? "Submitting…" : submitButtonLabel}
        </button>
      </div>
    </div>
  );
}
