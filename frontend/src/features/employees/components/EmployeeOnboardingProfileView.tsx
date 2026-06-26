"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import {
  profileToFormValues,
  type EmployeeProfile,
} from "@/features/onboarding/api/onboarding.client";
import OnboardingProfileReadOnly from "@/features/onboarding/components/OnboardingProfileReadOnly";
import type { OnboardingDocument } from "../api/hr-onboarding.client";
import EmployeeFormSection from "./EmployeeFormSection";
import OnboardingDocumentPreviewModal from "./OnboardingDocumentPreviewModal";
import {
  employeeFormSectionsGridClass,
  employeeIconMd,
  employeeViewIconBtnClass,
} from "../employee-theme";

interface Props {
  profile: EmployeeProfile;
  className?: string;
  inGrid?: boolean;
  /** When true, work is shown on the parent page (e.g. EmployeeDetailView). */
  hideWorkSection?: boolean;
}

const DOC_STATUS_CLASS: Record<string, string> = {
  Uploaded: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
};

export default function EmployeeOnboardingProfileView({
  profile,
  className,
  inGrid = false,
  hideWorkSection = true,
}: Props) {
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocument | null>(null);
  const formValues = profileToFormValues(profile);

  const heading = (
    <h3 className="text-lg font-semibold text-slate-800 m-0 col-span-full">
      Onboarding profile
    </h3>
  );

  const documentsSection = (
    <EmployeeFormSection compact title="Documents">
      {profile.documents.length === 0 ? (
        <p className="text-sm text-gray-500 m-0 col-span-full">—</p>
      ) : (
        <div className="col-span-full overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full border-collapse min-w-[280px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Document</th>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
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
      )}
    </EmployeeFormSection>
  );

  const sections = (
    <>
      <OnboardingProfileReadOnly
        bank={profile.bank}
        hideSections={{ work: hideWorkSection }}
        layout="grid"
        values={formValues}
      />
      {documentsSection}
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
        <div className={className ?? employeeFormSectionsGridClass}>
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
}
