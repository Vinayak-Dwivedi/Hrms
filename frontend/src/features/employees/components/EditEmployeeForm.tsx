"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  detailToFormValues,
  toUpdateApiPayload,
  updateEmployeeFormSchema,
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

  const form = useForm({
    defaultValues: detailToFormValues(employee),
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const parsed = updateEmployeeFormSchema.safeParse(value);
      if (!parsed.success) {
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
        await updateEmployee(employee.id, toUpdateApiPayload(parsed.data));
        toast.success("Employee updated successfully.");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/employees");
        }
      } catch (e) {
        if (e instanceof EmployeeApiError) {
          if (e.status === 422 && Array.isArray(e.details)) {
            const messages = (e.details as { message?: string }[])
              .map((d) => d.message)
              .filter(Boolean)
              .join(" ");
            setSubmitError(messages || e.message);
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
    <form
      className={embedded ? "flex flex-col" : `${employeeCardClass} overflow-hidden`}
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
            <form.Field name="empId">
              {(field) => (
                <TextField {...employeeFieldControl} field={field} label="Employee ID" />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="firstName">
              {(field) => (
                <TextField {...employeeFieldControl} field={field} label="First name" />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="employeeStatus">
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
            <form.Field name="middleName">
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
            <form.Field name="lastName">
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
            <form.Field name="personalEmail">
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
            <form.Field name="workEmail">
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
            <form.Field name="phone">
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="tel"
                  field={field}
                  inputMode="tel"
                  label="Phone"
                  type="tel"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="dob">
              {(field) => (
                <DateField {...employeeFieldControl} field={field} label="Date of birth" />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="gender">
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

          <EmployeeFormField>
            <form.Field name="maritalStatus">
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Marital status"
                  options={[
                    { value: "Single", label: "Single" },
                    { value: "Married", label: "Married" },
                  ]}
                  placeholder="Select status"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="spouseName">
              {(field) => (
                <TextField {...employeeFieldControl} field={field} label="Spouse name" />
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
            <form.Field name="joiningDate">
              {(field) => (
                <DateField {...employeeFieldControl} field={field} label="Joining date" />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="departmentId">
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
            <form.Field name="designationId">
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
            <form.Field name="gradeId">
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
            <form.Field name="branchId">
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
            <form.Field name="reportingManagerId">
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
          description="Leave blank to keep the current login password."
          title="Account & Access"
        >
          <EmployeeFormField>
            <form.Field name="password">
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  description="Minimum 8 characters."
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
  );
}
