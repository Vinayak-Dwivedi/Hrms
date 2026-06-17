// Permission codes for the Offboarding module. Mirrors the onboarding module's
// constants pattern. Granular codes are seeded by seed:rbac; admin config and HR
// endpoints also accept the broad "admin.roles" code so existing admins work
// without a re-seed (requirePermission passes if ANY required code matches).

export const OFFBOARDING_PERMISSIONS = {
  VIEW: "offboarding.view",
  MANAGE_FLOWS: "offboarding.manage_flows",
  APPROVE_RESIGNATIONS: "offboarding.approve_resignations",
  MANAGE_CASES: "offboarding.manage_cases",
} as const;

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
] as const;

export const OFFBOARDING_FULL_ACCESS_ROLE_CODES = ["hr", "admin"] as const;
