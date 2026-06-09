"use client";

import { useRouter } from "next/navigation";
import type { OnboardingDocumentRow } from "../api/onboarding.client";
import {
  onboardingBtnOutlineClass,
  onboardingBtnPrimaryClass,
  onboardingStatusPendingClass,
  onboardingStatusRejectedClass,
  onboardingStatusUploadedClass,
  onboardingStatusVerifiedClass,
} from "../constants/onboarding-theme";
import { ONBOARDING_DOCUMENT_SECTIONS } from "../constants/documents";
import type { OnboardingProfileValues } from "../schemas/onboarding.schema";
import OnboardingDocumentPreview from "./OnboardingDocumentPreview";
import OnboardingProfileReadOnly from "./OnboardingProfileReadOnly";

type DocStatus = OnboardingDocumentRow["status"];

interface Props {
  profile: OnboardingProfileValues;
  documents: OnboardingDocumentRow[];
  completing: boolean;
  pendingDocuments: string[];
  onComplete: () => void;
}

const STATUS_CLASS: Record<DocStatus, string> = {
  Pending: onboardingStatusPendingClass,
  Uploaded: onboardingStatusUploadedClass,
  Verified: onboardingStatusVerifiedClass,
  Rejected: onboardingStatusRejectedClass,
};

export default function OnboardingReviewStep({
  profile,
  documents,
  completing,
  pendingDocuments,
  onComplete,
}: Props) {
  const router = useRouter();

  function findDocument(docType: string) {
    return documents.find((d) => d.documentType === docType);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 m-0">
            Review &amp; Submit
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-0">
            Review your information before submitting to HR. Nothing on this page
            can be edited — use the buttons below to make changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              router.replace("/employee/onboarding/profile?step=profile")
            }
            className={onboardingBtnOutlineClass}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() =>
              router.replace("/employee/onboarding/profile?step=documents")
            }
            className={onboardingBtnOutlineClass}
          >
            Edit Documents
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 m-0">
          Profile details
        </h3>
        <OnboardingProfileReadOnly values={profile} />
      </section>

      <section className="space-y-6">
        <h3 className="text-sm font-semibold text-gray-900 m-0">Documents</h3>

        {ONBOARDING_DOCUMENT_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 m-0">
                {section.title}
                {section.required ? (
                  <span className="text-red-500 font-normal"> *</span>
                ) : null}
              </h4>
              {section.description ? (
                <p className="text-sm text-gray-500 mt-1 mb-0">
                  {section.description}
                </p>
              ) : null}
            </div>

            <div className="space-y-4">
              {section.types.map((docType) => {
                const row = findDocument(docType);
                const uploaded = !!row?.id;
                const status: DocStatus = row?.status ?? "Pending";

                return (
                  <div
                    key={docType}
                    className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 m-0">
                          {docType}
                        </p>
                        <span className={STATUS_CLASS[uploaded ? "Uploaded" : status]}>
                          {uploaded ? status : "Pending"}
                        </span>
                        {row?.originalFilename ? (
                          <p className="text-xs text-gray-500 mt-1 m-0 truncate">
                            {row.originalFilename}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {uploaded && row?.id ? (
                      <OnboardingDocumentPreview
                        documentId={row.id}
                        documentType={docType}
                        alt={row.originalFilename ?? docType}
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
      </section>

      {pendingDocuments.length > 0 && (
        <p className="text-sm text-amber-700 m-0">
          Remaining: {pendingDocuments.join(", ")}
        </p>
      )}

      <button
        type="button"
        disabled={completing || pendingDocuments.length > 0}
        onClick={onComplete}
        className={onboardingBtnPrimaryClass}
      >
        {completing ? "Submitting…" : "Complete Onboarding"}
      </button>
    </div>
  );
}
