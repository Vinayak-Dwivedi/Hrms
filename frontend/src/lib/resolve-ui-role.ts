import type { Role } from "@/lib/roles";

/** UI role for shared pages — prefers JWT role, then manager when user can approve leave. */
export function resolveUiRole(
  hasPermission: (code: string) => boolean,
  authRole?: string,
): Role {
  if (authRole === "master" || authRole === "admin") return "admin";
  if (hasPermission("leave.approve")) return "manager";
  return "employee";
}
