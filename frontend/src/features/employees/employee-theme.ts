/** Color tokens aligned with iLeads_dialer/system-configuration.html */
export const employeeTheme = {
  btn: "#FF014F",
  btnHover: "#eb0249",
  focusRing: "#ffb9ce",
  lightBg: "#ffe2e2",
  primary: "#4F46E5",
} as const;

export const employeeBtnClass =
  "inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF014F] hover:bg-[#eb0249] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all text-sm no-underline border-0 cursor-pointer";

export const employeeBtnSmClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF014F] hover:bg-[#eb0249] text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all text-xs no-underline border-0 cursor-pointer";

export const employeeBtnOutlineSmClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-all text-xs no-underline cursor-pointer";

export const employeeEditIconBtnClass =
  "text-[#FF014F] hover:text-[#eb0249] bg-transparent border-0 cursor-pointer p-0 transition-colors";

export const employeeViewIconBtnClass =
  "text-green-700 hover:text-green-800 bg-transparent border-0 cursor-pointer p-0 transition-colors";

export const employeeCardClass =
  "bg-white rounded-lg shadow-sm border border-gray-100";

export const employeeFilterLabelClass =
  "block text-xs font-medium text-gray-500 uppercase mb-1.5 tracking-wide";

export const employeeModalTitleClass =
  "text-lg font-medium text-gray-500 m-0";

export const employeeFieldLabelClass =
  "text-xs font-medium text-gray-400 uppercase tracking-wide";

/** Small corner radius on employee form controls (overrides shadcn rounded-lg). */
export const employeeInputRadiusClass = "rounded-sm";

export const employeeFormControlClass =
  `h-auto !min-h-[42px] px-3 py-2.5 text-sm !${employeeInputRadiusClass} border-gray-300 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-[#ffb9ce] focus-visible:border-transparent data-[size=default]:!h-auto`;

export const employeeFormFieldsClass =
  "[&_[data-slot=field]]:!gap-0 [&_[data-slot=field-label]]:block [&_[data-slot=field-label]]:mb-1.5 [&_[data-slot=field-label]]:w-full [&_[data-slot=field-label]]:text-xs [&_[data-slot=field-label]]:font-medium [&_[data-slot=field-label]]:uppercase [&_[data-slot=field-label]]:tracking-wide [&_[data-slot=field-label]]:text-gray-500";

export const employeeFormSectionClass =
  "border border-gray-100 rounded-lg overflow-hidden bg-white";

export const employeeFormSectionHeaderClass =
  "px-5 py-3.5 bg-gray-50 border-b border-gray-100";

export const employeeFormSectionTitleClass =
  "text-sm font-semibold text-gray-800 m-0";

export const employeeFormSectionDescClass =
  "text-xs text-gray-500 mt-1 mb-0";

export const employeeFormSectionBodyClass =
  `px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 ${employeeFormFieldsClass}`;

export const employeeFormSectionBodyDenseClass =
  `px-5 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 ${employeeFormFieldsClass}`;

export const employeeFormFieldClass = "min-w-0";

export const employeeFormFieldSpan2Class = "md:col-span-2";

export const employeeFormFieldSpan3Class = "lg:col-span-3";

export const employeeFormSectionsStackClass = "space-y-5";

export const employeeFormSectionsGridClass =
  "grid grid-cols-1 xl:grid-cols-2 gap-5";

export const employeeInputClass =
  `w-full px-3 py-2.5 border border-gray-300 ${employeeInputRadiusClass} focus:outline-none focus:ring-1 focus:ring-[#ffb9ce] focus:border-transparent text-sm`;

export const employeeSelectClass = [
  employeeInputClass,
  "appearance-none pr-10 cursor-pointer bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem]",
  "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")]",
].join(" ");

export const employeeIconSm = "w-4 h-4";
export const employeeIconXs = "w-3.5 h-3.5";
export const employeeIconPen = "w-4 h-5";
export const employeeIconMd = "w-5 h-5";

export const employeeErrorBannerClass =
  "mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800";

export const employeeWarnBannerClass =
  "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900";

export const employeeLoadingClass =
  `${employeeCardClass} p-8 text-center text-sm text-gray-500`;
