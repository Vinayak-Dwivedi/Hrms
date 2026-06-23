"use client";

import { useForm } from "@tanstack/react-form";
import { Briefcase, Contact, KeyRound, User } from "lucide-react";
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
import OrgHierarchyRoleFields, {
  fetchOrgHierarchyRoleLookups,
  orgHierarchyFormValuesFromStructure,
  orgStructureNotFoundMessage,
  resolveOrgStructureId,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/components/OrgHierarchyRoleFields";
import {
  EmployeeApiError,
  fetchBranches,
  fetchManagerOptions,
  fetchRoleOptions,
  toManagerSelectOptions,
  toSelectOptions,
  type EmployeeDetail,
  type LookupItem,
  type ManagerOption,
  updateEmployee,
} from "../api/employees.client";
import {
  createUpdateEmployeeFieldValidators,
  createUpdateEmployeeFormSchema,
  detailToFormValues,
  formatEmployeeValidationErrors,
  isJoiningDateAfterMaxWindow,
  maxDateOfBirthForAdult,
  PASSWORD_MIN_MESSAGE,
  sanitizePhoneInput,
  toUpdateApiPayload,
  zodFormFieldErrors,
} from "../schemas/employee.schema";
import {
  employeeCardClass,
  employeeFormNativeSelectClass,
  employeeFormSectionsGridClass,
  employeeListBtnClass,
  employeeListBtnOutlineClass,
  employeeListErrorBannerClass,
  employeeListFormControlClass,
  employeeListFormFieldsClass,
  employeeListWarnBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import EmployeeFormField from "./EmployeeFormField";
import EmployeeFormSection from "./EmployeeFormSection";

const employeeFieldControl = { controlClassName: employeeListFormControlClass };
const maxDob = maxDateOfBirthForAdult();
const maxDobDate = new Date(`${maxDob}T23:59:59`);

interface Props {
  employee: EmployeeDetail;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FormLookups = OrgHierarchyRoleLookups & {
  branches: Awaited<ReturnType<typeof fetchBranches>>;
  managers: ManagerOption[];
  roleOptions: LookupItem[];
  lookupsError: string | null;
};

function EditEmployeeFormContent({
  employee,
  embedded = false,
  onSuccess,
  onCancel,
  departments,
  subDepartments,
  designations,
  levels,
  structures,
  branches,
  managers,
  roleOptions,
  lookupsError,
}: Props & FormLookups) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [revealErrors, setRevealErrors] = useState(false);

  const validRoleIds = useMemo(
    () => roleOptions.map((role) => role.id),
    [roleOptions],
  );

  const hasLoginAccount = employee.roleId != null;

  const updateSchema = useMemo(
    () => createUpdateEmployeeFormSchema(validRoleIds, hasLoginAccount),
    [validRoleIds, hasLoginAccount],
  );

  const fieldValidators = useMemo(
    () => createUpdateEmployeeFieldValidators(validRoleIds, hasLoginAccount),
    [validRoleIds, hasLoginAccount],
  );

  const defaultValues = useMemo(
    () =>
      detailToFormValues(
        employee,
        orgHierarchyFormValuesFromStructure(
          employee.orgHierarchyStructureId,
          structures,
        ),
      ),
    [employee, structures],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onChange: zodFormFieldErrors(updateSchema),
      onBlur: zodFormFieldErrors(updateSchema),
      onSubmit: zodFormFieldErrors(updateSchema),
    },
    onSubmitInvalid: () => {
      setRevealErrors(true);
      setSubmitError("Please fix the highlighted fields before submitting.");
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const parsed = updateSchema.safeParse(value);
      if (!parsed.success) {
        setRevealErrors(true);
        setSubmitError(
          parsed.error.issues.map((i) => i.message).join(" ") ||
            "Please fix the form errors.",
        );
        return;
      }

      const reportingManagerId = Number(parsed.data.reportingManagerId);
      if (
        Number.isInteger(reportingManagerId) &&
        reportingManagerId > 0 &&
        reportingManagerId === employee.id
      ) {
        setSubmitError("Employee cannot be their own reporting manager.");
        return;
      }

      const structureId = resolveOrgStructureId(
        structures,
        Number(parsed.data.orgHierarchyDepartmentId),
        Number(parsed.data.orgHierarchySubDepartmentId),
        Number(parsed.data.orgHierarchyDesignationId),
      );
      if (structureId == null) {
        setRevealErrors(true);
        setSubmitError(orgStructureNotFoundMessage());
        return;
      }

      try {
        await updateEmployee(
          employee.id,
          toUpdateApiPayload(parsed.data, structureId),
        );
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
      <div className="p-5">
      {lookupsError && (
        <div className={employeeListWarnBannerClass}>
          Some dropdown options failed to load: {lookupsError}
        </div>
      )}

      {submitError && (
        <div className={employeeListErrorBannerClass}>{submitError}</div>
      )}

      <div className={employeeFormSectionsGridClass}>
        <EmployeeFormSection compact icon={User} title="Basic Information">
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
          bodyClassName={`px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 ${employeeListFormFieldsClass}`}
          compact
          icon={Contact}
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

        <EmployeeFormSection compact dense icon={Briefcase} title="Employment Details">
          <EmployeeFormField>
            <form.Field
              name="joiningDate"
              validators={fieldValidators.joiningDate}
            >
              {(field) => (
                <DateField
                  {...employeeFieldControl}
                  disabled={(date) => isJoiningDateAfterMaxWindow(date)}
                  field={field}
                  label="Joining date"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="locationId" validators={fieldValidators.locationId}>
              {(field) => (
                <SelectField
                  {...employeeFieldControl}
                  emptyOptionLabel="None"
                  field={field}
                  label="Location"
                  options={toSelectOptions(branches)}
                  placeholder="Select location"
                  onValueChange={() => {
                    form.setFieldValue("orgHierarchyDepartmentId", "");
                    form.setFieldValue("orgHierarchySubDepartmentId", "");
                    form.setFieldValue("orgHierarchyDesignationId", "");
                  }}
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <OrgHierarchyRoleFields
            controlClassName={employeeFormNativeSelectClass}
            departments={departments}
            designations={designations}
            fieldValidators={fieldValidators}
            form={form}
            levels={levels}
            structures={structures}
            subDepartments={subDepartments}
            requireLocation
          />

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
        </EmployeeFormSection>

        <EmployeeFormSection compact icon={KeyRound} title="Account & Access">
          <EmployeeFormField>
            <form.Subscribe selector={(s) => s.values.workEmail}>
              {(workEmail) => {
                const canAssignRole =
                  hasLoginAccount || Boolean(workEmail?.trim());
                const roleDescription = hasLoginAccount
                  ? employee.roleName ?? undefined
                  : canAssignRole
                    ? "Choose a role and set a new password below to create login access"
                    : "Set a work email above to assign system access";

                return (
                  <form.Field name="roleId" validators={fieldValidators.roleId}>
                    {(field) => (
                      <SelectField
                        {...employeeFieldControl}
                        description={roleDescription}
                        disabled={!canAssignRole}
                        field={field}
                        label="System access role"
                        options={toSelectOptions(roleOptions)}
                        placeholder="Select role"
                      />
                    )}
                  </form.Field>
                );
              }}
            </form.Subscribe>
          </EmployeeFormField>

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

      <div className="flex items-center justify-end gap-3 px-5 py-3 bg-gray-50 border-t border-gray-100">
        {onCancel ? (
          <button
            className={employeeListBtnOutlineClass}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : (
          <Link
            className={employeeListBtnOutlineClass}
            href={`/employees/${employee.id}`}
          >
            Cancel
          </Link>
        )}
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              className={`${employeeListBtnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
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

export default function EditEmployeeForm({
  employee,
  embedded = false,
  onSuccess,
  onCancel,
}: Props) {
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState<string | null>(null);
  const [orgLookups, setOrgLookups] = useState<OrgHierarchyRoleLookups>({
    departments: [],
    subDepartments: [],
    designations: [],
    levels: [],
    structures: [],
  });
  const [branches, setBranches] = useState<Awaited<ReturnType<typeof fetchBranches>>>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<LookupItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [org, brs, mgrs, roles] = await Promise.all([
          fetchOrgHierarchyRoleLookups(),
          fetchBranches(),
          fetchManagerOptions(),
          fetchRoleOptions(),
        ]);
        if (cancelled) return;
        setOrgLookups(org);
        setBranches(brs);
        setManagers(mgrs.filter((m) => m.id !== employee.id));
        setRoleOptions(roles);
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

  if (lookupsLoading) {
    return <div className={employeeLoadingClass}>Loading form options…</div>;
  }

  return (
    <EditEmployeeFormContent
      {...orgLookups}
      branches={branches}
      employee={employee}
      embedded={embedded}
      lookupsError={lookupsError}
      managers={managers}
      roleOptions={roleOptions}
      onCancel={onCancel}
      onSuccess={onSuccess}
    />
  );
}
