"use client";

import { useForm } from "@tanstack/react-form";
import { Briefcase, Contact, KeyRound, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  fetchEmployees,
  fetchRoleOptions,
  isOnboardingCompleted,
  toSelectOptions,
  type EmployeeDetail,
  type EmployeeListItem,
  type LookupItem,
  updateEmployee,
  updateEmployeeProfileByHr,
  syncEmployeeProfessionalByHr,
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
import { useAuth } from "@/lib/auth-context";
import {
  professionalValuesToApiPayload,
} from "@/features/onboarding/api/onboarding.client";
import {
  collectWorkInformationFieldErrors,
  type OnboardingProfileValues,
  type ProfessionalDetailValues,
} from "@/features/onboarding/schemas/onboarding.schema";
import EmployeeOnboardingProfileEdit, {
  type EmployeeOnboardingProfileEditHandle,
} from "./EmployeeOnboardingProfileEdit";
import {
  normalizeProfessionalForValidation,
  professionalFromEmployeeProfile,
  createEmptyProfessionalRow,
  WorkInformationFields,
} from "./WorkInformationSection";
import { hasOnboardingPanelAccess } from "./OnboardingAdminPanel";
import ReportingManagerField from "./ReportingManagerField";
import {
  fetchEmployeeShift,
  formatEmployeeShiftLabel,
  updateEmployeeShift,
  type EmployeeShiftAssignment,
} from "@/features/shift-configuration/api/employee-shift.client";
import {
  listShiftConfigs,
  type ShiftSummary,
} from "@/features/shift-configuration/api/shift-configs.client";

const employeeFieldControl = { controlClassName: employeeListFormControlClass };
const maxDob = maxDateOfBirthForAdult();
const maxDobDate = new Date(`${maxDob}T23:59:59`);

function collectWorkInformationErrors(
  professional: ProfessionalDetailValues[],
  noPreviousEmployment: boolean,
): Record<string, string> {
  return collectWorkInformationFieldErrors(professional, noPreviousEmployment);
}

function workInformationSnapshot(
  professional: ProfessionalDetailValues[],
  noPreviousEmployment: boolean,
) {
  return JSON.stringify({
    noPreviousEmployment,
    professional: normalizeProfessionalForValidation(
      professional,
      noPreviousEmployment,
    ),
  });
}

interface Props {
  employee: EmployeeDetail;
  embedded?: boolean;
  readOnly?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  onRefreshEmployee?: () => void | Promise<void>;
}

type FormLookups = OrgHierarchyRoleLookups & {
  branches: Awaited<ReturnType<typeof fetchBranches>>;
  employees: EmployeeListItem[];
  roleOptions: LookupItem[];
  lookupsError: string | null;
  publishedShifts: ShiftSummary[];
  shiftAssignment: EmployeeShiftAssignment | null;
  canManageShift: boolean;
};

function EditEmployeeFormContent({
  employee,
  embedded = false,
  readOnly = false,
  onSuccess,
  onCancel,
  onRefreshEmployee,
  departments,
  subDepartments,
  designations,
  levels,
  structures,
  branches,
  employees,
  roleOptions,
  lookupsError,
  publishedShifts,
  shiftAssignment,
  canManageShift,
}: Props & FormLookups) {
  const router = useRouter();
  const { hasAnyPermission } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shiftOverrideId, setShiftOverrideId] = useState(
    () =>
      shiftAssignment?.overrideConfigId != null
        ? String(shiftAssignment.overrideConfigId)
        : "",
  );
  const initialShiftOverrideId =
    shiftAssignment?.overrideConfigId != null
      ? String(shiftAssignment.overrideConfigId)
      : "";

  useEffect(() => {
    setShiftOverrideId(initialShiftOverrideId);
  }, [initialShiftOverrideId]);

  const shiftPreviewLabel = useMemo(() => {
    if (shiftOverrideId) {
      const selected = publishedShifts.find(
        (shift) => String(shift.id) === shiftOverrideId,
      );
      if (selected) {
        return `${selected.name} — ${selected.startTimeDisplay}–${selected.endTimeDisplay}`;
      }
    }
    return formatEmployeeShiftLabel(shiftAssignment);
  }, [shiftOverrideId, publishedShifts, shiftAssignment]);
  const showOnboardingLink =
    hasOnboardingPanelAccess(hasAnyPermission) &&
    !isOnboardingCompleted(employee);
  const [revealErrors, setRevealErrors] = useState(false);
  const onboardingRef = useRef<EmployeeOnboardingProfileEditHandle>(null);
  const initialWorkProfessional = useMemo(() => {
    const fromProfile = professionalFromEmployeeProfile(employee.profile);
    return fromProfile.length > 0 ? fromProfile : [createEmptyProfessionalRow()];
  }, [employee.profile]);
  const initialNoPreviousEmployment = false;
  const initialWorkSnapshot = useMemo(
    () =>
      workInformationSnapshot(
        initialWorkProfessional,
        initialNoPreviousEmployment,
      ),
    [initialWorkProfessional, initialNoPreviousEmployment],
  );
  const [workProfessional, setWorkProfessional] = useState(
    () => initialWorkProfessional,
  );
  const [noPreviousEmployment, setNoPreviousEmployment] = useState(
    () => initialNoPreviousEmployment,
  );
  const [workErrors, setWorkErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setWorkProfessional(initialWorkProfessional);
    setNoPreviousEmployment(initialNoPreviousEmployment);
    setWorkErrors({});
  }, [initialWorkProfessional, initialNoPreviousEmployment]);

  function revealAllValidationErrors() {
    setRevealErrors(true);
    onboardingRef.current?.revealValidationErrors();
  }

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
      revealAllValidationErrors();
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
        const workFieldErrors = collectWorkInformationErrors(
          workProfessional,
          noPreviousEmployment,
        );
        if (Object.keys(workFieldErrors).length > 0) {
          setWorkErrors(workFieldErrors);
          revealAllValidationErrors();
          setSubmitError(
            "Please fix the work information fields before submitting.",
          );
          return;
        }
        setWorkErrors({});

        const normalizedProfessional = normalizeProfessionalForValidation(
          workProfessional,
          noPreviousEmployment,
        );
        const workChanged =
          workInformationSnapshot(workProfessional, noPreviousEmployment) !==
          initialWorkSnapshot;

        const onboardingPayload = onboardingRef.current?.isEmpty()
          ? null
          : onboardingRef.current?.validate();

        if (!onboardingRef.current?.isEmpty() && !onboardingPayload) {
          revealAllValidationErrors();
          document
            .getElementById("employee-onboarding-profile")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          setSubmitError(
            "Please fix the onboarding profile fields before submitting.",
          );
          return;
        }

        await updateEmployee(
          employee.id,
          toUpdateApiPayload(parsed.data, structureId),
        );

        if (canManageShift && shiftOverrideId !== initialShiftOverrideId) {
          await updateEmployeeShift(
            employee.id,
            shiftOverrideId ? Number(shiftOverrideId) : null,
          );
        }

        let profilePayload: OnboardingProfileValues | null = null;
        let bankPayload: Parameters<typeof updateEmployeeProfileByHr>[2] = null;

        if (onboardingPayload) {
          profilePayload = {
            ...onboardingPayload.profile,
            professional: normalizedProfessional,
          };
          bankPayload = onboardingPayload.bank;
        }

        if (profilePayload) {
          await updateEmployeeProfileByHr(
            employee.id,
            profilePayload,
            bankPayload,
          );
        } else if (workChanged) {
          await syncEmployeeProfessionalByHr(
            employee.id,
            professionalValuesToApiPayload(
              workProfessional,
              noPreviousEmployment,
            ),
          );
        }

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
      className={embedded ? "flex flex-col gap-4 p-6" : "space-y-4"}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {(lookupsError || submitError) && (
        <div className="space-y-3">
          {lookupsError && (
            <div className={employeeListWarnBannerClass}>
              Some dropdown options failed to load: {lookupsError}
            </div>
          )}

          {submitError && (
            <div className={employeeListErrorBannerClass}>{submitError}</div>
          )}
        </div>
      )}

      {showOnboardingLink && (
        <div className="flex justify-end">
          <Link
            className={employeeListBtnOutlineClass}
            href={`/employees/${employee.id}/onboarding`}
          >
            Manage onboarding review
          </Link>
        </div>
      )}

      {readOnly && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            This employee&apos;s status is <strong>{employee.employeeStatus}</strong>. Their profile is view-only and cannot be modified.
          </span>
        </div>
      )}

      <fieldset disabled={readOnly} className={readOnly ? "opacity-70 pointer-events-none" : undefined}>
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
                    form.setFieldValue("reportingManagerId", "");
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

          <ReportingManagerField
            controlClassName={employeeFormNativeSelectClass}
            designations={designations}
            employees={employees}
            excludeEmployeeId={employee.id}
            fieldValidators={fieldValidators}
            form={form}
            levels={levels}
            pinnedReportingManagerId={employee.reportingManagerId}
            structures={structures}
            useNativeSelect
          />

          {canManageShift && (
            <EmployeeFormField>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
                Shift
              </label>
              <select
                className={employeeListFormControlClass}
                value={shiftOverrideId}
                onChange={(e) => setShiftOverrideId(e.target.value)}
              >
                <option value="">Use org default</option>
                {publishedShifts.map((shift) => (
                  <option key={shift.id} value={String(shift.id)}>
                    {shift.name} — {shift.startTimeDisplay}–{shift.endTimeDisplay}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 m-0">
                Effective: {shiftPreviewLabel !== "—" ? shiftPreviewLabel : "No shift configured"}
              </p>
            </EmployeeFormField>
          )}

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

        <WorkInformationFields
          compact
          errors={workErrors}
          noPreviousEmployment={noPreviousEmployment}
          onBlurField={(field) => {
            const nextProfessional = normalizeProfessionalForValidation(
              workProfessional,
              noPreviousEmployment,
            );
            const errors = collectWorkInformationErrors(
              workProfessional,
              noPreviousEmployment,
            );
            const key = `professional.0.${field}`;
            setWorkErrors((prev) => {
              const next = { ...prev };
              if (errors[key]) next[key] = errors[key]!;
              else delete next[key];
              return next;
            });
          }}
          onNoPreviousEmploymentChange={(checked) => {
            setNoPreviousEmployment(checked);
            if (checked) {
              setWorkProfessional([]);
            } else {
              setWorkProfessional((prev) =>
                prev.length > 0 ? prev : [createEmptyProfessionalRow()],
              );
            }
            setWorkErrors({});
          }}
          onProfessionalChange={(professional) => {
            setWorkProfessional(professional);
            setWorkErrors((prev) => {
              const next = { ...prev };
              for (const key of Object.keys(next)) {
                if (key.startsWith("professional.")) delete next[key];
              }
              return next;
            });
          }}
          professional={workProfessional}
        />

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

      <EmployeeOnboardingProfileEdit
        employeeId={employee.id}
        hideSections={{ work: true }}
        inGrid
        onboardingSubmittedAt={employee.onboardingSubmittedAt}
        onDocumentsChanged={() => void onRefreshEmployee?.()}
        profile={employee.profile}
        ref={onboardingRef}
      />
      </div>
      </fieldset>

      <div
        className={`flex items-center justify-end gap-3 px-5 py-3 bg-gray-50 border border-slate-200 rounded-md ${employeeCardClass}`}
      >
        {readOnly ? (
          <Link
            className={employeeListBtnOutlineClass}
            href="/employees"
          >
            Back to employees
          </Link>
        ) : (
          <>
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
          </>
        )}
      </div>
    </form>
    </FormValidationRevealProvider>
  );
}

export default function EditEmployeeForm({
  employee,
  embedded = false,
  readOnly = false,
  onSuccess,
  onCancel,
  onRefreshEmployee,
}: Props) {
  const { hasAnyPermission } = useAuth();
  const canManageShift = hasAnyPermission([
    "shift.policy.manage",
    "employees.edit",
  ]);
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
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [roleOptions, setRoleOptions] = useState<LookupItem[]>([]);
  const [publishedShifts, setPublishedShifts] = useState<ShiftSummary[]>([]);
  const [shiftAssignment, setShiftAssignment] =
    useState<EmployeeShiftAssignment | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shiftLoads = canManageShift
          ? Promise.all([
              listShiftConfigs("Published").catch(() => [] as ShiftSummary[]),
              fetchEmployeeShift(employee.id).catch(() => null),
            ])
          : Promise.resolve([[] as ShiftSummary[], null] as const);

        const [org, brs, emps, roles, shiftData] = await Promise.all([
          fetchOrgHierarchyRoleLookups(),
          fetchBranches(),
          fetchEmployees(),
          fetchRoleOptions(),
          shiftLoads,
        ]);
        const [shifts, assignment] = shiftData;
        if (cancelled) return;
        setOrgLookups(org);
        setBranches(brs);
        setEmployees(emps);
        setRoleOptions(roles);
        setPublishedShifts(shifts);
        setShiftAssignment(assignment);
      } catch (e) {
        if (!cancelled) setLookupsError((e as Error).message);
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id, canManageShift]);

  if (lookupsLoading) {
    return <div className={employeeLoadingClass}>Loading form options…</div>;
  }

  return (
    <EditEmployeeFormContent
      {...orgLookups}
      branches={branches}
      employee={employee}
      embedded={embedded}
      employees={employees}
      lookupsError={lookupsError}
      readOnly={readOnly}
      publishedShifts={publishedShifts}
      shiftAssignment={shiftAssignment}
      canManageShift={canManageShift}
      roleOptions={roleOptions}
      onCancel={onCancel}
      onRefreshEmployee={onRefreshEmployee}
      onSuccess={onSuccess}
    />
  );
}
