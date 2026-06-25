import type { Role } from "@/lib/roles";
import { NAV_ENTRY_PERMISSIONS } from "@/lib/nav-permissions";

/**
 * UI role for shared pages — admin > hr > manager > employee.
 * MY TEAM nav visibility is permission-driven separately (see canSeeMyTeamSection).
 */
export function resolveUiRole(
  hasPermission: (code: string) => boolean,
  authRole?: string,
): Role {
  if (authRole === "master" || authRole === "admin") return "admin";
  if (authRole === "hr") return "hr";
  if (hasPermission(NAV_ENTRY_PERMISSIONS.leaveApprove)) return "manager";
  return "employee";
}
