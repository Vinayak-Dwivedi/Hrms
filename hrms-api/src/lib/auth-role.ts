/** Map RBAC `roles.code` to JWT `users.role` for login / session. */
export function rbacCodeToAuthRole(code: string): string {
  if (code === "employee") return "user";
  return code;
}

/** Map JWT `users.role` to RBAC `roles.code` when loading permissions. */
export function authRoleToRbacCode(jwtRole: string): string {
  if (jwtRole === "master") return "master";
  if (jwtRole === "user") return "employee";
  return jwtRole;
}
