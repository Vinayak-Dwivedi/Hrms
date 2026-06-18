import { z } from "zod";
import {
  MARITAL_STATUS_OPTIONS,
  type MaritalStatus,
} from "@/features/onboarding/constants/personal";
import type {
  CreateEmployeePayload,
  EmployeeDetail,
  UpdateEmployeePayload,
} from "../api/employees.client";

const PHONE_REGEX = /^[0-9]{10}$/;
export const PHONE_MESSAGE =
  "Phone must be exactly 10 digits (numbers only).";
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Keep only digits and cap at 10 characters for phone inputs. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidCalendarDate(value: string): boolean {
  const match = DATE_REGEX.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function requiredDateField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .regex(DATE_REGEX, `Enter a valid ${label.toLowerCase()}.`)
    .refine(
      isValidCalendarDate,
      `Enter a valid ${label.toLowerCase()}.`,
    );
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

function refineOptionalPasswordPair(
  data: { password?: string; confirmPassword?: string },
  ctx: z.RefinementCtx,
) {
  const password = data.password?.trim() ?? "";
  const confirmPassword = data.confirmPassword?.trim() ?? "";
  const wantsPassword = Boolean(password) || Boolean(confirmPassword);

  if (!wantsPassword) {
    return;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: PASSWORD_MIN_MESSAGE,
      path: ["password"],
    });
  }
  if (!confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Confirm the password.",
      path: ["confirmPassword"],
    });
  }
  if (password && confirmPassword && password !== confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    });
  }
}

const requiredEmail = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(254, `${label} must be at most 254 characters.`)
    .email(`Enter a valid ${label.toLowerCase()}.`);

const requiredSelectId = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .refine((value) => {
      const id = Number(value);
      return Number.isInteger(id) && id > 0;
    }, `Select a valid ${label.toLowerCase()}.`);

function optionalSelectFieldSchema(label: string) {
  return z.string().refine(
    (value) =>
      value === "" ||
      (Number.isFinite(Number(value)) &&
        Number.isInteger(Number(value)) &&
        Number(value) > 0),
    `Select a valid ${label.toLowerCase()} or leave blank.`,
  );
}

function roleIdField(validRoleIds: number[]) {
  return z.string().superRefine((value, ctx) => {
    if (!value || value.length === 0) {
      ctx.addIssue({ code: "custom", message: "Role is required." });
      return;
    }
    const id = Number(value);
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      (validRoleIds.length > 0 && !validRoleIds.includes(id))
    ) {
      ctx.addIssue({ code: "custom", message: "Select a valid role." });
    }
  });
}

function optionalRoleIdField(validRoleIds: number[]) {
  return z.string().superRefine((value, ctx) => {
    if (!value || value.length === 0) return;
    const id = Number(value);
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      (validRoleIds.length > 0 && !validRoleIds.includes(id))
    ) {
      ctx.addIssue({ code: "custom", message: "Select a valid role." });
    }
  });
}

export const personalEmailFieldSchema = requiredEmail("Personal email");
export const workEmailFieldSchema = requiredEmail("Work email");
export const phoneFieldSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .regex(PHONE_REGEX, PHONE_MESSAGE);

export const empIdFieldSchema = z
  .string()
  .trim()
  .min(1, "Employee ID is required.")
  .max(20, "Employee ID must be at most 20 characters.");
export const firstNameFieldSchema = z
  .string()
  .trim()
  .min(1, "First name is required.")
  .max(100, "First name must be at most 100 characters.");
export const middleNameFieldSchema = z
  .string()
  .trim()
  .max(100, "Middle name must be at most 100 characters.");
export const lastNameFieldSchema = z
  .string()
  .trim()
  .min(1, "Last name is required.")
  .max(100, "Last name must be at most 100 characters.");
export const JOINING_DATE_MAX_FUTURE_DAYS = 60;
export const JOINING_DATE_MAX_FUTURE_MESSAGE =
  "Joining date cannot be more than 60 days from today.";

function endOfJoiningDateWindow(): Date {
  const max = new Date();
  max.setDate(max.getDate() + JOINING_DATE_MAX_FUTURE_DAYS);
  max.setHours(23, 59, 59, 999);
  return max;
}

export const dobFieldSchema = requiredDateField("Date of birth");
export const joiningDateFieldSchema = requiredDateField("Joining date").refine(
  (value) => {
    const joining = new Date(`${value}T00:00:00`);
    return joining <= endOfJoiningDateWindow();
  },
  JOINING_DATE_MAX_FUTURE_MESSAGE,
);
export const genderFieldSchema = z.enum(["Male", "Female", "Other"], {
  message: "Gender is required.",
});
export const orgHierarchyDepartmentFieldSchema =
  requiredSelectId("Department");
export const orgHierarchySubDepartmentFieldSchema =
  requiredSelectId("Sub department");
export const orgHierarchyDesignationFieldSchema =
  requiredSelectId("Designation");
export const branchFieldSchema = requiredSelectId("Location");
export const locationFieldSchema = branchFieldSchema;
export const optionalLocationFieldSchema = optionalSelectFieldSchema("location");
export const optionalReportingManagerFieldSchema = optionalSelectFieldSchema(
  "reporting manager",
);

/** Optional login password; when provided it must meet minimum length. */
export const loginPasswordFieldSchema = z.string().superRefine((value, ctx) => {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: PASSWORD_MIN_MESSAGE,
    });
  }
});

export function fieldValidators<T extends z.ZodType>(schema: T) {
  return {
    onChange: schema,
    onBlur: schema,
  };
}

export function createEmployeeFieldValidators(validRoleIds: number[]) {
  return {
    empId: fieldValidators(empIdFieldSchema),
    firstName: fieldValidators(firstNameFieldSchema),
    middleName: fieldValidators(middleNameFieldSchema),
    lastName: fieldValidators(lastNameFieldSchema),
    personalEmail: fieldValidators(personalEmailFieldSchema),
    workEmail: fieldValidators(workEmailFieldSchema),
    phone: fieldValidators(phoneFieldSchema),
    dob: fieldValidators(dobFieldSchema),
    gender: fieldValidators(genderFieldSchema),
    joiningDate: fieldValidators(joiningDateFieldSchema),
    roleId: fieldValidators(roleIdField(validRoleIds)),
    orgHierarchyDepartmentId: fieldValidators(orgHierarchyDepartmentFieldSchema),
    orgHierarchySubDepartmentId: fieldValidators(
      orgHierarchySubDepartmentFieldSchema,
    ),
    orgHierarchyDesignationId: fieldValidators(
      orgHierarchyDesignationFieldSchema,
    ),
    locationId: fieldValidators(locationFieldSchema),
    reportingManagerId: fieldValidators(optionalReportingManagerFieldSchema),
    password: fieldValidators(loginPasswordFieldSchema),
  };
}

/** Maps full-form Zod issues (incl. superRefine) onto TanStack field errors. */
export function zodFormFieldErrors<T>(schema: z.ZodType<T>) {
  return ({ value }: { value: T }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;

    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fields[key]) {
        fields[key] = issue.message;
      }
    }
    return Object.keys(fields).length > 0 ? fields : undefined;
  };
}

export type CreateEmployeeFormSchemaOptions = {
  validRoleIds?: number[];
};

const optionalId = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.length === 0) return undefined;
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  });

export function createEmployeeFormSchema(
  options: CreateEmployeeFormSchemaOptions = {},
) {
  const validRoleIds = options.validRoleIds ?? [];

  return z
    .object({
      empId: empIdFieldSchema,
      firstName: firstNameFieldSchema,
      middleName: middleNameFieldSchema,
      lastName: lastNameFieldSchema,
      personalEmail: personalEmailFieldSchema,
      workEmail: workEmailFieldSchema,
      phone: phoneFieldSchema,
      dob: dobFieldSchema,
      gender: genderFieldSchema,
      joiningDate: joiningDateFieldSchema,
      roleId: roleIdField(validRoleIds),
      orgHierarchyDepartmentId: orgHierarchyDepartmentFieldSchema,
      orgHierarchySubDepartmentId: orgHierarchySubDepartmentFieldSchema,
      orgHierarchyDesignationId: orgHierarchyDesignationFieldSchema,
      locationId: locationFieldSchema,
      reportingManagerId: optionalReportingManagerFieldSchema,
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const dob = new Date(`${data.dob}T00:00:00`);
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      if (data.dob && dob > cutoff) {
        ctx.addIssue({
          code: "custom",
          message: "Employee must be at least 18 years old.",
          path: ["dob"],
        });
      }

      refineOptionalPasswordPair(data, ctx);
    });
}

export type CreateEmployeeFormValues = z.infer<
  ReturnType<typeof createEmployeeFormSchema>
>;

export const defaultCreateEmployeeValues: CreateEmployeeFormValues = {
  empId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  personalEmail: "",
  workEmail: "",
  phone: "",
  dob: "",
  gender: "Male",
  joiningDate: "",
  roleId: "",
  orgHierarchyDepartmentId: "",
  orgHierarchySubDepartmentId: "",
  orgHierarchyDesignationId: "",
  locationId: "",
  reportingManagerId: "",
  password: "",
  confirmPassword: "",
};

function idToNumberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function toCreatePayload(values: CreateEmployeeFormValues) {
  const rest = values;
  const reportingManagerId = idToNumberOrNull(rest.reportingManagerId);

  return {
    ...rest,
    middleName: rest.middleName?.trim() || null,
    locationId: Number(rest.locationId),
    reportingManagerId,
  };
}

export function toApiPayload(
  values: CreateEmployeeFormValues,
  orgHierarchyStructureId: number,
): CreateEmployeePayload {
  const base = toCreatePayload(values);
  // Narrow the schema-validated string into the literal union the API
  // expects. Validation already guarantees one of these two values reaches
  // here; the `null` fallback is dead code that keeps the type system happy.
  return {
    empId: base.empId,
    firstName: base.firstName,
    middleName: base.middleName,
    lastName: base.lastName,
    personalEmail: base.personalEmail,
    workEmail: base.workEmail,
    phone: base.phone,
    dob: base.dob,
    gender: base.gender,
    joiningDate: base.joiningDate,
    roleId: Number(base.roleId),
    orgHierarchyStructureId,
    locationId: base.locationId,
    ...(base.reportingManagerId != null
      ? { reportingManagerId: base.reportingManagerId }
      : {}),
    ...(values.password?.trim() ? { password: values.password.trim() } : {}),
  };
}

/** Today's date in `YYYY-MM-DD` for date input max attributes. */
export function maxDateToday(): string {
  const today = new Date();
  const year = today.getFullYear().toString().padStart(4, "0");
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Latest allowed joining date (today + 60 days) for date input max attributes. */
export function maxJoiningDate(): string {
  const max = new Date();
  max.setDate(max.getDate() + JOINING_DATE_MAX_FUTURE_DAYS);
  const year = max.getFullYear().toString().padStart(4, "0");
  const month = (max.getMonth() + 1).toString().padStart(2, "0");
  const day = max.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns true when a calendar date is after the joining-date window. */
export function isJoiningDateAfterMaxWindow(date: Date): boolean {
  const max = endOfJoiningDateWindow();
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  const maxDay = new Date(max);
  maxDay.setHours(0, 0, 0, 0);
  return candidate > maxDay;
}

/** Latest date of birth for employees who must be at least 18 years old. */
export function maxDateOfBirthForAdult(): string {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  const year = cutoff.getFullYear().toString().padStart(4, "0");
  const month = (cutoff.getMonth() + 1).toString().padStart(2, "0");
  const day = cutoff.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const employeeStatusFieldSchema = z.enum(
  ["Active", "Inactive", "Probation", "Notice", "Exited"],
  { message: "Status is required." },
);
export const optionalDepartmentFieldSchema =
  optionalSelectFieldSchema("department");
export const optionalDesignationFieldSchema =
  optionalSelectFieldSchema("designation");
export const optionalGradeFieldSchema = optionalSelectFieldSchema("grade");
export const optionalBranchFieldSchema = optionalSelectFieldSchema("branch");

export function createUpdateEmployeeFieldValidators(validRoleIds: number[] = []) {
  return {
    empId: fieldValidators(empIdFieldSchema),
    firstName: fieldValidators(firstNameFieldSchema),
    middleName: fieldValidators(middleNameFieldSchema),
    lastName: fieldValidators(lastNameFieldSchema),
    employeeStatus: fieldValidators(employeeStatusFieldSchema),
    personalEmail: fieldValidators(personalEmailFieldSchema),
    workEmail: fieldValidators(workEmailFieldSchema),
    phone: fieldValidators(phoneFieldSchema),
    dob: fieldValidators(dobFieldSchema),
    gender: fieldValidators(genderFieldSchema),
    joiningDate: fieldValidators(joiningDateFieldSchema),
    roleId: fieldValidators(optionalRoleIdField(validRoleIds)),
    orgHierarchyDepartmentId: fieldValidators(orgHierarchyDepartmentFieldSchema),
    orgHierarchySubDepartmentId: fieldValidators(
      orgHierarchySubDepartmentFieldSchema,
    ),
    orgHierarchyDesignationId: fieldValidators(
      orgHierarchyDesignationFieldSchema,
    ),
    locationId: fieldValidators(optionalLocationFieldSchema),
    reportingManagerId: fieldValidators(optionalReportingManagerFieldSchema),
  };
}

export function createUpdateEmployeeFormSchema(validRoleIds: number[] = []) {
  return z
    .object({
      empId: empIdFieldSchema,
      firstName: firstNameFieldSchema,
      middleName: middleNameFieldSchema,
      lastName: lastNameFieldSchema,
      personalEmail: personalEmailFieldSchema,
      workEmail: workEmailFieldSchema,
      phone: phoneFieldSchema,
      dob: dobFieldSchema,
      gender: genderFieldSchema,
      joiningDate: joiningDateFieldSchema,
      employeeStatus: employeeStatusFieldSchema,
      roleId: optionalRoleIdField(validRoleIds),
      orgHierarchyDepartmentId: orgHierarchyDepartmentFieldSchema,
      orgHierarchySubDepartmentId: orgHierarchySubDepartmentFieldSchema,
      orgHierarchyDesignationId: orgHierarchyDesignationFieldSchema,
      locationId: optionalLocationFieldSchema,
      reportingManagerId: optionalReportingManagerFieldSchema,
      maritalStatus: z
        .enum([...MARITAL_STATUS_OPTIONS, ""] as const)
        .optional(),
      spouseName: z.string().trim().max(200).optional(),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const dob = new Date(`${data.dob}T00:00:00`);
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      if (data.dob && dob > cutoff) {
        ctx.addIssue({
          code: "custom",
          message: "Employee must be at least 18 years old.",
          path: ["dob"],
        });
      }

      if (data.maritalStatus === "Married" && !data.spouseName?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Spouse name is required when marital status is Married.",
          path: ["spouseName"],
        });
      }

      refineOptionalPasswordPair(data, ctx);
    });
}

export const updateEmployeeFormSchema = createUpdateEmployeeFormSchema();

// Use z.input — the form holds the *unparsed* shape (string IDs, "" for
// optional fields). z.infer would give the post-transform shape (number IDs)
// which doesn't match what tanstack-form actually has in state.
export type UpdateEmployeeFormValues = z.input<typeof updateEmployeeFormSchema>;

export function toUpdateApiPayload(
  values: UpdateEmployeeFormValues,
  orgHierarchyStructureId: number,
): UpdateEmployeePayload {
  const maritalStatus: MaritalStatus | null =
    values.maritalStatus &&
    (MARITAL_STATUS_OPTIONS as readonly string[]).includes(values.maritalStatus)
      ? values.maritalStatus
      : null;

  const reportingManagerId = idToNumberOrNull(values.reportingManagerId);

  const payload: UpdateEmployeePayload = {
    empId: values.empId,
    firstName: values.firstName,
    middleName: values.middleName?.trim() || null,
    lastName: values.lastName,
    personalEmail: values.personalEmail,
    workEmail: values.workEmail,
    phone: values.phone,
    dob: values.dob,
    gender: values.gender,
    joiningDate: values.joiningDate,
    employeeStatus: values.employeeStatus,
    orgHierarchyStructureId,
    locationId: idToNumberOrNull(values.locationId),
    branchId: idToNumberOrNull(values.locationId),
    reportingManagerId,
    reportingChain: reportingManagerId ? [reportingManagerId] : [],
    maritalStatus,
    spouseName:
      maritalStatus === "Married" ? values.spouseName?.trim() || null : null,
  };

  if (values.password?.trim()) {
    payload.password = values.password.trim();
  }

  if (values.roleId?.trim()) {
    payload.roleId = Number(values.roleId);
  }

  return payload;
}

export function formatEmployeeValidationErrors(details: unknown): string | null {
  if (!Array.isArray(details)) return null;
  const messages = details
    .map((issue) => {
      if (!issue || typeof issue !== "object") return null;
      const row = issue as { message?: unknown; path?: unknown[] };
      if (typeof row.message !== "string" || !row.message) return null;
      const field = row.path?.[0];
      if (typeof field === "string") {
        const label =
          field === "password"
            ? "Password"
            : field === "confirmPassword"
              ? "Confirm password"
              : field;
        return `${label}: ${row.message}`;
      }
      return row.message;
    })
    .filter((m): m is string => Boolean(m));
  return messages.length > 0 ? messages.join(" ") : null;
}

export function detailToFormValues(
  employee: EmployeeDetail,
  orgHierarchy?: {
    orgHierarchyDepartmentId: string;
    orgHierarchySubDepartmentId: string;
    orgHierarchyDesignationId: string;
  },
): UpdateEmployeeFormValues {
  return {
    empId: employee.empId,
    firstName: employee.firstName,
    middleName: employee.middleName ?? "",
    lastName: employee.lastName,
    personalEmail: employee.personalEmail,
    workEmail: employee.workEmail ?? "",
    phone: employee.phone,
    dob: employee.dob,
    gender: employee.gender,
    joiningDate: employee.joiningDate,
    employeeStatus: employee.employeeStatus,
    roleId: employee.roleId != null ? String(employee.roleId) : "",
    orgHierarchyDepartmentId: orgHierarchy?.orgHierarchyDepartmentId ?? "",
    orgHierarchySubDepartmentId: orgHierarchy?.orgHierarchySubDepartmentId ?? "",
    orgHierarchyDesignationId: orgHierarchy?.orgHierarchyDesignationId ?? "",
    locationId:
      employee.locationId != null
        ? String(employee.locationId)
        : employee.branchId != null
          ? String(employee.branchId)
          : "",
    reportingManagerId:
      employee.reportingManagerId != null
        ? String(employee.reportingManagerId)
        : "",
    maritalStatus: employee.maritalStatus ?? "",
    spouseName: employee.spouseName ?? "",
    password: "",
    confirmPassword: "",
  };
}
