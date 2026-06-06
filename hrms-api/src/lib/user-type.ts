/** Legacy `user_types` ids (slug → row in imported DBs). */
export const USER_TYPE_IDS = {
  admin: 1,
  hr: 2,
  manager: 3,
  employee: 4,
} as const;

/** Map JWT/auth `users.role` to legacy `users.user_type_id`. */
export function userTypeIdFromAuthRole(authRole: string): number {
  if (authRole === "admin") return USER_TYPE_IDS.admin;
  if (authRole === "hr") return USER_TYPE_IDS.hr;
  if (authRole === "manager") return USER_TYPE_IDS.manager;
  return USER_TYPE_IDS.employee;
}
