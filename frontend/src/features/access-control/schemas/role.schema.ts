import { z } from "zod";

export const roleFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(50, "Code must be at most 50 characters.")
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      "Code must start with a letter and use lowercase, numbers, or underscores.",
    ),
  name: z.string().trim().min(1, "Name is required.").max(100),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  isActive: z.boolean(),
  permissionIds: z.array(z.number().int().positive()).optional(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export function toCreateRolePayload(values: RoleFormValues) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || null,
    isActive: values.isActive,
  };
}

export function toUpdateRolePayload(values: RoleFormValues) {
  return toCreateRolePayload(values);
}

export function detailToRoleFormValues(role: {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}): RoleFormValues {
  return {
    code: role.code,
    name: role.name,
    description: role.description ?? "",
    isActive: role.isActive,
    permissionIds: [],
  };
}

export const emptyRoleFormValues: RoleFormValues = {
  code: "",
  name: "",
  description: "",
  isActive: true,
  permissionIds: [],
};
