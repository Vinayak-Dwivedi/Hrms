"use client";

import { Eye } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
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
import type { OnboardingDocument } from "../api/hr-onboarding.client";
import EmployeeFormSection from "./EmployeeFormSection";
import OnboardingDocumentPreviewModal from "./OnboardingDocumentPreviewModal";
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
};

interface Props {
  profile?: EmployeeProfile;
  inGrid?: boolean;
}

const DOC_STATUS_CLASS: Record<string, string> = {
  Uploaded: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
};

function bankFormValuesFromProfile(
  profile?: EmployeeProfile,
): OnboardingBankFormValues {
  if (profile?.bank?.length) {
    return {
      bank: profile.bank.map((row) => ({
        id: row.id,
        accountNumber: row.accountNumber,
        accountName: row.accountName,
        bankName: row.bankName,
        branchName: row.branchName,
        ifscCode: row.ifscCode,
        isPrimary: row.isPrimary,
      })),
    };
  }
  return {
    bank: [
      {
        accountNumber: "",
        accountName: "",
        bankName: "",
        branchName: "",
        ifscCode: "",
        isPrimary: true,
      },
    ],
  };
}

const EmployeeOnboardingProfileEdit = forwardRef<
  EmployeeOnboardingProfileEditHandle,
  Props
>(function EmployeeOnboardingProfileEdit({ profile, inGrid = false }, ref) {
  const profileFormRef = useRef<OnboardingProfileFormHandle>(null);
  const bankFormRef = useRef<OnboardingBankFormHandle>(null);
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocument | null>(null);

  const initialProfile = profile ? profileToFormValues(profile) : undefined;
  const initialBank = bankFormValuesFromProfile(profile);

  useImperativeHandle(ref, () => ({
    validate: () => {
      const profileEmpty = profileFormRef.current?.isEmpty() ?? true;
      const bankEmpty = bankFormRef.current?.isEmpty() ?? true;

      if (profileEmpty && bankEmpty) {
        return null;
      }

      const profileValues = profileFormRef.current?.validate();
      if (!profileValues) {
        return null;
      }

      const bankValues = bankFormRef.current?.validate() ?? null;
      if (!bankEmpty && !bankValues) {
        return null;
      }

      return { profile: profileValues, bank: bankValues };
    },
    isEmpty: () =>
      (profileFormRef.current?.isEmpty() ?? true) &&
      (bankFormRef.current?.isEmpty() ?? true),
  }));

  const heading = (
    <div className="col-span-full">
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
        embedded
        initialValues={initialProfile}
      />

      <EmployeeFormSection compact title="Documents">
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
                            {doc.documentType}
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
                            <button
                              type="button"
                              aria-label={`View ${doc.documentType}`}
                              title="View"
                              className={employeeViewIconBtnClass}
                              onClick={() =>
                                setPreviewDoc({
                                  id: doc.id,
                                  documentType: doc.documentType,
                                  originalFilename:
                                    doc.originalFilename ?? doc.documentType,
                                  status: doc.status,
                                })
                              }
                            >
                              <Eye className={employeeIconMd} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2 m-0">
                  Documents are view-only on this page.
                </p>
              </div>
            )}
      </EmployeeFormSection>

      <OnboardingBankForm
        ref={bankFormRef}
        embedded
        initialValues={initialBank}
      />

      {profile?.professional && profile.professional.length > 0 ? (
        <div className="col-span-full">
          <EmployeeFormSection compact title="Professional experience">
              <div className="col-span-full overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full border-collapse min-w-[480px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">Designation</th>
                      <th className="px-3 py-2 font-medium">From</th>
                      <th className="px-3 py-2 font-medium">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profile.professional.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-900">
                          {row.companyName}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.designation}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.fromDate}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.isCurrent ? "Present" : (row.toDate ?? "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 m-0 col-span-full">
                Professional experience is view-only here.
              </p>
            </EmployeeFormSection>
        </div>
      ) : null}
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
    </>
  );
});

export default EmployeeOnboardingProfileEdit;
