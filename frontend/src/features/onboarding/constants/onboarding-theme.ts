/** Visual tokens for employee self-service onboarding (matches mockup magenta). */
export const onboardingTheme = {
  primary: "#e91e63",
  primaryHover: "#d81b60",
  primaryDisabled: "#f471a8",
} as const;

export const onboardingBtnPrimaryClass =
  "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#e91e63] hover:bg-[#d81b60] disabled:bg-[#f471a8] disabled:cursor-not-allowed border-0 cursor-pointer transition-colors";

export const onboardingBtnPrimaryFullClass =
  "w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-[15px] font-bold text-white bg-[#e91e63] hover:bg-[#d81b60] disabled:bg-[#f471a8] disabled:cursor-not-allowed border-0 cursor-pointer transition-colors";

export const onboardingBtnOutlineClass =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const onboardingBtnDestructiveClass =
  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const onboardingSuccessAlertClass =
  "text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2";

export const onboardingErrorAlertClass =
  "text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2";

export const onboardingDocCardClass =
  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 bg-white";

export const onboardingStatusUploadedClass =
  "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800";

export const onboardingStatusPendingClass =
  "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800";

export const onboardingStatusVerifiedClass =
  "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800";

export const onboardingStatusRejectedClass =
  "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800";

export const onboardingShellMaxWidthClass = "max-w-5xl";

export const onboardingReadOnlyLabelClass =
  "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";

export const onboardingReadOnlyValueClass =
  "text-sm text-gray-900 m-0 whitespace-pre-wrap break-words";
