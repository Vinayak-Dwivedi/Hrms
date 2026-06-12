"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormValidationRevealProvider } from "@/components/form/form-validation-context";
import {
  DateField,
  SelectField,
  TextField,
} from "@/components/form/form-field";
import {
  EmployeeApiError,
  fetchBranches,
  fetchDepartments,
  fetchDesignations,
  fetchGrades,
  fetchManagerOptions,
  toManagerSelectOptions,
  toSelectOptions,
  type EmployeeDetail,
  type LookupItem,
  type ManagerOption,
  updateEmployee,
} from "../api/employees.client";
import {
  createUpdateEmployeeFieldValidators,
  detailToFormValues,
  formatEmployeeValidationErrors,
  maxDateOfBirthForAdult,
  PASSWORD_MIN_MESSAGE,
  sanitizePhoneInput,
  toUpdateApiPayload,
  updateEmployeeFormSchema,
  zodFormFieldErrors,
} from "../schemas/employee.schema";
import {
  employeeBtnClass,
  employeeCardClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
  employeeWarnBannerClass,
  employeeFormControlClass,
  employeeFormSectionsStackClass,
} from "../employee-theme";
import EmployeeFormField from "./EmployeeFormField";
import EmployeeFormSection from "./EmployeeFormSection";

const employeeFieldControl = { controlClassName: employeeFormControlClass };
const maxDob = maxDateOfBirthForAdult();
const maxDobDate = new Date(`${maxDob}T23:59:59`);

interface Props {
  employee: EmployeeDetail;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditEmployeeForm({
  employee,
  embedded = false,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [revealErrors, setRevealErrors] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [grades, setGrades] = useState<LookupItem[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [depts, desigs, brs, grds, mgrs] = await Promise.all([
          fetchDepartments(),
          fetchDesignations(),
          fetchBranches(),
          fetchGrades(),
          fetchManagerOptions(),
        ]);
        if (cancelled) return;
        setDepartments(depts);
        setDesignations(desigs);
        setBranches(brs);
        setGrades(grds);
        setManagers(mgrs.filter((m) => m.id !== employee.id));
      } catch (e) {
        if (!cancelled) setLookupsError((e as Error).message);
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  const fieldValidators = useMemo(
    () => createUpdateEmployeeFieldValidators(),
    [],
  );

  const form = useForm({
    defaultValues: detailToFormValues(employee),
    validators: {
      onChange: zodFormFieldErrors(updateEmployeeFormSchema),
      onBlur: zodFormFieldErrors(updateEmployeeFormSchema),
      onSubmit: zodFormFieldErrors(updateEmployeeFormSchema),
    },
    onSubmitInvalid: () => {
      setRevealErrors(true);
      setSubmitError("Please fix the highlighted fields before submitting.");
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const parsed = updateEmployeeFormSchema.safeParse(value);
      if (!parsed.success) {
        setRevealErrors(true);
        setSubmitError(
          parsed.error.issues.map((i) => i.message).join(" ") ||
            "Please fix the form errors.",
        );
        return;
      }

      if (
        parsed.data.reportingManagerId != null &&
        parsed.data.reportingManagerId === employee.id
      ) {
        setSubmitError("Employee cannot be their own reporting manager.");
        return;
      }

      try {
        // toUpdateApiPayload accepts the raw form input (string IDs etc.)
        // and does its own coercion to the API's typed payload. parsed.data
        // is only used above for validation/error surfacing.
        await updateEmployee(employee.id, toUpdateApiPayload(parsed.data));
        toast.success("Employee updated successfully.");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/employees");
        }
      } catch (e) {
        if (e instanceof EmployeeApiError) {
          if (e.status === 422) {
            setRevealErrors(true);
            setSubmitError(
              formatEmployeeValidationErrors(e.details) ?? e.message,
            );
            return;
          }
          setSubmitError(e.message);
          return;
        }
        setSubmitError((e as Error).message ?? "Failed to update employee.");
      }
    },
  });

  if (lookupsLoading) {
    return <div className={employeeLoadingClass}>Loading form options…</div>;
  }

  return (
    <FormValidationRevealProvider reveal={revealErrors}>
    <form
      className={embedded ? "flex flex-col" : `${employeeCardClass} overflow-hidden`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="p-6">
      {lookupsError && (
        <div className={employeeWarnBannerClass}>
          Some dropdown options failed to load: {lookupsError}
        </div>
      )}

      {submitError && (
        <div className={employeeErrorBannerClass}>{submitError}</div>
      )}

      <div className={employeeFormSectionsStackClass}>
        <EmployeeFormSection
          description="Primary identifiers and employment status."
          title="Basic Information"
        >
          <EmployeeFormField>
            <form.Field name="empId" validators={fieldValidators.empId}>
              {(field) => (
                <TextField {...employeeFieldControl} field={field} label="Employee ID" />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="firstName" validators={fieldValidators.firstName}>
              {(field) => (
                <TextField {...employeeFieldControl} field={field} label="First name" />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field
              name="employeeStatus"
              validators={fieldValidators.employeeStatus}
            >
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  field={field}
                  label="Status"
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "Probation", label: "Probation" },
                    { value: "Notice", label: "Notice" },
                    { value: "Exited", label: "Exited" },
                  ]}
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="middleName" validators={fieldValidators.middleName}>
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  field={field}
                  label="Middle name"
                  placeholder="Optional"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="lastName" validators={fieldValidators.lastName}>
              {(field) => (
                <TextField {...employeeFieldControl} field={field} label="Last name" />
              )}
            </form.Field>
          </EmployeeFormField>
        </EmployeeFormSection>

        <EmployeeFormSection
          dense
          description="Contact and demographic details for the employee profile."
          title="Personal Details"
        >
          <EmployeeFormField>
            <form.Field
              name="personalEmail"
              validators={fieldValidators.personalEmail}
            >
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  field={field}
                  label="Personal email"
                  type="email"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="workEmail" validators={fieldValidators.workEmail}>
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  field={field}
                  label="Work email"
                  type="email"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="phone" validators={fieldValidators.phone}>
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="tel"
                  field={field}
                  inputMode="numeric"
                  label="Phone"
                  maxLength={10}
                  normalizeValue={sanitizePhoneInput}
                  placeholder="9999900000"
                  pattern="[0-9]{10}"
                  type="tel"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="dob" validators={fieldValidators.dob}>
              {(field) => (
                <DateField
                  {...employeeFieldControl}
                  disabled={(date) => date > maxDobDate}
                  field={field}
                  label="Date of birth"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="gender" validators={fieldValidators.gender}>
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  field={field}
                  label="Gender"
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              )}
            </form.Field>
          </EmployeeFormField>

        </EmployeeFormSection>

        <EmployeeFormSection
          dense
          description="Job placement, reporting structure, and org hierarchy."
          title="Employment Details"
        >
          <EmployeeFormField>
            <form.Field
              name="joiningDate"
              validators={fieldValidators.joiningDate}
            >
              {(field) => (
                <DateField
                  {...employeeFieldControl}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    return date > today;
                  }}
                  field={field}
                  label="Joining date"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field
              name="departmentId"
              validators={fieldValidators.departmentId}
            >
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Department"
                  options={toSelectOptions(departments)}
                  placeholder="Select department"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field
              name="designationId"
              validators={fieldValidators.designationId}
            >
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Designation"
                  options={toSelectOptions(designations)}
                  placeholder="Select designation"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="gradeId" validators={fieldValidators.gradeId}>
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Grade"
                  options={toSelectOptions(grades)}
                  placeholder="Select grade"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="branchId" validators={fieldValidators.branchId}>
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Branch"
                  options={toSelectOptions(branches)}
                  placeholder="Select branch"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field
              name="reportingManagerId"
              validators={fieldValidators.reportingManagerId}
            >
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Reporting manager"
                  options={toManagerSelectOptions(managers)}
                  placeholder="Select manager"
                />
              )}
            </form.Field>
          </EmployeeFormField>
        </EmployeeFormSection>

        <EmployeeFormSection
          description="Leave password fields blank to keep the current login password."
          title="Account & Access"
        >
          <EmployeeFormField>
            <form.Field name="password">
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="new-password"
                  description={PASSWORD_MIN_MESSAGE}
                  field={field}
                  label="New password"
                  type="password"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="confirmPassword">
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="new-password"
                  field={field}
                  label="Confirm new password"
                  type="password"
                />
              )}
            </form.Field>
          </EmployeeFormField>
        </EmployeeFormSection>
      </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        {onCancel ? (
          <button
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : (
          <Link
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm no-underline transition-colors"
            href={`/employees/${employee.id}`}
          >
            Cancel
          </Link>
        )}
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              className={`${employeeBtnClass} disabled:opacity-60`}
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
    </FormValidationRevealProvider>
  );
}
