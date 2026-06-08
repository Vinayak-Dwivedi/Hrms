"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import EmployeeFormSection from "@/features/employees/components/EmployeeFormSection";
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
  onboardingProfileSchema,
  type AcademicDetailValues,
  type BankDetailValues,
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

function issueToFieldKey(path: (string | number)[]): string {
  if (path[0] === "bank" && path.length >= 3) {
    return `bank.${path[1]}.${path[2]}`;
  }
  if (path[0] === "academic" && path.length >= 3) {
    return `academic.${path[1]}.${path[2]}`;
  }
  return String(path[0] ?? "form");
}

function digitsOnly(value: string, maxLen?: number): string {
  const d = value.replace(/\D/g, "");
  return maxLen ? d.slice(0, maxLen) : d;
}

function indianPhoneInput(value: string): string {
  const cleaned = value.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/\D/g, "").slice(0, 12)}`;
  }
  return cleaned.replace(/\D/g, "").slice(0, 13);
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
    bank: initialValues?.bank?.length ? initialValues.bank : DEFAULT_VALUES.bank,
    professional: initialValues?.professional ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function setField<K extends keyof OnboardingProfileValues>(
    key: K,
    value: OnboardingProfileValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
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

  function updateBank(index: number, patch: Partial<BankDetailValues>) {
    setValues((prev) => ({
      ...prev,
      bank: prev.bank.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = onboardingProfileSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        // Zod 4 types issue.path as PropertyKey[] (includes symbols). Form
        // field keys are always strings/numbers in practice — filter symbols
        // out for the issueToFieldKey helper.
        const path = issue.path.filter(
          (p): p is string | number => typeof p !== "symbol",
        );
        const key = issueToFieldKey(path);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setFormError((err as Error).message ?? "Failed to save profile.");
    }
  }

  const canAddMore = canAppendAcademicRow(values.academic);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <EmployeeFormSection title="Address">
        <EmployeeFormField span={2}>
          <FieldLabel required>Current Address</FieldLabel>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={values.currentAddress}
            onChange={(e) => setField("currentAddress", e.target.value)}
          />
          <FieldError message={errors.currentAddress} />
        </EmployeeFormField>
        <EmployeeFormField span={2}>
          <FieldLabel required>Permanent Address</FieldLabel>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={values.permanentAddress}
            onChange={(e) => setField("permanentAddress", e.target.value)}
          />
          <FieldError message={errors.permanentAddress} />
        </EmployeeFormField>
      </EmployeeFormSection>

      <EmployeeFormSection title="Emergency Contact">
        <EmployeeFormField>
          <FieldLabel required>Contact Name</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.emergencyContactName}
            onChange={(e) => setField("emergencyContactName", e.target.value)}
          />
          <FieldError message={errors.emergencyContactName} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>Contact Phone</FieldLabel>
          <input
            className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={values.emergencyContactPhone}
            onChange={(e) =>
              setField("emergencyContactPhone", indianPhoneInput(e.target.value))
            }
            placeholder="9876543210 or +919876543210"
            inputMode="tel"
            autoComplete="tel"
          />
          <FieldHint>Indian mobile: 10 digits starting with 6–9</FieldHint>
          <FieldError message={errors.emergencyContactPhone} />
        </EmployeeFormField>
      </EmployeeFormSection>

      <EmployeeFormSection title="Personal & Compliance">
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
                    onChange={(e) =>
                      updateAcademic(index, { institution: e.target.value })
                    }
                  />
                  <FieldError message={errors[`academic.${index}.institution`]} />
                </EmployeeFormField>

                {isSchool && (
                  <EmployeeFormField>
                    <FieldLabel>Board / University</FieldLabel>
                    <input
                      className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                      value={row.boardUniversity ?? ""}
                      onChange={(e) =>
                        updateAcademic(index, {
                          boardUniversity: e.target.value,
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
                  <FieldLabel>Passing year</FieldLabel>
                  <input
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                    value={row.yearTo != null ? String(row.yearTo) : ""}
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
                  <FieldLabel>Grade / %</FieldLabel>
                  <input
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm bg-white"
                    value={row.gradeOrPercentage ?? ""}
                    onChange={(e) =>
                      updateAcademic(index, {
                        gradeOrPercentage: e.target.value,
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-pink-200 text-pink-700 bg-pink-50 hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Add qualification
          </button>
        </div>
        <FieldError message={errors.academic} />
      </EmployeeFormSection>

      <EmployeeFormSection title="Bank Details">
        {values.bank.map((row, index) => (
          <div key={index} className="contents">
            <EmployeeFormField>
              <FieldLabel required>Account Number</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.accountNumber}
                onChange={(e) =>
                  updateBank(index, {
                    accountNumber: digitsOnly(e.target.value, 18),
                  })
                }
                placeholder="9–18 digits"
                inputMode="numeric"
                maxLength={18}
              />
              <FieldError message={errors[`bank.${index}.accountNumber`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>Account Name</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.accountName}
                onChange={(e) =>
                  updateBank(index, { accountName: e.target.value })
                }
              />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>Bank Name</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.bankName}
                onChange={(e) =>
                  updateBank(index, { bankName: e.target.value })
                }
              />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>Branch</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.branchName}
                onChange={(e) =>
                  updateBank(index, { branchName: e.target.value })
                }
              />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>IFSC Code</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm uppercase"
                value={row.ifscCode}
                onChange={(e) =>
                  updateBank(index, {
                    ifscCode: e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 11),
                  })
                }
                placeholder="SBIN0001234"
                maxLength={11}
              />
              <FieldHint>11 characters: 4 letters + 0 + 6 alphanumeric</FieldHint>
              <FieldError message={errors[`bank.${index}.ifscCode`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-6">
                <input
                  type="checkbox"
                  checked={row.isPrimary ?? false}
                  onChange={(e) =>
                    updateBank(index, { isPrimary: e.target.checked })
                  }
                />
                Primary account
              </label>
            </EmployeeFormField>
          </div>
        ))}
        <FieldError message={errors.bank} />
      </EmployeeFormSection>

      {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{
          background: submitting ? "#f471a8" : "#e91e63",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
