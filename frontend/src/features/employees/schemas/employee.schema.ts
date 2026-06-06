import { z } from "zod";
import type {
  CreateEmployeePayload,
  EmployeeDetail,
  UpdateEmployeePayload,
} from "../api/employees.client";

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const requiredEmail = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .email(`Enter a valid ${label.toLowerCase()}.`);

const requiredSelectId = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .refine((value) => {
      const id = Number(value);
      return Number.isInteger(id) && id > 0;
    }, `Select a valid ${label.toLowerCase()}.`);

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
      empId: z
        .string()
        .trim()
        .min(1, "Employee ID is required.")
        .max(20, "Employee ID must be at most 20 characters."),
      firstName: z
        .string()
        .trim()
        .min(1, "First name is required.")
        .max(100, "First name must be at most 100 characters."),
      middleName: z
        .string()
        .trim()
        .max(100, "Middle name must be at most 100 characters."),
      lastName: z
        .string()
        .trim()
        .min(1, "Last name is required.")
        .max(100, "Last name must be at most 100 characters."),
      personalEmail: requiredEmail("Personal email"),
      workEmail: requiredEmail("Work email"),
      phone: z
        .string()
        .trim()
        .min(1, "Phone number is required.")
        .regex(PHONE_REGEX, "Phone must be 7–15 digits, optional leading +."),
      dob: z
        .string()
        .min(1, "Date of birth is required.")
        .regex(DATE_REGEX, "Enter a valid date of birth."),
      gender: z.enum(["Male", "Female", "Other"], {
        message: "Gender is required.",
      }),
      joiningDate: z
        .string()
        .min(1, "Joining date is required.")
        .regex(DATE_REGEX, "Enter a valid joining date."),
      roleId: roleIdField(validRoleIds),
      departmentId: requiredSelectId("Department"),
      designationId: requiredSelectId("Designation"),
      gradeId: requiredSelectId("Grade"),
      branchId: requiredSelectId("Branch"),
      reportingManagerId: requiredSelectId("Reporting manager"),
      maritalStatus: z
        .string()
        .min(1, "Marital status is required.")
        .refine(
          (value): value is "Single" | "Married" =>
            value === "Single" || value === "Married",
          "Select a valid marital status.",
        ),
      spouseName: z
        .string()
        .trim()
        .min(1, "Spouse name is required.")
        .max(200, "Spouse name must be at most 200 characters."),
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
  departmentId: "",
  designationId: "",
  gradeId: "",
  branchId: "",
  reportingManagerId: "",
  maritalStatus: "",
  spouseName: "",
};

export function toCreatePayload(values: CreateEmployeeFormValues) {
  const rest = values;

  return {
    ...rest,
    middleName: rest.middleName?.trim() || null,
    spouseName: rest.spouseName.trim(),
    maritalStatus: rest.maritalStatus,
    departmentId: Number(rest.departmentId),
    designationId: Number(rest.designationId),
    gradeId: Number(rest.gradeId),
    branchId: Number(rest.branchId),
    reportingManagerId: Number(rest.reportingManagerId),
  };
}

export function toApiPayload(
  values: CreateEmployeeFormValues,
): CreateEmployeePayload {
  const base = toCreatePayload(values);
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
    departmentId: base.departmentId,
    designationId: base.designationId,
    gradeId: base.gradeId,
    branchId: base.branchId,
    reportingManagerId: base.reportingManagerId,
    maritalStatus: base.maritalStatus,
    spouseName: base.spouseName,
  };
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

const optionalIdOrNull = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.length === 0) return null;
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  });

export const updateEmployeeFormSchema = z
  .object({
    empId: z.string().trim().min(1, "Employee ID is required.").max(20),
    firstName: z.string().trim().min(1, "First name is required.").max(100),
    middleName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().min(1, "Last name is required.").max(100),
    personalEmail: z.string().trim().email("Enter a valid personal email."),
    workEmail: z.string().trim().email("Enter a valid work email."),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Phone must be 7–15 digits, optional leading +."),
    dob: z.string().regex(DATE_REGEX, "Date of birth is required."),
    gender: z.enum(["Male", "Female", "Other"], {
      message: "Gender is required.",
    }),
    joiningDate: z.string().regex(DATE_REGEX, "Joining date is required."),
    employeeStatus: z.enum([
      "Active",
      "Inactive",
      "Probation",
      "Notice",
      "Exited",
    ]),
    departmentId: optionalIdOrNull,
    designationId: optionalIdOrNull,
    gradeId: optionalIdOrNull,
    branchId: optionalIdOrNull,
    reportingManagerId: optionalIdOrNull,
    maritalStatus: z.enum(["Single", "Married", ""]).optional(),
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

    const wantsPassword =
      Boolean(data.password?.trim()) || Boolean(data.confirmPassword?.trim());
    if (wantsPassword) {
      if (!data.password?.trim() || data.password.length < 8) {
        ctx.addIssue({
          code: "custom",
          message: "New password must be at least 8 characters.",
          path: ["password"],
        });
      }
      if (!data.confirmPassword?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Confirm the new password.",
          path: ["confirmPassword"],
        });
      }
      if (
        data.password &&
        data.confirmPassword &&
        data.password !== data.confirmPassword
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Passwords do not match.",
          path: ["confirmPassword"],
        });
      }
    }
  });

export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeFormSchema>;

export function toUpdateApiPayload(
  values: UpdateEmployeeFormValues,
): UpdateEmployeePayload {
  const maritalStatus =
    values.maritalStatus === "Single" || values.maritalStatus === "Married"
      ? values.maritalStatus
      : null;

  const reportingManagerId = values.reportingManagerId ?? null;

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
    departmentId: values.departmentId,
    designationId: values.designationId,
    gradeId: values.gradeId,
    branchId: values.branchId,
    reportingManagerId,
    reportingChain: reportingManagerId ? [reportingManagerId] : [],
    maritalStatus,
    spouseName: values.spouseName?.trim() || null,
  };

  if (values.password?.trim()) {
    payload.password = values.password;
  }

  return payload;
}

export function detailToFormValues(
  employee: EmployeeDetail,
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
    departmentId: employee.departmentId != null ? String(employee.departmentId) : "",
    designationId:
      employee.designationId != null ? String(employee.designationId) : "",
    gradeId: employee.gradeId != null ? String(employee.gradeId) : "",
    branchId: employee.branchId != null ? String(employee.branchId) : "",
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
