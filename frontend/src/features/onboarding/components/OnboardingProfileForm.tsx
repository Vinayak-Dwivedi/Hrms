"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchOnboardingFormOptions,
  OnboardingRequestError,
} from "@/features/onboarding/api/onboarding.client";
import { fetchHrOnboardingFormOptions } from "@/features/employees/api/hr-onboarding.client";
import {
  firstProfileApiValidationMessage,
  mapProfileApiIssuesToFieldErrors,
} from "@/features/onboarding/lib/profile-validation-errors";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import EmployeeFormSection from "@/features/employees/components/EmployeeFormSection";
import {
  WorkInformationFields,
  createEmptyProfessionalRow,
  normalizeProfessionalForValidation,
} from "@/features/employees/components/WorkInformationSection";
import {
  employeeFormControlClass,
  employeeFormSectionsGridClass,
  employeeFormSectionsStackClass,
} from "@/features/employees/employee-theme";
import { sanitizePhoneInput } from "@/features/employees/schemas/employee.schema";
import {
  sanitizeAlphaOnlyInput,
  sanitizeNumericGradeInput,
} from "@/lib/academic-field-validation";
import { cn } from "@/lib/utils";
import {
  ADDABLE_ACADEMIC_OPTIONS,
  createEmptyAcademicRow,
  DEFAULT_ACADEMIC_ROWS,
  getPassingYearOptions,
  isFixedDefaultQualification,
  isHigherEdQualification,
  isSchoolQualification,
  MAX_ACADEMIC_RECORDS,
  QUAL_OTHER,
} from "../constants/academic";
import {
  BLOOD_GROUP_OPTIONS,
  type BloodGroupOption,
} from "../constants/blood-groups";
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
  type ProfessionalDetailValues,
} from "../schemas/onboarding.schema";

interface Props {
  initialValues?: Partial<OnboardingProfileValues>;
  onSubmit?: (values: OnboardingProfileValues) => Promise<void>;
  submitting?: boolean;
  embedded?: boolean;
  /** Side-by-side sections on wide screens (HR onboarding page). Default stack for employee wizard. */
  sectionsLayout?: "stack" | "grid";
  /** Where to load blood group options from (API reads BLOOD_GROUPS env). */
  formOptionsSource?: "employee" | "hr";
  hideSections?: { work?: boolean };
  /** Renders beside Personal & Compliance (e.g. bank details on HR edit). */
  companionSection?: ReactNode;
}

export type OnboardingProfileFormHandle = {
  validate: () => OnboardingProfileValues | null;
  isEmpty: () => boolean;
  isDirty: () => boolean;
  getValues: () => OnboardingProfileValues;
  revealErrors: () => void;
};

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

function normalizeProfileForValidation(
  values: OnboardingProfileValues,
  noPreviousEmployment: boolean,
): OnboardingProfileValues {
  return {
    ...values,
    professional: normalizeProfessionalForValidation(
      values.professional,
      noPreviousEmployment,
    ),
  };
}

function FieldLabel({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-gray-700 mb-1.5",
        className,
      )}
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1 m-0">{message}</p>;
}

function fieldControlClass(error?: string) {
  return cn(
    employeeFormControlClass,
    "w-full shadow-none",
    error && "!border-red-500",
  );
}

function fieldTextareaClass(error?: string) {
  return `h-20 w-full resize-y rounded-md border px-3 py-2 text-sm ${
    error ? "border-red-500" : "border-gray-200"
  }`;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-500 mt-1 m-0">{children}</p>;
}

const ADDRESS_MAX_LENGTH = 200;

function FieldCharCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="text-xs text-gray-500 mt-1 m-0 text-right">
      {value.length}/{max}
    </p>
  );
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

function getServerFieldErrors(err: unknown): Record<string, string> {
  const details =
    err instanceof OnboardingRequestError
      ? err.details
      : (err as { details?: unknown } | null)?.details;
  if (!Array.isArray(details)) return {};
  return mapProfileApiIssuesToFieldErrors(details);
}

function profileDirtySnapshot(
  values: OnboardingProfileValues,
  options: { noPreviousEmployment: boolean; excludeProfessional?: boolean },
): string {
  const normalized = normalizeProfileForValidation(
    values,
    options.noPreviousEmployment,
  );
  if (options.excludeProfessional) {
    const { professional: _professional, ...rest } = normalized;
    return JSON.stringify(rest);
  }
  return JSON.stringify(normalized);
}

function isProfileEmpty(values: OnboardingProfileValues): boolean {
  const hasPersonalData =
    values.currentAddress.trim() ||
    values.permanentAddress.trim() ||
    values.emergencyContactName.trim() ||
    values.emergencyContactPhone.trim() ||
    values.fatherName?.trim() ||
    values.motherName?.trim() ||
    values.panNo.trim() ||
    values.aadhaarNo.trim() ||
    values.uanNo?.trim() ||
    values.esicNo?.trim();

  const hasAcademicData = values.academic.some(
    (row) =>
      row.institution.trim() ||
      row.boardUniversity?.trim() ||
      row.gradeOrPercentage?.trim(),
  );

  return !hasPersonalData && !hasAcademicData;
}

const OnboardingProfileForm = forwardRef<OnboardingProfileFormHandle, Props>(
  function OnboardingProfileForm(
    {
      initialValues,
      onSubmit,
      submitting = false,
      embedded = false,
      sectionsLayout = "stack",
      formOptionsSource = "employee",
      hideSections,
      companionSection,
    },
    ref,
  ) {
  const [bloodGroupOptions, setBloodGroupOptions] =
    useState<BloodGroupOption[]>(BLOOD_GROUP_OPTIONS);
  const [values, setValues] = useState<OnboardingProfileValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
    academic: initialValues?.academic?.length
      ? initialValues.academic
      : DEFAULT_VALUES.academic,
    professional:
      (initialValues?.professional ?? []).length > 0
        ? (initialValues?.professional ?? []).slice(0, 1)
        : [createEmptyProfessionalRow()],
  });
  const [noPreviousEmployment, setNoPreviousEmployment] = useState(false);
  const [permanentSameAsCurrent, setPermanentSameAsCurrent] = useState(() =>
    addressesMatch(
      initialValues?.currentAddress ?? DEFAULT_VALUES.currentAddress,
      initialValues?.permanentAddress ?? DEFAULT_VALUES.permanentAddress,
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const initialSnapshotRef = useRef(
    profileDirtySnapshot(values, {
      noPreviousEmployment: false,
      excludeProfessional: hideSections?.work,
    }),
  );

  useEffect(() => {
    let cancelled = false;
    const loadOptions =
      formOptionsSource === "hr"
        ? fetchHrOnboardingFormOptions
        : fetchOnboardingFormOptions;

    void loadOptions()
      .then((options) => {
        if (!cancelled && options.bloodGroups.length > 0) {
          setBloodGroupOptions(options.bloodGroups);
        }
      })
      .catch(() => {
        /* keep build-time / default options */
      });

    return () => {
      cancelled = true;
    };
  }, [formOptionsSource]);

  function handleNoPreviousEmploymentChange(checked: boolean) {
    setNoPreviousEmployment(checked);
    if (checked) {
      setValues((prev) => ({ ...prev, professional: [] }));
      setErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.startsWith("professional")) delete next[key];
        }
        return next;
      });
    } else {
      setValues((prev) => ({
        ...prev,
        professional:
          (prev.professional ?? []).length > 0
            ? [(prev.professional ?? [])[0]!]
            : [createEmptyProfessionalRow()],
      }));
    }
  }

  function blurProfessionalField(
    field: keyof ProfessionalDetailValues,
    nextValues: OnboardingProfileValues,
  ) {
    blurField(
      `professional.0.${field}`,
      normalizeProfileForValidation(nextValues, noPreviousEmployment),
    );
  }

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
    const row = values.academic[index];
    if (!row || isFixedDefaultQualification(row.qualification)) return;
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

    const payload = normalizeProfileForValidation(values, noPreviousEmployment);
    const parsed = onboardingProfileSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(collectOnboardingProfileErrors(payload));
      if (!embedded) {
        setFormError("Please fix the highlighted fields before submitting.");
      }
      return;
    }

    setErrors({});

    try {
      await onSubmit?.(parsed.data);
    } catch (err) {
      const serverFieldErrors = getServerFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...serverFieldErrors }));
        setFormError(null);
        return;
      }
      setFormError(
        firstProfileApiValidationMessage(
          (err as { details?: unknown }).details,
        ) ??
          (err as Error).message ??
          "Failed to save profile.",
      );
    }
  }

  const canAddMore = canAppendAcademicRow(values.academic);
  const passingYearOptions = getPassingYearOptions();
  const schoolAcademicEntries = values.academic
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => isFixedDefaultQualification(row.qualification));
  const addedAcademicEntries = values.academic
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isFixedDefaultQualification(row.qualification));

  function renderAcademicRow(index: number, row: AcademicDetailValues) {
    const isFixed = isFixedDefaultQualification(row.qualification);
    const isSchool = isSchoolQualification(row.qualification);
    const isHigherEd = isHigherEdQualification(row.qualification);
    const isOther = row.qualification === QUAL_OTHER;
    const isAddedRow = !isFixed && row.qualification === "";

    return (
      <div
        key={`academic-${index}-${row.id ?? row.qualification}`}
        className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-semibold text-gray-900 m-0">
            {isFixed
              ? row.qualification
              : row.qualification || "New qualification"}
          </h4>
          {!isFixed && (
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
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {!isFixed && (
            <EmployeeFormField>
              <FieldLabel required>Qualification</FieldLabel>
              <select
                className={fieldControlClass(
                  errors[`academic.${index}.qualification`],
                )}
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
              <FieldError
                message={errors[`academic.${index}.qualification`]}
              />
            </EmployeeFormField>
          )}

          {isOther && (
            <EmployeeFormField>
              <FieldLabel required>Qualification name</FieldLabel>
              <input
                className={fieldControlClass(
                  errors[`academic.${index}.qualificationOther`],
                )}
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
              className={fieldControlClass(
                errors[`academic.${index}.institution`],
              )}
              value={row.institution}
              onBlur={() => blurAcademicField(index, "institution", values)}
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
                className={fieldControlClass(
                  errors[`academic.${index}.boardUniversity`],
                )}
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
                className={fieldControlClass(
                  errors[`academic.${index}.fieldOfStudy`],
                )}
                value={row.fieldOfStudy ?? ""}
                onBlur={() =>
                  blurAcademicField(index, "fieldOfStudy", values)
                }
                onChange={(e) =>
                  updateAcademic(index, { fieldOfStudy: e.target.value })
                }
                placeholder="e.g. Computer Science, Commerce"
              />
              <FieldError message={errors[`academic.${index}.fieldOfStudy`]} />
            </EmployeeFormField>
          )}

          <EmployeeFormField>
            <FieldLabel required>Passing year</FieldLabel>
            <select
              className={fieldControlClass(errors[`academic.${index}.yearTo`])}
              value={row.yearTo != null ? String(row.yearTo) : ""}
              onBlur={() => blurAcademicField(index, "yearTo", values)}
              onChange={(e) => {
                const val = e.target.value;
                updateAcademic(index, {
                  yearTo: val ? Number(val) : undefined,
                });
              }}
            >
              <option value="">Select year</option>
              {passingYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <FieldError message={errors[`academic.${index}.yearTo`]} />
          </EmployeeFormField>

          <EmployeeFormField>
            <FieldLabel required>Grade</FieldLabel>
            <input
              className={fieldControlClass(
                errors[`academic.${index}.gradeOrPercentage`],
              )}
              value={row.gradeOrPercentage ?? ""}
              onBlur={() =>
                blurAcademicField(index, "gradeOrPercentage", values)
              }
              onChange={(e) =>
                updateAcademic(index, {
                  gradeOrPercentage: sanitizeNumericGradeInput(e.target.value),
                })
              }
              placeholder="e.g. 85 or 9.5"
              inputMode="decimal"
            />
            <FieldHint>Percentage (e.g. 85) or CGPA on a 10-point scale (e.g. 9.5)</FieldHint>
            <FieldError
              message={errors[`academic.${index}.gradeOrPercentage`]}
            />
          </EmployeeFormField>
        </div>
      </div>
    );
  }

  useImperativeHandle(ref, () => ({
    validate: () => {
      const payload = normalizeProfileForValidation(
        values,
        noPreviousEmployment,
      );
      const validationPayload = hideSections?.work
        ? { ...payload, professional: [] }
        : payload;
      const parsed = onboardingProfileSchema.safeParse(validationPayload);
      if (!parsed.success) {
        setErrors(collectOnboardingProfileErrors(validationPayload));
        return null;
      }
      setErrors({});
      return hideSections?.work
        ? { ...parsed.data, professional: payload.professional }
        : parsed.data;
    },
    isEmpty: () => isProfileEmpty(values),
    isDirty: () =>
      profileDirtySnapshot(values, {
        noPreviousEmployment,
        excludeProfessional: hideSections?.work,
      }) !== initialSnapshotRef.current,
    getValues: () =>
      normalizeProfileForValidation(values, noPreviousEmployment),
    revealErrors: () => {
      const payload = normalizeProfileForValidation(
        values,
        noPreviousEmployment,
      );
      const validationPayload = hideSections?.work
        ? { ...payload, professional: [] }
        : payload;
      setErrors(collectOnboardingProfileErrors(validationPayload));
    },
  }));

  const sectionsClass =
    sectionsLayout === "grid"
      ? employeeFormSectionsGridClass
      : employeeFormSectionsStackClass;

  const formBody = (
    <div className={sectionsClass}>
      <div
        className={
          sectionsLayout === "grid"
            ? "col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
            : "grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
        }
      >
      <EmployeeFormSection
        title="Address"
        headerAction={
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
        }
      >
        <EmployeeFormField>
          <FieldLabel required>Current Address</FieldLabel>
          <textarea
            className={fieldTextareaClass(errors.currentAddress)}
            value={values.currentAddress}
            onBlur={() => blurField("currentAddress", values)}
            onChange={(e) => setCurrentAddress(e.target.value)}
            maxLength={ADDRESS_MAX_LENGTH}
          />
          <FieldCharCount value={values.currentAddress} max={ADDRESS_MAX_LENGTH} />
          <FieldError message={errors.currentAddress} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>Permanent Address</FieldLabel>
          <textarea
            className={`${fieldTextareaClass(errors.permanentAddress)} disabled:bg-gray-50 disabled:text-gray-400`}
            value={values.permanentAddress}
            onBlur={() => blurField("permanentAddress", values)}
            onChange={(e) => setField("permanentAddress", e.target.value)}
            disabled={permanentSameAsCurrent}
            readOnly={permanentSameAsCurrent}
            maxLength={ADDRESS_MAX_LENGTH}
          />
          <FieldCharCount
            value={values.permanentAddress}
            max={ADDRESS_MAX_LENGTH}
          />
          <FieldError message={errors.permanentAddress} />
        </EmployeeFormField>
      </EmployeeFormSection>

      <EmployeeFormSection title="Emergency Contact">
        <EmployeeFormField>
          <FieldLabel required>Contact Name</FieldLabel>
          <input
            className={fieldControlClass(errors.emergencyContactName)}
            value={values.emergencyContactName}
            onBlur={() => blurField("emergencyContactName", values)}
            onChange={(e) => setField("emergencyContactName", e.target.value)}
          />
          <FieldError message={errors.emergencyContactName} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>Contact Phone</FieldLabel>
          <input
            className={fieldControlClass(errors.emergencyContactPhone)}
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
      </div>

      <div
        className={
          sectionsLayout === "grid"
            ? "col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
            : "grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
        }
      >
      <EmployeeFormSection title="Personal & Compliance">
        <EmployeeFormField>
          <FieldLabel required>Marital Status</FieldLabel>
          <select
            className={fieldControlClass(errors.maritalStatus)}
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
            className={`${fieldControlClass(errors.spouseName)} disabled:bg-gray-50 disabled:text-gray-400`}
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
            className={fieldControlClass()}
            value={values.fatherName ?? ""}
            onChange={(e) => setField("fatherName", e.target.value)}
          />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>Mother&apos;s Name</FieldLabel>
          <input
            className={fieldControlClass()}
            value={values.motherName ?? ""}
            onChange={(e) => setField("motherName", e.target.value)}
          />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>Blood Group</FieldLabel>
          <select
            className={fieldControlClass(errors.bloodGroup)}
            value={values.bloodGroup ?? ""}
            onBlur={() => blurField("bloodGroup", values)}
            onChange={(e) => setField("bloodGroup", e.target.value)}
          >
            <option value="">Select blood group</option>
            {bloodGroupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.bloodGroup} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>PAN Number</FieldLabel>
          <input
            className={`${fieldControlClass(errors.panNo)} uppercase`}
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
          <FieldError message={errors.panNo} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel required>Aadhaar Number</FieldLabel>
          <input
            className={fieldControlClass(errors.aadhaarNo)}
            value={values.aadhaarNo}
            onBlur={() => blurField("aadhaarNo", values)}
            onChange={(e) => setField("aadhaarNo", digitsOnly(e.target.value, 12))}
            placeholder="1234 5678 9012"
            inputMode="numeric"
            maxLength={12}
          />
          <FieldError message={errors.aadhaarNo} />
        </EmployeeFormField>
        <EmployeeFormField>
          <FieldLabel>UAN (optional)</FieldLabel>
          <input
            className={fieldControlClass(errors.uanNo)}
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
            className={fieldControlClass(errors.esicNo)}
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

      {companionSection}

      {!companionSection && !hideSections?.work ? (
        <WorkInformationFields
          professional={values.professional ?? []}
          noPreviousEmployment={noPreviousEmployment}
          onNoPreviousEmploymentChange={handleNoPreviousEmploymentChange}
          onProfessionalChange={(professional) => {
            setValues((prev) => ({ ...prev, professional }));
            setErrors((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                if (key.startsWith("professional.")) delete next[key];
              }
              return next;
            });
          }}
          errors={errors}
          onBlurField={(field) =>
            blurProfessionalField(field, {
              ...values,
              professional: normalizeProfessionalForValidation(
                values.professional,
                noPreviousEmployment,
              ),
            })
          }
        />
      ) : null}
      </div>

      {companionSection && !hideSections?.work ? (
        <WorkInformationFields
          className={sectionsLayout === "grid" ? "col-span-full" : undefined}
          professional={values.professional ?? []}
          noPreviousEmployment={noPreviousEmployment}
          onNoPreviousEmploymentChange={handleNoPreviousEmploymentChange}
          onProfessionalChange={(professional) => {
            setValues((prev) => ({ ...prev, professional }));
            setErrors((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                if (key.startsWith("professional.")) delete next[key];
              }
              return next;
            });
          }}
          errors={errors}
          onBlurField={(field) =>
            blurProfessionalField(field, {
              ...values,
              professional: normalizeProfessionalForValidation(
                values.professional,
                noPreviousEmployment,
              ),
            })
          }
        />
      ) : null}

      <EmployeeFormSection
        title="Academic Details"
        description="Class 10 and Class 12 are pre-filled. Use + to add up to 5 more qualifications (Graduation, Post Graduation, or other)."
        className={sectionsLayout === "grid" ? "col-span-full" : undefined}
      >
        <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {schoolAcademicEntries.map(({ row, index }) =>
            renderAcademicRow(index, row),
          )}
        </div>
        {addedAcademicEntries.map(({ row, index }) => (
          <div key={`academic-added-${index}`} className="col-span-full">
            {renderAcademicRow(index, row)}
          </div>
        ))}

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

      {formError && !embedded && (
        <p className="text-sm text-red-600 mb-4">{formError}</p>
      )}

      {!embedded ? (
        <div
          className={
            sectionsLayout === "grid" ? "col-span-full flex justify-end" : "flex justify-end"
          }
        >
          <button
            type="submit"
            disabled={submitting}
            className={`${onboardingBtnPrimaryClass} w-fit`}
          >
            {submitting ? "Saving…" : "Save Profile"}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className="col-span-full space-y-5">{formBody}</div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formBody}
    </form>
  );
},
);

export default OnboardingProfileForm;
