import {
  ONBOARDING_PANEL_ACCESS_PERMISSIONS,
  ONBOARDING_PERMISSIONS,
} from "@/features/onboarding/constants/permissions";

/** Permissions that grant access to Leave Policy nav, routes, and admin APIs. */
export const LEAVE_POLICY_PERMISSIONS = [
  "leave.policy.manage",
  "admin.roles",
] as const;

/** Permissions that grant access to Holiday Policy nav, routes, and admin APIs. */
export const HOLIDAY_POLICY_PERMISSIONS = [
  "holiday.policy.manage",
  "admin.roles",
] as const;

/** Permissions that grant access to My Clearances nav and route. */
export const MY_CLEARANCES_PERMISSIONS = [
  "leave.approve",
  "offboarding.clearance.it",
  "offboarding.clearance.admin",
  "offboarding.clearance.finance",
  "offboarding.clearance.hr",
  "offboarding.clearance.operations",
  "admin.roles",
] as const;

/** Any of these grants visibility of the MY TEAM nav section. */
export const MY_TEAM_SECTION_PERMISSIONS = [
  "leave.approve",
  "offboarding.clearance.it",
  "offboarding.clearance.admin",
  "offboarding.clearance.finance",
  "offboarding.clearance.hr",
  "offboarding.clearance.operations",
  "admin.roles",
] as const;

export const NAV_ENTRY_PERMISSIONS = {
  attendanceView: "attendance.view",
  attendanceUpload: "attendance.upload",
  leaveView: "leave.view",
  leaveApprove: "leave.approve",
  payrollView: "payroll.view",
  employeesView: "employees.view",
  employeesCreate: "employees.create",
  employeesEdit: "employees.edit",
  adminPermissions: "admin.permissions",
  adminRoles: "admin.roles",
  leavePolicyManage: LEAVE_POLICY_PERMISSIONS,
  holidayPolicyManage: HOLIDAY_POLICY_PERMISSIONS,
  myClearances: MY_CLEARANCES_PERMISSIONS,
} as const;

export function hasAnyPermissionCodes(
  permissions: string[],
  required: string | string[],
): boolean {
  const codes = Array.isArray(required) ? required : [required];
  return codes.some((code) => permissions.includes(code));
}

export function navEntryAllowed(
  required: string | string[] | undefined,
  hasAnyPermission: (codes: string[]) => boolean,
): boolean {
  if (!required) return true;
  const codes = Array.isArray(required) ? required : [required];
  return hasAnyPermission(codes);
}

type RoutePermissionRule = {
  test: (pathname: string) => boolean;
  permissions: string[];
};

const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  {
    test: (p) => /^\/employees\/\d+\/edit$/.test(p),
    permissions: [NAV_ENTRY_PERMISSIONS.employeesEdit],
  },
  {
    test: (p) => p === "/employees/bulk-upload" || p === "/add-employee",
    permissions: [NAV_ENTRY_PERMISSIONS.employeesCreate],
  },
  {
    test: (p) => p === "/add-permission",
    permissions: [NAV_ENTRY_PERMISSIONS.adminPermissions],
  },
  {
    test: (p) => p === "/user-roles",
    permissions: [NAV_ENTRY_PERMISSIONS.adminRoles],
  },
  {
    test: (p) => p === "/locations" || p.startsWith("/locations/"),
    permissions: [NAV_ENTRY_PERMISSIONS.adminRoles],
  },
  {
    test: (p) => p === "/offboarding" || p.startsWith("/offboarding/"),
    permissions: [NAV_ENTRY_PERMISSIONS.adminRoles],
  },
  {
    test: (p) => p === "/holiday-calendars" || p.startsWith("/holiday-calendars/"),
    permissions: [...HOLIDAY_POLICY_PERMISSIONS],
  },
  {
    test: (p) => p === "/weekly-off" || p.startsWith("/weekly-off/"),
    permissions: [...LEAVE_POLICY_PERMISSIONS],
  },
  {
    test: (p) => p === "/leave-credits" || p.startsWith("/leave-credits/"),
    permissions: [...LEAVE_POLICY_PERMISSIONS],
  },
  {
    test: (p) => p === "/leave-policy" || p.startsWith("/leave-policy/"),
    permissions: [...LEAVE_POLICY_PERMISSIONS],
  },
  {
    test: (p) => p === "/my-clearances" || p.startsWith("/my-clearances/"),
    permissions: [...MY_CLEARANCES_PERMISSIONS],
  },
  {
    test: (p) => p.startsWith("/hr/org-setup"),
    permissions: [ONBOARDING_PERMISSIONS.MANAGE],
  },
  {
    test: (p) => p === "/hr/dashboard" || p.startsWith("/hr/dashboard/"),
    permissions: [ONBOARDING_PERMISSIONS.VIEW],
  },
  {
    test: (p) => p === "/hr/attendance" || p.startsWith("/hr/attendance/"),
    permissions: [NAV_ENTRY_PERMISSIONS.attendanceView],
  },
  {
    test: (p) => p === "/hr/leave" || p.startsWith("/hr/leave/"),
    permissions: [NAV_ENTRY_PERMISSIONS.leaveView],
  },
  {
    test: (p) => p.startsWith("/manager/approvals"),
    permissions: [NAV_ENTRY_PERMISSIONS.leaveApprove],
  },
  {
    test: (p) => p.startsWith("/manager/"),
    permissions: [
      NAV_ENTRY_PERMISSIONS.leaveApprove,
      NAV_ENTRY_PERMISSIONS.attendanceView,
    ],
  },
  {
    test: (p) => p === "/attendance/upload",
    permissions: [NAV_ENTRY_PERMISSIONS.attendanceUpload],
  },
  {
    test: (p) => p === "/attendance" || p.startsWith("/attendance/"),
    permissions: [NAV_ENTRY_PERMISSIONS.attendanceView],
  },
  {
    test: (p) => p === "/leave" || p.startsWith("/leave/"),
    permissions: [NAV_ENTRY_PERMISSIONS.leaveView],
  },
  {
    test: (p) => p === "/payslips" || p.startsWith("/payslips/"),
    permissions: [NAV_ENTRY_PERMISSIONS.payrollView],
  },
  {
    test: (p) =>
      p === "/directory" ||
      p.startsWith("/directory/") ||
      p === "/hierarchy" ||
      p.startsWith("/hierarchy/") ||
      p === "/departments" ||
      p.startsWith("/departments/"),
    permissions: [NAV_ENTRY_PERMISSIONS.employeesView],
  },
  {
    test: (p) => /^\/employees\/\d+\/onboarding$/.test(p),
    permissions: [...ONBOARDING_PANEL_ACCESS_PERMISSIONS],
  },
  {
    test: (p) => p === "/employees" || /^\/employees\/\d+$/.test(p),
    permissions: [NAV_ENTRY_PERMISSIONS.employeesView],
  },
];

/** Most-specific permission requirement for a pathname, or null if open to any authenticated user. */
export function requiredPermissionsForRoute(pathname: string): string[] | null {
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.test(pathname)) {
      return rule.permissions;
    }
  }
  return null;
}

export function canAccessRouteWithPermissions(
  pathname: string,
  permissions: string[],
): boolean {
  const required = requiredPermissionsForRoute(pathname);
  if (required === null) return true;
  return hasAnyPermissionCodes(permissions, required);
}

/** True when the user should see the MY TEAM nav section. */
export function canSeeMyTeamSection(
  hasAnyPermission: (codes: string[]) => boolean,
): boolean {
  return hasAnyPermission([...MY_TEAM_SECTION_PERMISSIONS]);
}
