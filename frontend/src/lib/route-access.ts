import {
  canAccessRouteWithPermissions,
  hasAnyPermissionCodes,
  requiredPermissionsForRoute,
} from "@/lib/nav-permissions";

export type AuthSession = {
  role: string;
  permissions: string[];
};

export function hasPermission(
  permissions: string[],
  code: string,
): boolean {
  return permissions.includes(code);
}

export function hasAnyPermission(
  permissions: string[],
  codes: string[],
): boolean {
  return hasAnyPermissionCodes(permissions, codes);
}

export { requiredPermissionsForRoute };

export function canAccessRoute(pathname: string, session: AuthSession): boolean {
  return canAccessRouteWithPermissions(pathname, session.permissions);
}

export function defaultHomeForUser(_role: string, permissions: string[]): string {
  return "/dashboard";
}
