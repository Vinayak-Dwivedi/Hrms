import {
  BRAND_PRIMARY_HOVER_LAB,
  BRAND_PRIMARY_LAB,
  BRAND_PRIMARY_LIGHT_LAB,
  enterpriseBtnOutlineSmClass,
  enterpriseBtnSmClass,
  enterpriseCardClass,
  enterpriseFilterLabelClass,
  enterpriseLoadingClass,
  enterprisePaginationActiveClass,
  enterprisePaginationBtnClass,
  enterprisePaginationInactiveClass,
} from "@/lib/branding";

const brandBtnBg = "bg-[lab(36.9089%_35.0961_-85.6872)]";
const brandBtnHover = "hover:bg-[lab(30%_38_-90)]";
const brandAccentText = "text-[lab(52%_28_-70)]";
const brandAccentTextHover = "hover:text-[lab(36.9089%_35.0961_-85.6872)]";
const focusRingClass =
  "focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-transparent";
const focusVisibleRingClass =
  "focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:border-transparent";

/** Color tokens aligned with enterprise branding. */
export const employeeTheme = {
  btn: BRAND_PRIMARY_LAB,
  btnHover: BRAND_PRIMARY_HOVER_LAB,
  focusRing: "slate-300",
  lightBg: BRAND_PRIMARY_LIGHT_LAB,
  primary: BRAND_PRIMARY_LAB,
} as const;

export const employeeBtnClass = `inline-flex items-center gap-2 px-5 py-2.5 ${brandBtnBg} ${brandBtnHover} text-white font-medium rounded-md shadow-sm transition-all text-sm no-underline border-0 cursor-pointer`;

export const employeeBtnSmClass = enterpriseBtnSmClass;

export const employeeBtnOutlineSmClass = enterpriseBtnOutlineSmClass;

export const employeeEditIconBtnClass = `${brandAccentText} ${brandAccentTextHover} bg-transparent border-0 cursor-pointer p-0 transition-colors`;

export const employeeViewIconBtnClass =
  "text-green-700 hover:text-green-800 bg-transparent border-0 cursor-pointer p-0 transition-colors";

export const employeeCardClass = enterpriseCardClass;

export const employeeFilterLabelClass = `${enterpriseFilterLabelClass} mb-1.5`;

/** List-page filter controls (employees, departments, roles, permissions). */
export const employeeListFilterLabelClass = employeeFilterLabelClass;

export const employeeModalTitleClass =
  "text-lg font-semibold text-slate-800 tracking-tight m-0";

export const employeeFieldLabelClass =
  "text-xs font-medium text-slate-400 uppercase tracking-wide";

/** Small corner radius on employee form controls (overrides shadcn rounded-lg). */
export const employeeInputRadiusClass = "rounded-sm";

/** Shared control height — keep native inputs and selects aligned in one row. */
export const employeeFormControlHeightClass = "h-[42px] min-h-[42px]";
export const employeeListControlHeightClass = "h-[38px] min-h-[38px]";

const employeeListControlBaseClass = [
  employeeListControlHeightClass,
  "px-3 py-0 text-sm leading-normal !rounded-sm border border-slate-200 bg-white",
  focusRingClass,
].join(" ");

const employeeFormControlBaseClass = [
  employeeFormControlHeightClass,
  "px-3 py-0 text-sm leading-normal !rounded-sm border border-slate-200 bg-white",
  focusRingClass,
].join(" ");

export const employeeFormControlClass = [
  employeeFormControlBaseClass,
  "shadow-none",
  focusVisibleRingClass,
  "!h-[42px] !min-h-[42px] data-[size=default]:!h-[42px]",
].join(" ");

export const employeeListFormControlClass = [
  employeeListControlBaseClass,
  "shadow-none",
  focusVisibleRingClass,
  "!h-[38px] !min-h-[38px] data-[size=default]:!h-[38px]",
].join(" ");

export const employeeFormFieldsClass =
  "[&_[data-slot=field]]:!gap-0 [&_[data-slot=field-label]]:block [&_[data-slot=field-label]]:mb-1.5 [&_[data-slot=field-label]]:w-full [&_[data-slot=field-label]]:text-xs [&_[data-slot=field-label]]:font-medium [&_[data-slot=field-label]]:uppercase [&_[data-slot=field-label]]:tracking-wide [&_[data-slot=field-label]]:text-slate-500 [&_[data-slot=input]]:!h-[42px] [&_[data-slot=input]]:!min-h-[42px] [&_[data-slot=input]]:!rounded-sm [&_select]:!h-[42px] [&_select]:!min-h-[42px] [&_select]:rounded-sm [&_input]:!h-[42px] [&_input]:!min-h-[42px] [&_input]:rounded-sm [&_button]:!h-[42px] [&_button]:!min-h-[42px] [&_button]:!rounded-sm";

export const employeeFormSectionClass =
  "border border-slate-200 rounded-md overflow-hidden bg-white";

export const employeeFormSectionHeaderClass =
  "px-5 py-3.5 bg-slate-50 border-b border-slate-100";

export const employeeFormSectionTitleClass =
  "text-sm font-semibold text-slate-800 m-0";

export const employeeFormSectionDescClass =
  "text-xs text-slate-500 mt-1 mb-0";

export const employeeFormSectionBodyClass =
  `px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 ${employeeFormFieldsClass}`;

export const employeeFormSectionBodyDenseClass =
  `px-5 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 ${employeeFormFieldsClass}`;

export const employeeListFormFieldsClass =
  "[&_[data-slot=field]]:!gap-0 [&_[data-slot=field-label]]:block [&_[data-slot=field-label]]:mb-1 [&_[data-slot=field-label]]:w-full [&_[data-slot=field-label]]:text-[11px] [&_[data-slot=field-label]]:font-medium [&_[data-slot=field-label]]:uppercase [&_[data-slot=field-label]]:tracking-wide [&_[data-slot=field-label]]:text-slate-500 [&_[data-slot=input]]:!h-[38px] [&_[data-slot=input]]:!min-h-[38px] [&_[data-slot=input]]:!rounded-sm [&_select]:!h-[38px] [&_select]:!min-h-[38px] [&_select]:rounded-sm [&_input]:!h-[38px] [&_input]:!min-h-[38px] [&_input]:rounded-sm";

export const employeeListFormSectionHeaderClass =
  "px-4 py-2.5 bg-slate-50 border-b border-slate-100";

export const employeeListFormSectionTitleClass =
  "text-[13px] font-semibold text-slate-800 m-0 leading-none";

export const employeeListFormSectionDescClass =
  "text-[11px] text-slate-500 mt-0.5 mb-0";

export const employeeFormSectionIconWrapClass =
  "flex items-center justify-center w-8 h-8 rounded-md bg-slate-50 border border-slate-100 text-[lab(52%_28_-70)] shrink-0";

export const employeeListFormSectionIconWrapClass =
  "flex items-center justify-center w-7 h-7 rounded-md bg-slate-50 border border-slate-100 text-[lab(52%_28_-70)] shrink-0";

export const employeeFormSectionIconClass = "w-4 h-4";

export const employeeListFormSectionIconClass = "w-3.5 h-3.5";

export const employeeListFormSectionBodyClass =
  `px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3 ${employeeListFormFieldsClass}`;

export const employeeListFormSectionBodyDenseClass =
  `px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3 ${employeeListFormFieldsClass}`;

export const employeeFormFieldClass = "min-w-0";

export const employeeFormFieldSpan2Class = "md:col-span-2";

export const employeeFormFieldSpan3Class = "lg:col-span-3";

export const employeeFormSectionsStackClass = "space-y-5";

export const employeeFormSectionsGridClass =
  "grid grid-cols-1 md:grid-cols-2 gap-4";

export const employeeInputClass = `w-full h-[38px] min-h-[38px] px-3 py-0 border border-slate-200 rounded-sm text-sm leading-normal text-slate-900 ${focusRingClass}`;

export const employeeListInputClass = employeeInputClass;

const employeeSelectChevronBgClass =
  "bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] [background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")]";

export const employeeSelectClass = [
  employeeInputClass,
  "appearance-none pr-10 cursor-pointer",
  employeeSelectChevronBgClass,
].join(" ");

export const employeeListSelectClass = employeeSelectClass;

/** Native selects in forms — chevron rendered via NativeSelectField wrapper. */
export const employeeFormNativeSelectClass = [
  employeeListControlBaseClass,
  "w-full appearance-none pr-10 cursor-pointer",
].join(" ");

export const employeeReadOnlyControlClass = [
  employeeListControlBaseClass,
  "w-full bg-slate-50 text-slate-700 cursor-default focus:ring-0 focus:border-slate-200",
].join(" ");

export const employeeListBtnClass = employeeBtnClass;

export const employeeListBtnOutlineClass =
  "inline-flex items-center gap-2 px-5 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 font-medium text-sm no-underline transition-colors cursor-pointer";

export const employeeListResetBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium text-[13px] transition-colors bg-transparent border-0 cursor-pointer";

export const employeeListTableHeadClass =
  "px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

export const employeeListTableCellClass = "px-4 py-2.5";

export const employeeListTableEmptyClass =
  "px-4 py-8 text-center text-[13px] text-slate-400";

export const employeeListTableRowClass =
  "hover:bg-slate-50 transition-colors text-[13px] text-slate-600";

export const employeeListTableBadgeClass =
  "px-2 py-0.5 text-[11px] font-medium rounded-full";

export const employeeListTableFooterClass =
  "flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200";

export const employeeListTableSummaryClass =
  "text-[13px] text-slate-500 m-0";

export const employeeListPaginationBtnClass = enterprisePaginationBtnClass;

export const employeeListPaginationBtnActiveClass =
  enterprisePaginationActiveClass;

export const employeeListPaginationBtnInactiveClass =
  enterprisePaginationInactiveClass;

export const employeeIconSm = "w-4 h-4";
export const employeeIconXs = "w-3.5 h-3.5";
export const employeeIconPen = "w-4 h-5";
export const employeeIconMd = "w-5 h-5";

export const employeeErrorBannerClass =
  "mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800";

export const employeeListErrorBannerClass = employeeErrorBannerClass;

export const employeeWarnBannerClass =
  "mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900";

export const employeeListWarnBannerClass = employeeWarnBannerClass;

export const employeeLoadingClass = enterpriseLoadingClass;

export const employeeListLoadingClass = employeeLoadingClass;
