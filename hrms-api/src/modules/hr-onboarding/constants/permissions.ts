/** RBAC permission codes for the onboarding module (keep in sync with seed-rbac). */
export const ONBOARDING_PERMISSIONS = {
  VIEW: "onboarding.view",
  MANAGE: "onboarding.manage",
  VERIFY_DOCUMENTS: "onboarding.verify_documents",
  RESEND_INVITATION: "onboarding.resend_invitation",
  MANAGE_BANK: "onboarding.manage_bank",
} as const;

export type OnboardingPermissionCode =
  (typeof ONBOARDING_PERMISSIONS)[keyof typeof ONBOARDING_PERMISSIONS];

export const ONBOARDING_PERMISSION_MODULE = "onboarding" as const;

export const ONBOARDING_PERMISSION_DEFINITIONS = [
  {
    code: ONBOARDING_PERMISSIONS.VIEW,
    name: "View Onboarding",
    module: ONBOARDING_PERMISSION_MODULE,
    description: "View employee onboarding status and reports",
  },
  {
    code: ONBOARDING_PERMISSIONS.MANAGE,
    name: "Manage Onboarding",
    module: ONBOARDING_PERMISSION_MODULE,
    description: "Approve onboarding and manage invitations",
  },
  {
    code: ONBOARDING_PERMISSIONS.VERIFY_DOCUMENTS,
    name: "Verify Documents",
    module: ONBOARDING_PERMISSION_MODULE,
    description: "Verify or reject employee documents",
  },
  {
    code: ONBOARDING_PERMISSIONS.RESEND_INVITATION,
    name: "Resend Invitations",
    module: ONBOARDING_PERMISSION_MODULE,
    description: "Resend or regenerate onboarding invitations",
  },
  {
    code: ONBOARDING_PERMISSIONS.MANAGE_BANK,
    name: "Manage Bank Details",
    module: ONBOARDING_PERMISSION_MODULE,
    description: "Add and approve employee bank account details during onboarding",
  },
] as const;

/** Roles that should receive all onboarding permissions by default. */
export const ONBOARDING_FULL_ACCESS_ROLE_CODES = ["hr", "admin"] as const;
