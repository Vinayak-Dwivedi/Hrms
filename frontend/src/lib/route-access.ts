export type AuthSession = {
  role: string;
  permissions: string[];
};

export function hasPermission(
  permissions: string[],
  code: string,
  role?: string,
): boolean {
  if (role === "admin") return true;
  return permissions.includes(code);
}

export function hasAnyPermission(
  permissions: string[],
  codes: string[],
  role?: string,
): boolean {
  if (role === "admin") return true;
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
  if (pathname.startsWith("/hr/org-setup")) return ["onboarding.manage"];
  if (pathname === "/hr/dashboard" || pathname.startsWith("/hr/dashboard/")) {
    return ["onboarding.view"];
  }
  if (pathname === "/hr/attendance" || pathname.startsWith("/hr/attendance/")) {
    return ["attendance.view"];
  }
  if (pathname === "/hr/leave" || pathname.startsWith("/hr/leave/")) {
    return ["leave.view"];
  }
  if (pathname.startsWith("/manager/approvals")) return ["leave.approve"];
  if (pathname.startsWith("/manager/team-")) return ["leave.approve"];
  if (pathname.startsWith("/manager/")) {
    return ["leave.approve", "attendance.view"];
  }
  if (pathname === "/attendance" || pathname.startsWith("/attendance/")) {
    return ["attendance.view"];
  }
  if (
    pathname === "/leave" ||
    pathname.startsWith("/leave/") ||
    pathname === "/requests" ||
    pathname.startsWith("/requests/")
  ) {
    return ["leave.view"];
  }
  if (pathname === "/payslips" || pathname.startsWith("/payslips/")) {
    return ["payroll.view"];
  }
  if (
    pathname === "/directory" ||
    pathname.startsWith("/directory/") ||
    pathname === "/departments" ||
    pathname.startsWith("/departments/")
  ) {
    return ["employees.view"];
  }
  if (pathname === "/employees" || /^\/employees\/\d+$/.test(pathname)) {
    return ["employees.view"];
  }
  return null;
}

function passesZoneGuard(pathname: string, session: AuthSession): boolean {
  if (session.role === "admin") return true;

  if (pathname.startsWith("/hr/")) {
    return (
      session.role === "hr" ||
      hasPermission(session.permissions, "onboarding.view", session.role)
    );
  }

  if (pathname.startsWith("/manager/")) {
    return hasAnyPermission(
      session.permissions,
      ["leave.approve", "attendance.view"],
      session.role,
    );
  }

  return true;
}

export function canAccessRoute(pathname: string, session: AuthSession): boolean {
  if (session.role === "admin") return true;

  if (!passesZoneGuard(pathname, session)) return false;

  const required = requiredPermissionsForRoute(pathname);
  if (required === null) return true;

  return hasAnyPermission(session.permissions, required, session.role);
}

export function defaultHomeForUser(role: string, permissions: string[]): string {
  if (role === "hr") return "/hr/dashboard";
  if (role === "admin") return "/dashboard";
  if (hasPermission(permissions, "leave.approve", role)) {
    return "/manager/dashboard";
  }
  if (hasPermission(permissions, "onboarding.view", role) && role !== "manager") {
    return "/hr/dashboard";
  }
  return "/dashboard";
}
