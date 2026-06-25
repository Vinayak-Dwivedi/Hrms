"use client";

import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import EmployeeFormSection from "@/features/employees/components/EmployeeFormSection";
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

export default function OnboardingProfileReadOnly({
  values,
  layout = "stack",
}: Props) {
  const isPageLayout = layout === "page";
  const sectionsClass =
    layout === "page" || layout === "grid"
      ? employeeFormSectionsGridClass
      : "space-y-6";
  const sectionProps = isPageLayout ? { compact: true as const } : {};

  return (
    <div className={sectionsClass}>
      <EmployeeFormSection title="Address" {...sectionProps}>
        <ReadOnlyField
          label="Current Address"
          value={values.currentAddress}
          span={2}
        />
        <ReadOnlyField
          label="Permanent Address"
          value={values.permanentAddress}
          span={2}
        />
      </EmployeeFormSection>

      <EmployeeFormSection title="Emergency Contact" {...sectionProps}>
        <ReadOnlyField label="Contact Name" value={values.emergencyContactName} />
        <ReadOnlyField label="Contact Phone" value={values.emergencyContactPhone} />
      </EmployeeFormSection>

      <div
        className={
          isPageLayout || layout === "grid"
            ? "col-span-full grid grid-cols-1 md:grid-cols-2 gap-4"
            : "grid grid-cols-1 md:grid-cols-2 gap-4"
        }
      >
      <EmployeeFormSection title="Personal & Compliance" {...sectionProps}>
        <ReadOnlyField label="Marital Status" value={values.maritalStatus} />
        <ReadOnlyField label="Spouse Name" value={values.spouseName} />
        <ReadOnlyField label="Father's Name" value={values.fatherName} />
        <ReadOnlyField label="Mother's Name" value={values.motherName} />
        <ReadOnlyField label="Blood Group" value={values.bloodGroup} />
        <ReadOnlyField label="Nationality" value={values.nationality} />
        <ReadOnlyField label="PAN Number" value={values.panNo} />
        <ReadOnlyField label="Aadhaar Number" value={values.aadhaarNo} />
        <ReadOnlyField label="UAN" value={values.uanNo} />
        <ReadOnlyField label="ESIC" value={values.esicNo} />
      </EmployeeFormSection>

      <EmployeeFormSection title="Work Information" {...sectionProps}>
        {values.professional?.[0] ? (
          <>
            <ReadOnlyField
              label="Previous Company"
              value={values.professional[0].companyName}
            />
            <ReadOnlyField
              label="Designation"
              value={values.professional[0].designation}
            />
            <ReadOnlyField
              label="From Date"
              value={values.professional[0].fromDate}
            />
            <ReadOnlyField
              label="To Date"
              value={values.professional[0].toDate}
            />
            {values.professional[0].responsibilities ? (
              <ReadOnlyField
                label="Responsibilities"
                value={values.professional[0].responsibilities}
                span={2}
              />
            ) : null}
          </>
        ) : (
          <ReadOnlyField
            label="Previous employment"
            value="No previous employment (Fresher)"
            span={2}
          />
        )}
      </EmployeeFormSection>
      </div>

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
