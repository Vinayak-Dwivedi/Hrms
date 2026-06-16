import {
  ONBOARDING_PANEL_ACCESS_PERMISSIONS,
  ONBOARDING_PERMISSIONS,
} from "@/features/onboarding/constants/permissions";

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
  return codes.some((c) => permissions.includes(c));
}

/** Most-specific permission requirement for a pathname, or null if open to any authenticated user. */
export function requiredPermissionsForRoute(pathname: string): string[] | null {
  if (/^\/employees\/\d+\/edit$/.test(pathname)) {
    return ["employees.edit"];
  }
  if (pathname === "/employees/bulk-upload" || pathname === "/add-employee") {
    return ["employees.create"];
  }
  if (pathname === "/add-permission") return ["admin.permissions"];
  if (pathname === "/user-roles") return ["admin.roles"];
  if (pathname === "/locations" || pathname.startsWith("/locations/")) {
    return ["admin.roles"];
  }
  if (pathname === "/offboarding" || pathname.startsWith("/offboarding/")) {
    return ["admin.roles"];
  }
  if (
    pathname === "/holiday-calendars" ||
    pathname.startsWith("/holiday-calendars/")
  ) {
    return ["admin.roles"];
  }
  if (pathname === "/weekly-off" || pathname.startsWith("/weekly-off/")) {
    return ["admin.roles"];
  }
  if (
    pathname === "/leave-credits" ||
    pathname.startsWith("/leave-credits/")
  ) {
    return ["admin.roles"];
  }
  if (pathname.startsWith("/hr/org-setup")) return ["onboarding.manage"];
  if (pathname === "/hr/dashboard" || pathname.startsWith("/hr/dashboard/")) {
    return [ONBOARDING_PERMISSIONS.VIEW];
  }
  if (pathname === "/hr/attendance" || pathname.startsWith("/hr/attendance/")) {
    return ["attendance.view"];
  }
  if (pathname === "/hr/leave" || pathname.startsWith("/hr/leave/")) {
    return ["leave.view"];
  }
  if (pathname.startsWith("/manager/approvals")) return ["leave.approve"];
  if (pathname.startsWith("/manager/")) {
    return ["leave.approve", "attendance.view"];
  }
  if (pathname === "/attendance" || pathname.startsWith("/attendance/")) {
    return ["attendance.view"];
  }
  if (pathname === "/leave" || pathname.startsWith("/leave/")) {
    return ["leave.view"];
  }
  if (pathname === "/payslips" || pathname.startsWith("/payslips/")) {
    return ["payroll.view"];
  }
  if (
    pathname === "/directory" ||
    pathname.startsWith("/directory/") ||
    pathname === "/hierarchy" ||
    pathname.startsWith("/hierarchy/") ||
    pathname === "/departments" ||
    pathname.startsWith("/departments/")
  ) {
    return ["employees.view"];
  }
  if (/^\/employees\/\d+\/onboarding$/.test(pathname)) {
    return [...ONBOARDING_PANEL_ACCESS_PERMISSIONS];
  }
  if (pathname === "/employees" || /^\/employees\/\d+$/.test(pathname)) {
    return ["employees.view"];
  }
  return null;
}

export function canAccessRoute(pathname: string, session: AuthSession): boolean {
  const required = requiredPermissionsForRoute(pathname);
  if (required === null) return true;

  return hasAnyPermission(session.permissions, required);
}

export function defaultHomeForUser(_role: string, permissions: string[]): string {
  return "/dashboard";
}
