/** Map RBAC `roles.code` to JWT `users.role` for login / session. */
export function rbacCodeToAuthRole(code: string): string {
  if (code === "admin") return "admin";
  if (code === "manager") return "manager";
  if (code === "hr") return "hr";
  if (code === "employee") return "user";
  return "user";
}

/** Map JWT `users.role` to RBAC `roles.code` when loading permissions. */
export function authRoleToRbacCode(jwtRole: string): string {
  if (jwtRole === "user") return "employee";
  return jwtRole;
}
