"use client";

import { useForm } from "@tanstack/react-form";
import { Briefcase, Contact, KeyRound, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormValidationRevealProvider } from "@/components/form/form-validation-context";
import { NativeSelectField, TextField } from "@/components/form/form-field";
import {
  createEmployee,
  EmployeeApiError,
  fetchBranches,
  fetchManagerOptions,
  fetchRoleOptions,
  toManagerSelectOptions,
  toSelectOptions,
  type LookupItem,
  type ManagerOption,
} from "../api/employees.client";
import OrgHierarchyRoleFields, {
  fetchOrgHierarchyRoleLookups,
  orgStructureNotFoundMessage,
  resolveOrgStructureId,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/components/OrgHierarchyRoleFields";
import {
  createEmployeeFieldValidators,
  createEmployeeFormSchema,
  defaultCreateEmployeeValues,
  formatEmployeeValidationErrors,
  maxDateOfBirthForAdult,
  maxDateToday,
  PASSWORD_MIN_MESSAGE,
  sanitizePhoneInput,
  toApiPayload,
  zodFormFieldErrors,
} from "../schemas/employee.schema";
import {
  employeeCardClass,
  employeeListBtnClass,
  employeeListBtnOutlineClass,
  employeeListErrorBannerClass,
  employeeListFormControlClass,
  employeeFormNativeSelectClass,
  employeeListWarnBannerClass,
  employeeLoadingClass,
  employeeFormSectionsGridClass,
  employeeListFormFieldsClass,
} from "../employee-theme";
import EmployeeFormField from "./EmployeeFormField";
import EmployeeFormSection from "./EmployeeFormSection";

const employeeFieldControl = { controlClassName: employeeListFormControlClass };
const employeeSelectControl = {
  controlClassName: employeeFormNativeSelectClass,
};
const maxDob = maxDateOfBirthForAdult();
const maxJoiningDate = maxDateToday();

type FormLookups = OrgHierarchyRoleLookups & {
  branches: LookupItem[];
  managers: ManagerOption[];
  roleOptions: LookupItem[];
  lookupsError: string | null;
};

function AddEmployeeFormContent({
  departments,
  subDepartments,
  designations,
  levels,
  structures,
  branches,
  managers,
  roleOptions,
  lookupsError,
}: FormLookups) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [revealErrors, setRevealErrors] = useState(false);

  const validRoleIds = useMemo(
    () => roleOptions.map((role) => role.id),
    [roleOptions],
  );

  const employeeFormSchema = useMemo(
    () => createEmployeeFormSchema({ validRoleIds }),
    [validRoleIds],
  );

  const fieldValidators = useMemo(
    () => createEmployeeFieldValidators(validRoleIds),
    [validRoleIds],
  );

  const form = useForm({
    defaultValues: defaultCreateEmployeeValues,
    validators: {
      onChange: zodFormFieldErrors(employeeFormSchema),
      onBlur: zodFormFieldErrors(employeeFormSchema),
      onSubmit: zodFormFieldErrors(employeeFormSchema),
    },
    onSubmitInvalid: () => {
      setRevealErrors(true);
      setSubmitError("Please fix the highlighted fields before submitting.");
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const parsed = employeeFormSchema.safeParse(value);
      if (!parsed.success) {
        setRevealErrors(true);
        setSubmitError(
          parsed.error.issues.map((i) => i.message).join(" ") ||
            "Please fix the form errors.",
        );
        return;
      }

      try {
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

        await createEmployee(toApiPayload(parsed.data, structureId));
        toast.success("Employee created successfully.");
        router.push("/employees");
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
        setSubmitError((e as Error).message ?? "Failed to create employee.");
      }
    },
  });

  return (
    <FormValidationRevealProvider reveal={revealErrors}>
    <form
      className={`${employeeCardClass} overflow-hidden`}
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
        <EmployeeFormSection
          compact
          icon={User}
          title="Basic Information"
        >
          <EmployeeFormField>
            <form.Field name="empId" validators={fieldValidators.empId}>
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="username"
                  field={field}
                  label="Employee ID"
                  loginCredential
                  placeholder="IASPL00001"
                />
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
                  autoComplete="additional-name"
                  field={field}
                  label="Middle name"
                  placeholder="Optional"
                  required={false}
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
          icon={KeyRound}
          title="Professional Details"
        >
          <EmployeeFormField>
            <form.Field name="workEmail" validators={fieldValidators.workEmail}>
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="email"
                  field={field}
                  label="Work email"
                  loginCredential
                  type="email"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="roleId" validators={fieldValidators.roleId}>
              {(field) => (
                <NativeSelectField
                  {...employeeSelectControl}
                  field={field}
                  label="System access role"
                  options={toSelectOptions(roleOptions)}
                  placeholder="Select role"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="password" validators={fieldValidators.password}>
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  autoComplete="new-password"
                  description={PASSWORD_MIN_MESSAGE}
                  field={field}
                  label="Login password"
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
                  label="Confirm login password"
                  type="password"
                />
              )}
            </form.Field>
          </EmployeeFormField>
        </EmployeeFormSection>

        <EmployeeFormSection
          compact
          dense
          icon={Briefcase}
          title="Employment Details"
        >
          <EmployeeFormField>
            <form.Field
              name="joiningDate"
              validators={fieldValidators.joiningDate}
            >
              {(field) => (
                <TextField
                  {...employeeFieldControl}
                  field={field}
                  label="Joining date"
                  max={maxJoiningDate}
                  type="date"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <OrgHierarchyRoleFields
            form={form}
            controlClassName={employeeFormNativeSelectClass}
            departments={departments}
            fieldValidators={fieldValidators}
            subDepartments={subDepartments}
            designations={designations}
            levels={levels}
            structures={structures}
          />

          <EmployeeFormField>
            <form.Field
              name="reportingManagerId"
              validators={fieldValidators.reportingManagerId}
            >
              {(field) => (
                <NativeSelectField
                  {...employeeSelectControl}
                  field={field}
                  label="Reporting manager"
                  options={toManagerSelectOptions(managers)}
                  placeholder="Select manager"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="branchId" validators={fieldValidators.branchId}>
              {(field) => (
                <NativeSelectField
                  {...employeeSelectControl}
                  field={field}
                  label="Location"
                  options={toSelectOptions(branches)}
                  placeholder="Select location"
                />
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
                  autoComplete="email"
                  field={field}
                  label="Personal email"
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
                <TextField
                  {...employeeFieldControl}
                  field={field}
                  label="Date of birth"
                  max={maxDob}
                  type="date"
                />
              )}
            </form.Field>
          </EmployeeFormField>

          <EmployeeFormField>
            <form.Field name="gender" validators={fieldValidators.gender}>
              {(field) => (
                <NativeSelectField
                  {...employeeSelectControl}
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
      </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 py-3 bg-gray-50 border-t border-gray-100">
        <Link
          className={employeeListBtnOutlineClass}
          href="/employees"
        >
          Cancel
        </Link>
        <form.Subscribe selector={(s) => [s.isValid, s.isSubmitting]}>
          {([isValid, isSubmitting]) => (
            <button
              aria-disabled={!isValid || isSubmitting}
              className={`${employeeListBtnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
              disabled={!isValid || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating…" : "Create employee"}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
    </FormValidationRevealProvider>
  );
}

export default function AddEmployeeForm() {
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState<string | null>(null);
  const [orgLookups, setOrgLookups] = useState<OrgHierarchyRoleLookups>({
    departments: [],
    subDepartments: [],
    designations: [],
    levels: [],
    structures: [],
  });
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<LookupItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [org, brs, mgrs, rolesList] = await Promise.all([
          fetchOrgHierarchyRoleLookups(),
          fetchBranches(),
          fetchManagerOptions(),
          fetchRoleOptions(),
        ]);
        if (cancelled) return;
        setOrgLookups(org);
        setBranches(brs);
        setManagers(mgrs);
        setRoleOptions(rolesList);
      } catch (e) {
        if (!cancelled) setLookupsError((e as Error).message);
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (lookupsLoading) {
    return <div className={employeeLoadingClass}>Loading form options…</div>;
  }

  return (
    <AddEmployeeFormContent
      {...orgLookups}
      branches={branches}
      lookupsError={lookupsError}
      managers={managers}
      roleOptions={roleOptions}
    />
  );
}
