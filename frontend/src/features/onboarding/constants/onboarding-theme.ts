import {
  BRAND_PRIMARY_HOVER_LAB,
  BRAND_PRIMARY_LAB,
  enterpriseBtnOutlineSmClass,
} from "@/lib/branding";

/** Visual tokens for employee onboarding flows (enterprise brand). */
export const onboardingTheme = {
  primary: BRAND_PRIMARY_LAB,
  primaryHover: BRAND_PRIMARY_HOVER_LAB,
  primaryDisabled: "lab(70% 15 -40)",
} as const;

const brandBtnBg = "bg-[lab(36.9089%_35.0961_-85.6872)]";
const brandBtnHover = "hover:bg-[lab(30%_38_-90)]";

export const onboardingBtnPrimaryClass = `inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold text-white ${brandBtnBg} ${brandBtnHover} disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer transition-colors shadow-sm`;

export const onboardingBtnPrimaryFullClass = `w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-[15px] font-bold text-white ${brandBtnBg} ${brandBtnHover} disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer transition-colors shadow-sm`;

export const onboardingBtnOutlineClass =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer";

export const onboardingBtnAccentOutlineClass =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-slate-200 text-[lab(52%_28_-70)] bg-blue-50 hover:bg-blue-100/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer";

export const onboardingBtnDestructiveClass =
  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer";

export const onboardingSuccessAlertClass =
  "text-sm text-green-700 bg-green-50 rounded-md px-3 py-2";

export const onboardingErrorAlertClass =
  "text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2";

export const onboardingDocCardClass =
  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md border border-slate-200 bg-white";

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
  "block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1";

export const onboardingReadOnlyValueClass =
  "text-sm text-slate-900 m-0 whitespace-pre-wrap break-words";

/** @deprecated Use onboardingBtnOutlineClass */
export const onboardingBtnOutlineSmClass = enterpriseBtnOutlineSmClass;
