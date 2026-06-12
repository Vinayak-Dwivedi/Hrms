/** Onboarding RBAC codes — align with hrms-api onboarding permission definitions. */
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

/** Any of these grants access to the HR onboarding review workspace. */
export const ONBOARDING_PANEL_ACCESS_PERMISSIONS = [
  ONBOARDING_PERMISSIONS.VIEW,
  ONBOARDING_PERMISSIONS.MANAGE,
  ONBOARDING_PERMISSIONS.VERIFY_DOCUMENTS,
  ONBOARDING_PERMISSIONS.RESEND_INVITATION,
  ONBOARDING_PERMISSIONS.MANAGE_BANK,
] as const;

/** Bank step: dedicated permission, or full onboarding manage for HR admins. */
export const ONBOARDING_BANK_ACCESS_PERMISSIONS = [
  ONBOARDING_PERMISSIONS.MANAGE_BANK,
  ONBOARDING_PERMISSIONS.MANAGE,
] as const;
