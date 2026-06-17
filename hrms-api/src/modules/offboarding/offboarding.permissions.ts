// Permission codes for the Offboarding module. Mirrors the onboarding module's
// constants pattern. Granular codes are seeded by seed:rbac; admin config and HR
// endpoints also accept the broad "admin.roles" code so existing admins work
// without a re-seed (requirePermission passes if ANY required code matches).

export const OFFBOARDING_PERMISSIONS = {
  VIEW: "offboarding.view",
  MANAGE_FLOWS: "offboarding.manage_flows",
  APPROVE_RESIGNATIONS: "offboarding.approve_resignations",
  MANAGE_CASES: "offboarding.manage_cases",
  // Per-team clearance — a user holding one of these can view/complete that
  // team's clearance tasks on the "My Clearances" page. The Reporting-Manager
  // team is resolved per-case (the case's reporting manager), no code needed.
  CLEARANCE_IT: "offboarding.clearance.it",
  CLEARANCE_ADMIN: "offboarding.clearance.admin",
  CLEARANCE_FINANCE: "offboarding.clearance.finance",
  CLEARANCE_HR: "offboarding.clearance.hr",
  CLEARANCE_OPERATIONS: "offboarding.clearance.operations",
} as const;

// Maps a clearance-team enum value to the permission code that grants access.
// ReportingManager is intentionally absent — it is resolved per-case.
export const CLEARANCE_TEAM_PERMISSION: Record<string, string> = {
  IT: OFFBOARDING_PERMISSIONS.CLEARANCE_IT,
  Admin: OFFBOARDING_PERMISSIONS.CLEARANCE_ADMIN,
  Finance: OFFBOARDING_PERMISSIONS.CLEARANCE_FINANCE,
  HR: OFFBOARDING_PERMISSIONS.CLEARANCE_HR,
  Operations: OFFBOARDING_PERMISSIONS.CLEARANCE_OPERATIONS,
};

export const OFFBOARDING_PERMISSION_MODULE = "Offboarding";

export const OFFBOARDING_PERMISSION_DEFINITIONS = [
  {
    code: OFFBOARDING_PERMISSIONS.VIEW,
    name: "View Offboarding",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View offboarding cases and configuration.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.MANAGE_FLOWS,
    name: "Manage Resignation Flows",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "Create and edit resignation flows, notice rules and exit reasons.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.APPROVE_RESIGNATIONS,
    name: "Approve Resignations (HR)",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "HR review and approval of resignations.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.MANAGE_CASES,
    name: "Manage Offboarding Cases",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View and manage active offboarding cases.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.CLEARANCE_IT,
    name: "IT Clearance",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View and complete IT clearance tasks on offboarding cases.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.CLEARANCE_ADMIN,
    name: "Admin Clearance",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View and complete Admin clearance tasks on offboarding cases.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.CLEARANCE_FINANCE,
    name: "Finance Clearance",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View and complete Finance clearance tasks on offboarding cases.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.CLEARANCE_HR,
    name: "HR Clearance",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View and complete HR clearance tasks on offboarding cases.",
  },
  {
    code: OFFBOARDING_PERMISSIONS.CLEARANCE_OPERATIONS,
    name: "Operations Clearance",
    module: OFFBOARDING_PERMISSION_MODULE,
    description: "View and complete Operations clearance tasks on offboarding cases.",
  },
] as const;

export const OFFBOARDING_FULL_ACCESS_ROLE_CODES = ["hr", "admin"] as const;
