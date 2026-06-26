"use client";

import type { ReactNode } from "react";
import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import EmployeeFormSection from "@/features/employees/components/EmployeeFormSection";
import OnboardingBankDetailsView from "@/features/employees/components/OnboardingBankDetailsView";
import { WorkInformationView } from "@/features/employees/components/WorkInformationSection";
import { employeeFormSectionsGridClass } from "@/features/employees/employee-theme";
import {
  isHigherEdQualification,
  isSchoolQualification,
} from "../constants/academic";
import {
  onboardingReadOnlyLabelClass,
  onboardingReadOnlyValueClass,
} from "../constants/onboarding-theme";
import type { OnboardingProfileValues } from "../schemas/onboarding.schema";

interface Props {
  values: OnboardingProfileValues;
  layout?: "stack" | "grid" | "page";
  bank?: EmployeeProfile["bank"];
  companionSection?: ReactNode;
  hideSections?: { work?: boolean };
}

function ReadOnlyField({
  label,
  value,
  span,
}: {
  label: string;
  value: string | number | null | undefined;
  span?: 1 | 2;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  return (
    <EmployeeFormField span={span}>
      <dt className={onboardingReadOnlyLabelClass}>{label}</dt>
      <dd className={onboardingReadOnlyValueClass}>{display}</dd>
    </EmployeeFormField>
  );
}

function professionalForView(
  professional: OnboardingProfileValues["professional"],
): EmployeeProfile["professional"] {
  return (professional ?? [])
    .filter(
      (row) =>
        row.companyName?.trim() &&
        row.designation?.trim() &&
        row.fromDate?.trim(),
    )
    .map((row, index) => ({
      id: row.id ?? index + 1,
      companyName: row.companyName ?? "",
      designation: row.designation ?? "",
      fromDate: row.fromDate ?? "",
      toDate: row.toDate || null,
      isCurrent: row.isCurrent ?? false,
      responsibilities: row.responsibilities?.trim() || null,
    }));
}

function gridRowClass(layout: Props["layout"]) {
  const isPageLayout = layout === "page";
  return isPageLayout || layout === "grid"
    ? "col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
    : "grid grid-cols-1 md:grid-cols-2 gap-4 items-start";
}

export default function OnboardingProfileReadOnly({
  values,
  layout = "stack",
  bank,
  companionSection,
  hideSections,
}: Props) {
  const isPageLayout = layout === "page";
  const sectionsClass =
    layout === "page" || layout === "grid"
      ? employeeFormSectionsGridClass
      : "space-y-6";
  const sectionProps = isPageLayout ? { compact: true as const } : {};

  const bankCompanion =
    companionSection ??
    (bank !== undefined ? (
      <OnboardingBankDetailsView bank={bank} compact />
    ) : null);

  const workCompanion =
    !bankCompanion && !hideSections?.work ? (
      <WorkInformationView
        compact
        professional={professionalForView(values.professional)}
      />
    ) : null;

  const personalRowCompanion = bankCompanion ?? workCompanion;

  return (
    <div className={sectionsClass}>
      <div className={gridRowClass(layout)}>
        <EmployeeFormSection title="Address" {...sectionProps}>
          <ReadOnlyField label="Current Address" value={values.currentAddress} />
          <ReadOnlyField
            label="Permanent Address"
            value={values.permanentAddress}
          />
        </EmployeeFormSection>

        <EmployeeFormSection title="Emergency Contact" {...sectionProps}>
          <ReadOnlyField
            label="Contact Name"
            value={values.emergencyContactName}
          />
          <ReadOnlyField
            label="Contact Phone"
            value={values.emergencyContactPhone}
          />
        </EmployeeFormSection>
      </div>

      <div className={gridRowClass(layout)}>
        <EmployeeFormSection title="Personal & Compliance" {...sectionProps}>
          <ReadOnlyField label="Marital Status" value={values.maritalStatus} />
          <ReadOnlyField label="Spouse Name" value={values.spouseName} />
          <ReadOnlyField label="Father's Name" value={values.fatherName} />
          <ReadOnlyField label="Mother's Name" value={values.motherName} />
          <ReadOnlyField label="Blood Group" value={values.bloodGroup} />
          <ReadOnlyField label="Nationality" value={values.nationality} />
          <ReadOnlyField label="PAN Number" value={values.panNo} />
          <ReadOnlyField label="Aadhaar Number" value={values.aadhaarNo} />
          <ReadOnlyField label="UAN (optional)" value={values.uanNo} />
          <ReadOnlyField label="ESIC (optional)" value={values.esicNo} />
        </EmployeeFormSection>

        {personalRowCompanion}
      </div>

      {bankCompanion && !hideSections?.work ? (
        <WorkInformationView
          className={isPageLayout ? "col-span-full" : undefined}
          compact
          professional={professionalForView(values.professional)}
        />
      ) : null}

      <EmployeeFormSection
        title="Academic Details"
        className={isPageLayout ? "col-span-full" : undefined}
        {...sectionProps}
      >
        {values.academic.map((row, index) => {
          const isSchool = isSchoolQualification(row.qualification);
          const isHigherEd = isHigherEdQualification(row.qualification);
          const title =
            row.qualification ||
            (row.qualificationOther ? row.qualificationOther : `Record ${index + 1}`);

          return (
            <div
              key={`academic-readonly-${index}-${row.id ?? title}`}
              className="col-span-full rounded-lg border border-gray-200 bg-gray-50/50 p-4"
            >
              <h4 className="text-sm font-semibold text-gray-900 m-0 mb-4">
                {title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {row.qualificationOther ? (
                  <ReadOnlyField
                    label="Qualification"
                    value={row.qualificationOther}
                  />
                ) : null}
                <ReadOnlyField
                  label={isSchool ? "School name" : "Institution / College"}
                  value={row.institution}
                />
                {isSchool ? (
                  <ReadOnlyField
                    label="Board / University"
                    value={row.boardUniversity}
                  />
                ) : null}
                {isHigherEd ? (
                  <ReadOnlyField
                    label="Field of study"
                    value={row.fieldOfStudy}
                  />
                ) : null}
                <ReadOnlyField
                  label="Passing year"
                  value={typeof row.yearTo === "number" ? row.yearTo : null}
                />
                <ReadOnlyField
                  label="Grade"
                  value={row.gradeOrPercentage}
                />
              </div>
            </div>
          );
        })}
      </EmployeeFormSection>
    </div>
  );
}
