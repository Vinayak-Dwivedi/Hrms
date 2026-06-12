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
  layout?: "stack" | "grid";
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
  return (
    <div
      className={
        layout === "grid" ? employeeFormSectionsGridClass : "space-y-6"
      }
    >
      <EmployeeFormSection title="Address">
        <ReadOnlyField
          label="Current Address"
          value={values.currentAddress}
        />
        <ReadOnlyField
          label="Permanent Address"
          value={values.permanentAddress}
        />
      </EmployeeFormSection>

      <EmployeeFormSection title="Emergency Contact">
        <ReadOnlyField label="Contact Name" value={values.emergencyContactName} />
        <ReadOnlyField label="Contact Phone" value={values.emergencyContactPhone} />
      </EmployeeFormSection>

      <EmployeeFormSection title="Personal & Compliance">
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

      <EmployeeFormSection title="Academic Details">
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
                  label="Grade / %"
                  value={row.gradeOrPercentage}
                />
              </div>
            </div>
          );
        })}
      </EmployeeFormSection>

      {(values.professional ?? []).length > 0 ? (
        <EmployeeFormSection title="Professional Experience">
          {(values.professional ?? []).map((row, index) => (
            <div
              key={`professional-readonly-${index}-${row.id ?? row.companyName}`}
              className="col-span-full rounded-lg border border-gray-200 bg-gray-50/50 p-4"
            >
              <h4 className="text-sm font-semibold text-gray-900 m-0 mb-4">
                {row.companyName || `Experience ${index + 1}`}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label="Designation" value={row.designation} />
                <ReadOnlyField label="From" value={row.fromDate} />
                <ReadOnlyField
                  label="To"
                  value={row.isCurrent ? "Present" : row.toDate}
                />
                <ReadOnlyField
                  label="Responsibilities"
                  value={row.responsibilities}
                  span={2}
                />
              </div>
            </div>
          ))}
        </EmployeeFormSection>
      ) : null}

    </div>
  );
}
