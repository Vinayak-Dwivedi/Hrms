"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { OnboardingRequestError } from "@/features/onboarding/api/onboarding.client";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import EmployeeFormSection from "@/features/employees/components/EmployeeFormSection";
import { sanitizePhoneInput } from "@/features/employees/schemas/employee.schema";
import {
  sanitizeAlphaOnlyInput,
  sanitizeGradeInput,
} from "@/lib/academic-field-validation";
import {
  ADDABLE_ACADEMIC_OPTIONS,
  academicQualificationFromApi,
  createEmptyAcademicRow,
  DEFAULT_ACADEMIC_ROWS,
  isFixedDefaultQualification,
  isHigherEdQualification,
  isSchoolQualification,
  MAX_ACADEMIC_RECORDS,
  QUAL_GRADUATION,
  QUAL_OTHER,
  QUAL_POST_GRADUATION,
} from "../constants/academic";
import {
  MARITAL_STATUS_OPTIONS,
  type MaritalStatus,
} from "../constants/personal";
import {
  onboardingBtnAccentOutlineClass,
  onboardingBtnPrimaryClass,
} from "../constants/onboarding-theme";
import {
  collectOnboardingProfileErrors,
  onboardingProfileSchema,
  type AcademicDetailValues,
  type OnboardingProfileValues,
} from "../schemas/onboarding.schema";

interface Props {
  initialValues?: Partial<OnboardingProfileValues>;
  onSubmit: (values: OnboardingProfileValues) => Promise<void>;
  submitting?: boolean;
}

const DEFAULT_VALUES: OnboardingProfileValues = {
  currentAddress: "",
  permanentAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  maritalStatus: "Single",
  spouseName: "",
  fatherName: "",
  motherName: "",
  bloodGroup: "",
  nationality: "Indian",
  panNo: "",
  aadhaarNo: "",
  uanNo: "",
  esicNo: "",
  academic: DEFAULT_ACADEMIC_ROWS,
  professional: [],
};

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1 m-0">{message}</p>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-500 mt-1 m-0">{children}</p>;
}

function digitsOnly(value: string, maxLen?: number): string {
  const d = value.replace(/\D/g, "");
  return maxLen ? d.slice(0, maxLen) : d;
}

function selectableQualificationOptions(
  current: string,
  existing: AcademicDetailValues[],
) {
  const taken = new Set(
    existing
      .map((r) => r.qualification)
      .filter((q) => q && q !== current),
  );
  return ADDABLE_ACADEMIC_OPTIONS.filter(
    (opt) => opt === QUAL_OTHER || opt === current || !taken.has(opt),
  );
}

function canAppendAcademicRow(existing: AcademicDetailValues[]) {
  return (
    existing.length < MAX_ACADEMIC_RECORDS &&
    selectableQualificationOptions("", existing).length > 0
  );
}

function addressesMatch(current: string, permanent: string): boolean {
  const c = current.trim();
  const p = permanent.trim();
  return c.length > 0 && p.length > 0 && c === p;
}

type ApiValidationIssue = {
  path?: unknown;
  message?: unknown;
};

function toIssuePath(path: unknown): (string | number)[] {
  if (!Array.isArray(path)) return [];
  return path.filter(
    (item): item is string | number =>
      typeof item === "string" || typeof item === "number",
  );
}

function toFormFieldKey(path: (string | number)[]): string | null {
  if (path.length === 0) return null;

  if (path[0] === "personal" && typeof path[1] === "string") {
    const personalFieldMap: Record<string, string> = {
      currentAddress: "currentAddress",
      permanentAddress: "permanentAddress",
      emergencyContactName: "emergencyContactName",
      emergencyContactPhone: "emergencyContactPhone",
      maritalStatus: "maritalStatus",
      spouseName: "spouseName",
      fatherName: "fatherName",
      motherName: "motherName",
      bloodGroup: "bloodGroup",
      nationality: "nationality",
    };
    return personalFieldMap[path[1]] ?? null;
  }

  if (path[0] === "identity" && typeof path[1] === "string") {
    const identityFieldMap: Record<string, string> = {
      panNumber: "panNo",
      aadhaarNumber: "aadhaarNo",
      uanNumber: "uanNo",
      esicNumber: "esicNo",
    };
    return identityFieldMap[path[1]] ?? null;
  }

  if (
    path[0] === "academic" &&
    typeof path[1] === "number" &&
    typeof path[2] === "string"
  ) {
    return `academic.${path[1]}.${path[2]}`;
  }

  if (
    typeof path[0] === "string" &&
    [
      "currentAddress",
      "permanentAddress",
      "emergencyContactName",
      "emergencyContactPhone",
      "maritalStatus",
      "spouseName",
      "fatherName",
      "motherName",
      "bloodGroup",
      "nationality",
      "panNo",
      "aadhaarNo",
      "uanNo",
      "esicNo",
    ].includes(path[0])
  ) {
    return path[0];
  }

  return null;
}

function getServerFieldErrors(err: unknown): Record<string, string> {
  const details =
    err instanceof OnboardingRequestError
      ? err.details
      : (err as { details?: unknown } | null)?.details;
  if (!Array.isArray(details)) return {};

  const next: Record<string, string> = {};
  for (const issue of details as ApiValidationIssue[]) {
    if (typeof issue?.message !== "string") continue;
    const key = toFormFieldKey(toIssuePath(issue.path));
    if (!key) continue;
    if (!next[key]) next[key] = issue.message;
  }
  return next;
}

export default function OnboardingProfileForm({
  initialValues,
  onSubmit,
  submitting = false,
}: Props) {
  const [values, setValues] = useState<OnboardingProfileValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
    academic: initialValues?.academic?.length
      ? initialValues.academic
      : DEFAULT_VALUES.academic,
    professional: initialValues?.professional ?? [],
  });
  const [permanentSameAsCurrent, setPermanentSameAsCurrent] = useState(() =>
    addressesMatch(
      initialValues?.currentAddress ?? DEFAULT_VALUES.currentAddress,
      initialValues?.permanentAddress ?? DEFAULT_VALUES.permanentAddress,
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function setCurrentAddress(value: string) {
    setValues((prev) => ({
      ...prev,
      currentAddress: value,
      ...(permanentSameAsCurrent ? { permanentAddress: value } : {}),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.currentAddress;
      if (permanentSameAsCurrent) delete next.permanentAddress;
      return next;
    });
  }

  function handlePermanentSameAsCurrentChange(checked: boolean) {
    setPermanentSameAsCurrent(checked);
    if (checked) {
      setValues((prev) => ({
        ...prev,
        permanentAddress: prev.currentAddress,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.permanentAddress;
        return next;
      });
    }
  }

  function setField<K extends keyof OnboardingProfileValues>(
    key: K,
    value: OnboardingProfileValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[String(key)];
      return next;
    });
  }

  function blurField(fieldKey: string, nextValues: OnboardingProfileValues) {
    const fieldErrors = collectOnboardingProfileErrors(nextValues);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[fieldKey]) next[fieldKey] = fieldErrors[fieldKey];
      else delete next[fieldKey];
      return next;
    });
  }

  function blurAcademicField(
    index: number,
    field:
      | "qualification"
      | "qualificationOther"
      | "institution"
      | "boardUniversity"
      | "fieldOfStudy"
      | "yearTo"
      | "gradeOrPercentage",
    nextValues: OnboardingProfileValues,
  ) {
    blurField(`academic.${index}.${field}`, nextValues);
  }

  function updateAcademic(index: number, patch: Partial<AcademicDetailValues>) {
    setValues((prev) => ({
      ...prev,
      academic: prev.academic.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`academic.${index}.`)) delete next[key];
      }
      return next;
    });
  }

  function addAcademic() {
    if (values.academic.length >= MAX_ACADEMIC_RECORDS) return;
    setValues((prev) => ({
      ...prev,
      academic: [...prev.academic, createEmptyAcademicRow("")],
    }));
  }

  function removeAcademic(index: number) {
    if (values.academic.length <= 1) return;
    setValues((prev) => ({
      ...prev,
      academic: prev.academic.filter((_, i) => i !== index),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`academic.${index}.`)) delete next[key];
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = onboardingProfileSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectOnboardingProfileErrors(values));
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (err) {
      const serverFieldErrors = getServerFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...serverFieldErrors }));
        setFormError(null);
        return;
      }
      setFormError((err as Error).message ?? "Failed to save profile.");
    }
  }

  const canAddMore = canAppendAcademicRow(values.academic);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <EmployeeFormSection title="Address">
        <EmployeeFormField span={2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex min-h-0 flex-col">
              <div className="mb-1.5 flex min-h-10 items-center [&_label]:mb-0">
                <FieldLabel required>Current Address</FieldLabel>
              </div>
              <textarea
                className="h-28 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={values.currentAddress}
                onBlur={() => blurField("currentAddress", values)}
                onChange={(e) => setCurrentAddress(e.target.value)}
              />
              <FieldError message={errors.currentAddress} />
            </div>
            <div className="flex min-h-0 flex-col">
              <div className="mb-1.5 flex min-h-10 items-center justify-between gap-3 [&_label]:mb-0">
                <FieldLabel required>Permanent Address</FieldLabel>
                <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium text-gray-600">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={permanentSameAsCurrent}
                    onChange={(e) =>
                      handlePermanentSameAsCurrentChange(e.target.checked)
                    }
                  />
                  Same as Current Address
                </label>
              </div>
              <textarea
                className="h-28 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                value={values.permanentAddress}
                onBlur={() => blurField("permanentAddress", values)}
                onChange={(e) => setField("permanentAddress", e.target.value)}
                disabled={permanentSameAsCurrent}
                readOnly={permanentSameAsCurrent}
              />
              <FieldError message={errors.permanentAddress} />
            </div>
          </div>
        </EmployeeFormField>
      </EmployeeFormSection>

      <EmployeeFormSection title="Emergency Contact">
        <EmployeeFormField>
          <FieldLabel required>Contact Name</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.emergencyContactName}
            onBlur={() => blurField("emergencyContactName", values)}
            onChange={(e) => setField("emergencyContactName", e.target.value)}
          />
          <FieldError message={errors.emergencyContactName} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>Contact Phone</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.emergencyContactPhone}
            onBlur={() => blurField("emergencyContactPhone", values)}
            onChange={(e) =>
              setField(
                "emergencyContactPhone",
                sanitizePhoneInput(e.target.value),
              )
            }
            placeholder="9999900000"
            inputMode="numeric"
            maxLength={10}
            pattern="[0-9]{10}"
            autoComplete="tel"
          />
          <FieldHint>10 digits only (numbers)</FieldHint>
          <FieldError message={errors.emergencyContactPhone} />
        </EmployeeFormField>
      </EmployeeFormSection>

      <EmployeeFormSection title="Personal & Compliance">
        <EmployeeFormField>
          <FieldLabel required>Marital Status</FieldLabel>
          <select
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
            value={values.maritalStatus}
            onChange={(e) => {
              const status = e.target.value as MaritalStatus;
              setField("maritalStatus", status);
              if (status !== "Married") {
                setField("spouseName", "");
              }
            }}
          >
            {MARITAL_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.maritalStatus} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required={values.maritalStatus === "Married"}>
            Spouse Name
          </FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            value={values.spouseName ?? ""}
            onBlur={() => blurField("spouseName", values)}
            onChange={(e) => setField("spouseName", e.target.value)}
            placeholder={
              values.maritalStatus === "Married"
                ? "Required if married"
                : "Not applicable"
            }
            disabled={values.maritalStatus !== "Married"}
          />
          <FieldError message={errors.spouseName} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>Father&apos;s Name</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.fatherName ?? ""}
            onChange={(e) => setField("fatherName", e.target.value)}
          />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>Mother&apos;s Name</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.motherName ?? ""}
            onChange={(e) => setField("motherName", e.target.value)}
          />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>PAN Number</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm uppercase"
            value={values.panNo}
            onBlur={() => blurField("panNo", values)}
            onChange={(e) =>
              setField(
                "panNo",
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
              )
            }
            placeholder="ABCPD1234E"
            maxLength={10}
          />
          <FieldHint>Format: 5 letters, 4 digits, 1 letter</FieldHint>
          <FieldError message={errors.panNo} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>Aadhaar Number</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.aadhaarNo}
            onBlur={() => blurField("aadhaarNo", values)}
            onChange={(e) => setField("aadhaarNo", digitsOnly(e.target.value, 12))}
            placeholder="1234 5678 9012"
            inputMode="numeric"
            maxLength={12}
          />
          <FieldHint>12 digits only</FieldHint>
          <FieldError message={errors.aadhaarNo} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>UAN (optional)</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.uanNo ?? ""}
            onBlur={() => blurField("uanNo", values)}
            onChange={(e) => setField("uanNo", digitsOnly(e.target.value, 12))}
            placeholder="12-digit EPFO UAN"
            inputMode="numeric"
            maxLength={12}
          />
          <FieldError message={errors.uanNo} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>ESIC (optional)</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.esicNo ?? ""}
            onBlur={() => blurField("esicNo", values)}
            onChange={(e) => setField("esicNo", digitsOnly(e.target.value, 17))}
            placeholder="10 or 17 digits"
            inputMode="numeric"
            maxLength={17}
          />
          <FieldError message={errors.esicNo} />
        </EmployeeFormField>
      </EmployeeFormSection>

      <EmployeeFormSection
        title="Academic Details"
        description="Class 10 and Class 12 are pre-filled. Use + to add Graduation, Post Graduation, or other qualifications."
      >
        {values.academic.map((row, index) => {
          const isFixed = isFixedDefaultQualification(row.qualification);
          const isSchool = isSchoolQualification(row.qualification);
          const isHigherEd = isHigherEdQualification(row.qualification);
          const isOther = row.qualification === QUAL_OTHER;
          const isAddedRow = !isFixed && row.qualification === "";

          return (
            <div
              key={`academic-${index}-${row.id ?? row.qualification}`}
              className="col-span-full rounded-lg border border-gray-200 bg-gray-50/50 p-4 mb-2"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 m-0">
                  {isFixed
                    ? row.qualification
                    : row.qualification || "New qualification"}
                </h4>
                <button
                  type="button"
                  onClick={() => removeAcademic(index)}
                  disabled={values.academic.length <= 1}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Remove qualification"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isFixed && (
                  <EmployeeFormField>
                    <FieldLabel required>Qualification</FieldLabel>
                    <select
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                      value={row.qualification}
                      onBlur={() =>
                        blurAcademicField(index, "qualification", values)
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        updateAcademic(index, {
                          qualification: next,
                          qualificationOther:
                            next === QUAL_OTHER ? row.qualificationOther : "",
                        });
                      }}
                    >
                      <option value="">
                        {isAddedRow ? "Select qualification" : "Select…"}
                      </option>
                      {selectableQualificationOptions(
                        row.qualification,
                        values.academic,
                      ).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {row.qualification &&
                        !(ADDABLE_ACADEMIC_OPTIONS as readonly string[]).includes(
                          row.qualification as (typeof ADDABLE_ACADEMIC_OPTIONS)[number],
                        ) &&
                        !isFixedDefaultQualification(row.qualification) && (
                          <option value={row.qualification}>
                            {row.qualification}
                          </option>
                        )}
                    </select>
                    <FieldError message={errors[`academic.${index}.qualification`]} />
                  </EmployeeFormField>
                )}

                {isOther && (
                  <EmployeeFormField>
                    <FieldLabel required>Qualification name</FieldLabel>
                    <input
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                      value={row.qualificationOther ?? ""}
                      onBlur={() =>
                        blurAcademicField(index, "qualificationOther", values)
                      }
                      onChange={(e) =>
                        updateAcademic(index, {
                          qualificationOther: e.target.value,
                        })
                      }
                      placeholder="e.g. Diploma, Certification"
                    />
                    <FieldError
                      message={errors[`academic.${index}.qualificationOther`]}
                    />
                  </EmployeeFormField>
                )}

                <EmployeeFormField>
                  <FieldLabel required>
                    {isSchool ? "School name" : "Institution / College"}
                  </FieldLabel>
                  <input
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                    value={row.institution}
                    onBlur={() =>
                      blurAcademicField(index, "institution", values)
                    }
                    onChange={(e) =>
                      updateAcademic(index, {
                        institution: sanitizeAlphaOnlyInput(e.target.value),
                      })
                    }
                  />
                  <FieldError message={errors[`academic.${index}.institution`]} />
                </EmployeeFormField>

                {isSchool && (
                  <EmployeeFormField>
                    <FieldLabel required>Board / University</FieldLabel>
                    <input
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                      value={row.boardUniversity ?? ""}
                      onBlur={() =>
                        blurAcademicField(index, "boardUniversity", values)
                      }
                      onChange={(e) =>
                        updateAcademic(index, {
                          boardUniversity: sanitizeAlphaOnlyInput(e.target.value),
                        })
                      }
                      placeholder="e.g. CBSE, ICSE, State Board"
                    />
                    <FieldError
                      message={errors[`academic.${index}.boardUniversity`]}
                    />
                  </EmployeeFormField>
                )}

                {isHigherEd && (
                  <EmployeeFormField>
                    <FieldLabel>Field of study</FieldLabel>
                    <input
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                      value={row.fieldOfStudy ?? ""}
                      onBlur={() =>
                        blurAcademicField(index, "fieldOfStudy", values)
                      }
                      onChange={(e) =>
                        updateAcademic(index, { fieldOfStudy: e.target.value })
                      }
                      placeholder="e.g. Computer Science, Commerce"
                    />
                    <FieldError
                      message={errors[`academic.${index}.fieldOfStudy`]}
                    />
                  </EmployeeFormField>
                )}

                <EmployeeFormField>
                  <FieldLabel required>Passing year</FieldLabel>
                  <input
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                    value={row.yearTo != null ? String(row.yearTo) : ""}
                    onBlur={() => blurAcademicField(index, "yearTo", values)}
                    onChange={(e) => {
                      const digits = digitsOnly(e.target.value, 4);
                      updateAcademic(index, {
                        yearTo: digits ? Number(digits) : undefined,
                      });
                    }}
                    placeholder="YYYY"
                    inputMode="numeric"
                    maxLength={4}
                  />
                  <FieldError message={errors[`academic.${index}.yearTo`]} />
                </EmployeeFormField>

                <EmployeeFormField>
                  <FieldLabel required>Grade / %</FieldLabel>
                  <input
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                    value={row.gradeOrPercentage ?? ""}
                    onBlur={() =>
                      blurAcademicField(index, "gradeOrPercentage", values)
                    }
                    onChange={(e) =>
                      updateAcademic(index, {
                        gradeOrPercentage: sanitizeGradeInput(e.target.value),
                      })
                    }
                    placeholder="e.g. 85% or First Division"
                  />
                  <FieldError
                    message={errors[`academic.${index}.gradeOrPercentage`]}
                  />
                </EmployeeFormField>
              </div>
            </div>
          );
        })}

        <div className="col-span-full">
          <button
            type="button"
            onClick={addAcademic}
            disabled={!canAddMore}
            className={onboardingBtnAccentOutlineClass}
          >
            <Plus size={16} />
            Add qualification
          </button>
        </div>
        <FieldError message={errors.academic} />
      </EmployeeFormSection>

      {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className={onboardingBtnPrimaryClass}
      >
        {submitting ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
