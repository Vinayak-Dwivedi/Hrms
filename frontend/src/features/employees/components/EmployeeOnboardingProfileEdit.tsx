"use client";

import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ONBOARDING_PERMISSIONS } from "@/features/onboarding/constants/permissions";
import {
  bankFormValuesFromProfile,
  profileToFormValues,
  type EmployeeProfile,
} from "@/features/onboarding/api/onboarding.client";
import OnboardingBankForm, {
  type OnboardingBankFormHandle,
} from "@/features/onboarding/components/OnboardingBankForm";
import OnboardingProfileForm, {
  type OnboardingProfileFormHandle,
} from "@/features/onboarding/components/OnboardingProfileForm";
import type {
  OnboardingBankFormValues,
  OnboardingProfileValues,
} from "@/features/onboarding/schemas/onboarding.schema";
import { useAuth } from "@/lib/auth-context";
import {
  verifyDocument,
  type OnboardingDocument,
} from "../api/hr-onboarding.client";
import { onboardingStatusBannerWarningClass } from "../onboarding-admin-theme";
import EmployeeFormSection from "./EmployeeFormSection";
import OnboardingDocumentPreviewModal from "./OnboardingDocumentPreviewModal";
import RejectDocumentDialog from "./RejectDocumentDialog";
import {
  employeeFormSectionsGridClass,
  employeeIconMd,
  employeeViewIconBtnClass,
} from "../employee-theme";

export type EmployeeOnboardingProfileEditHandle = {
  validate: () => {
    profile: OnboardingProfileValues;
    bank: OnboardingBankFormValues | null;
  } | null;
  isEmpty: () => boolean;
  revealValidationErrors: () => void;
};

interface Props {
  profile?: EmployeeProfile;
  inGrid?: boolean;
  employeeId?: number;
  onboardingSubmittedAt?: string | null;
  onDocumentsChanged?: () => void;
  hideSections?: { work?: boolean };
}

const DOC_STATUS_CLASS: Record<string, string> = {
  Uploaded: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
};

const denyIconBtnClass =
  "text-red-600 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const EmployeeOnboardingProfileEdit = forwardRef<
  EmployeeOnboardingProfileEditHandle,
  Props
>(function EmployeeOnboardingProfileEdit(
  {
    profile,
    inGrid = false,
    onboardingSubmittedAt,
    onDocumentsChanged,
    hideSections,
  },
  ref,
) {
  const { hasAnyPermission } = useAuth();
  const profileFormRef = useRef<OnboardingProfileFormHandle>(null);
  const bankFormRef = useRef<OnboardingBankFormHandle>(null);
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<OnboardingDocument | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canVerifyDocuments = hasAnyPermission([
    ONBOARDING_PERMISSIONS.VERIFY_DOCUMENTS,
  ]);
  const isSubmitted = !!onboardingSubmittedAt;
  const hasRejected =
    profile?.documents?.some((d) => d.status === "Rejected") ?? false;
  const showReviewActions = canVerifyDocuments && isSubmitted;

  const initialProfile = profile ? profileToFormValues(profile) : undefined;
  const initialBank = bankFormValuesFromProfile(profile);

  useImperativeHandle(ref, () => ({
    validate: () => {
      const profileDirty = profileFormRef.current?.isDirty() ?? false;
      const bankDirty = bankFormRef.current?.isDirty() ?? false;

      if (!profileDirty && !bankDirty) {
        return null;
      }

      if (profileDirty) {
        const profileValues = profileFormRef.current?.validate();
        if (!profileValues) {
          return null;
        }

        if (bankDirty) {
          const bankValues = bankFormRef.current?.validate({ required: true });
          if (!bankValues) {
            return null;
          }
          return { profile: profileValues, bank: bankValues };
        }

        const bankValues = bankFormRef.current?.isEmpty()
          ? null
          : (bankFormRef.current?.getValues() ?? null);
        return { profile: profileValues, bank: bankValues };
      }

      const bankValues = bankFormRef.current?.validate({ required: true });
      if (!bankValues) {
        return null;
      }

      const profileValues = profileFormRef.current?.getValues();
      if (!profileValues) {
        return null;
      }

      return { profile: profileValues, bank: bankValues };
    },
    isEmpty: () =>
      !(profileFormRef.current?.isDirty() ?? false) &&
      !(bankFormRef.current?.isDirty() ?? false),
    revealValidationErrors: () => {
      if (profileFormRef.current?.isDirty()) {
        profileFormRef.current?.revealErrors();
      }
      if (bankFormRef.current?.isDirty()) {
        bankFormRef.current?.revealErrors({ required: true });
      }
    },
  }));

  async function runAction(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    try {
      await action();
      onDocumentsChanged?.();
    } finally {
      setBusy(null);
    }
  }

  function handleRejected() {
    onDocumentsChanged?.();
  }

  function toPreviewDoc(doc: EmployeeProfile["documents"][number]): OnboardingDocument {
    return {
      id: doc.id,
      documentType: doc.documentType,
      originalFilename: doc.originalFilename ?? doc.documentType,
      status: doc.status,
      rejectionReason: doc.rejectionReason ?? null,
    };
  }

  const heading = (
    <div className="col-span-full" id="employee-onboarding-profile">
      <h3 className="text-lg font-semibold text-slate-800 m-0">
        Onboarding profile
      </h3>
      <p className="text-sm text-slate-500 m-0 mt-1">
        Address, compliance, academic, and bank details collected during
        onboarding.
      </p>
    </div>
  );

  const sections = (
    <>
      <OnboardingProfileForm
        ref={profileFormRef}
        companionSection={
          <OnboardingBankForm
            ref={bankFormRef}
            embedded
            initialValues={initialBank}
          />
        }
        embedded
        formOptionsSource="hr"
        hideSections={hideSections}
        initialValues={initialProfile}
        sectionsLayout="grid"
      />

      <EmployeeFormSection compact title="Documents">
        {hasRejected && !isSubmitted && (
          <div className={`col-span-full ${onboardingStatusBannerWarningClass}`}>
            A document was rejected. Update documents and submit again before
            continuing review.
          </div>
        )}
        {!profile?.documents?.length ? (
          <p className="text-sm text-gray-500 m-0 col-span-full">
            No documents uploaded.
          </p>
        ) : (
          <div className="col-span-full">
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full border-collapse min-w-[280px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Document</th>
                    <th className="px-3 py-2 font-medium">File</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profile.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-3 py-2 text-gray-900">
                        <p className="m-0">{doc.documentType}</p>
                        {doc.status === "Rejected" && doc.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1 m-0">
                            {doc.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">
                        {doc.originalFilename ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${DOC_STATUS_CLASS[doc.status] ?? "bg-gray-100 text-gray-800"}`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`View ${doc.documentType}`}
                            title="View"
                            className={employeeViewIconBtnClass}
                            onClick={() => setPreviewDoc(toPreviewDoc(doc))}
                          >
                            <Eye className={employeeIconMd} />
                          </button>
                          {showReviewActions && doc.status === "Uploaded" && (
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
                                aria-label={`Reject ${doc.documentType}`}
                                title="Reject"
                                disabled={!!busy}
                                className={denyIconBtnClass}
                                onClick={() => setRejectDoc(toPreviewDoc(doc))}
                              >
                                <XCircle className={employeeIconMd} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2 m-0">
              {showReviewActions
                ? "Approve or reject documents awaiting verification."
                : "Documents are view-only on this page."}
            </p>
          </div>
        )}
      </EmployeeFormSection>
    </>
  );

  return (
    <>
      {inGrid ? (
        <>
          {heading}
          {sections}
        </>
      ) : (
        <div className={employeeFormSectionsGridClass}>
          {heading}
          {sections}
        </div>
      )}

      <OnboardingDocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        open={previewDoc != null}
      />

      <RejectDocumentDialog
        open={rejectDoc !== null}
        document={rejectDoc}
        onClose={() => setRejectDoc(null)}
        onRejected={handleRejected}
      />
    </>
  );
});

export default EmployeeOnboardingProfileEdit;
