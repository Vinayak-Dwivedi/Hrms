/** Legacy `user_types` ids (slug → row in imported DBs). */
export const USER_TYPE_IDS = {
  admin: 1,
  hr: 2,
  manager: 3,
  employee: 4,
} as const;

const USER_TYPE_SLUGS: Record<number, string> = {
  [USER_TYPE_IDS.admin]: "admin",
  [USER_TYPE_IDS.hr]: "hr",
  [USER_TYPE_IDS.manager]: "manager",
  [USER_TYPE_IDS.employee]: "employee",
};

const USER_TYPE_LABELS: Record<number, string> = {
  [USER_TYPE_IDS.admin]: "Administrator",
  [USER_TYPE_IDS.hr]: "HR",
  [USER_TYPE_IDS.manager]: "Manager",
  [USER_TYPE_IDS.employee]: "Employee",
};

/** Map JWT/auth `users.role` to legacy `users.user_type_id`. */
export function userTypeIdFromAuthRole(authRole: string): number {
  if (authRole === "admin") return USER_TYPE_IDS.admin;
  if (authRole === "hr") return USER_TYPE_IDS.hr;
  if (authRole === "manager") return USER_TYPE_IDS.manager;
  return USER_TYPE_IDS.employee;
}

export function userTypeSlugFromId(userTypeId: number): string {
  return USER_TYPE_SLUGS[userTypeId] ?? "employee";
}

export function userTypeLabelFromId(userTypeId: number): string {
  return USER_TYPE_LABELS[userTypeId] ?? "Employee";
}

export function formatAuthRoleLabel(authRole: string): string {
  if (authRole === "admin") return "Administrator";
  if (authRole === "hr") return "HR";
  if (authRole === "manager") return "Manager";
  if (authRole === "employee") return "Employee";
  const trimmed = authRole.trim();
  if (!trimmed) return "Employee";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
