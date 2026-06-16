import type { Role } from "@/lib/roles";

/** UI role for shared pages — admin > hr > manager > employee. */
export function resolveUiRole(
  hasPermission: (code: string) => boolean,
  authRole?: string,
): Role {
  if (authRole === "master" || authRole === "admin") return "admin";
  if (authRole === "hr") return "hr";
  if (hasPermission("leave.approve")) return "manager";
  return "employee";
}
