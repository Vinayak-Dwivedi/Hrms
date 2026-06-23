"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import type { OnboardingDocument } from "../api/hr-onboarding.client";
import EmployeeFormSection from "./EmployeeFormSection";
import OnboardingDocumentPreviewModal from "./OnboardingDocumentPreviewModal";
import {
  employeeFieldLabelClass,
  employeeFormSectionsGridClass,
  employeeIconMd,
  employeeViewIconBtnClass,
} from "../employee-theme";

interface Props {
  profile: EmployeeProfile;
  className?: string;
  inGrid?: boolean;
}

const DOC_STATUS_CLASS: Record<string, string> = {
  Uploaded: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className={`${employeeFieldLabelClass} mb-1.5 m-0`}>{label}</p>
      <p className="text-sm text-gray-800 m-0 whitespace-pre-wrap">
        {value || "—"}
      </p>
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeOnboardingProfileView({
  profile,
  className,
  inGrid = false,
}: Props) {
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocument | null>(null);
  const primaryBank =
    profile.bank.find((b) => b.isPrimary) ?? profile.bank[0] ?? null;

  const heading = (
    <h3 className="text-lg font-semibold text-slate-800 m-0 col-span-full">
      Onboarding profile
    </h3>
  );

  const sections = (
    <>
      <EmployeeFormSection compact title="Contact">
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <DetailRow
                label="Current address"
                value={profile.personal.currentAddress ?? ""}
              />
              <DetailRow
                label="Permanent address"
                value={profile.personal.permanentAddress ?? ""}
              />
            </div>
          </EmployeeFormSection>

          <EmployeeFormSection compact title="Emergency contact">
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <DetailRow
                label="Contact name"
                value={profile.personal.emergencyContactName ?? ""}
              />
              <DetailRow
                label="Contact phone"
                value={profile.personal.emergencyContactPhone ?? ""}
              />
            </div>
          </EmployeeFormSection>

          <EmployeeFormSection compact title="Personal & compliance">
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <DetailRow
                label="Father's name"
                value={profile.personal.fatherName ?? ""}
              />
              <DetailRow
                label="Mother's name"
                value={profile.personal.motherName ?? ""}
              />
              <DetailRow
                label="Blood group"
                value={profile.personal.bloodGroup ?? ""}
              />
              <DetailRow
                label="Nationality"
                value={profile.personal.nationality ?? ""}
              />
              <DetailRow
                label="Marital status"
                value={profile.personal.maritalStatus ?? ""}
              />
              <DetailRow
                label="Spouse name"
                value={profile.personal.spouseName ?? ""}
              />
              <DetailRow label="PAN" value={profile.identity.panNumber ?? ""} />
              <DetailRow
                label="Aadhaar"
                value={profile.identity.aadhaarNumber ?? ""}
              />
              <DetailRow label="UAN" value={profile.identity.uanNumber ?? ""} />
              <DetailRow label="ESIC" value={profile.identity.esicNumber ?? ""} />
              {profile.identity.passportNumber ? (
                <>
                  <DetailRow
                    label="Passport number"
                    value={profile.identity.passportNumber}
                  />
                  <DetailRow
                    label="Passport expiry"
                    value={
                      profile.identity.passportExpiry
                        ? fmtDate(profile.identity.passportExpiry)
                        : ""
                    }
                  />
                </>
              ) : null}
            </div>
          </EmployeeFormSection>

      <EmployeeFormSection compact title="Academic qualifications">
            {profile.academic.length === 0 ? (
              <p className="text-sm text-gray-500 m-0 col-span-full">—</p>
            ) : (
              <div className="col-span-full overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full border-collapse min-w-[280px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-medium">Qualification</th>
                      <th className="px-3 py-2 font-medium">Institution</th>
                      <th className="px-3 py-2 font-medium">Board / University</th>
                      <th className="px-3 py-2 font-medium">Field of study</th>
                      <th className="px-3 py-2 font-medium">Passing year</th>
                      <th className="px-3 py-2 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profile.academic.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-900">
                          {row.qualification}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.institution}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.boardUniversity ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.fieldOfStudy ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.yearTo ?? row.yearFrom ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.gradeOrPercentage ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EmployeeFormSection>

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
            )}
          </EmployeeFormSection>

      {profile.professional.length > 0 ? (
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
                      <th className="px-3 py-2 font-medium">Responsibilities</th>
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
                          {fmtDate(row.fromDate)}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.isCurrent
                            ? "Present"
                            : row.toDate
                              ? fmtDate(row.toDate)
                              : "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.responsibilities ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </EmployeeFormSection>
        </div>
      ) : null}

          <EmployeeFormSection compact title="Bank account">
            {primaryBank ? (
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <DetailRow
                  label="Account number"
                  value={primaryBank.accountNumber}
                />
                <DetailRow
                  label="Account name"
                  value={primaryBank.accountName}
                />
                <DetailRow label="Bank name" value={primaryBank.bankName} />
                <DetailRow label="Branch" value={primaryBank.branchName} />
                <DetailRow label="IFSC code" value={primaryBank.ifscCode} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 m-0 col-span-full">—</p>
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
