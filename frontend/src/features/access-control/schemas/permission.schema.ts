import { z } from "zod";
import { PERMISSION_MODULES } from "../api/permissions.client";

export const permissionFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(50, "Code must be at most 50 characters.")
    .regex(
      /^[a-z][a-z0-9._-]*$/,
      "Code must start with a letter and use lowercase, numbers, dots, or underscores.",
    ),
  name: z.string().trim().min(1, "Name is required.").max(100),
  module: z.enum(PERMISSION_MODULES, { message: "Select a module." }),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;

export function toCreatePermissionPayload(values: PermissionFormValues) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    module: values.module,
    description: values.description?.trim() || null,
    isActive: values.isActive,
  };
}

export function toUpdatePermissionPayload(values: PermissionFormValues) {
  return toCreatePermissionPayload(values);
}

export function detailToPermissionFormValues(permission: {
  code: string;
  name: string;
  module: string;
  description: string | null;
  isActive: boolean;
}): PermissionFormValues {
  return {
    code: permission.code,
    name: permission.name,
    module: permission.module as PermissionFormValues["module"],
    description: permission.description ?? "",
    isActive: permission.isActive,
  };
}

export const emptyPermissionFormValues: PermissionFormValues = {
  code: "",
  name: "",
  module: "employees",
  description: "",
  isActive: true,
};
