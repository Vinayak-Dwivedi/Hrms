export const ILEADS_LOGO_SRC = "/ileads.png";
export const ILEADS_LOGO_ALT = "iLeads Auxiliary Services PVT LTD";

/** @deprecated Use BRAND_PRIMARY_LAB — kept for pages not yet migrated from pink. */
export const BRAND_PINK_LAB = "#ff014f";
/** @deprecated Use BRAND_PRIMARY_LAB — kept for pages not yet migrated from pink. */
export const BRAND_PINK_LAB_TW = "#ff014f";

/** Primary brand color in CSS lab() notation. */
export const BRAND_PRIMARY_LAB = "lab(36.9089% 35.0961 -85.6872)";
export const BRAND_PRIMARY_HOVER_LAB = "lab(30% 38 -90)";
export const BRAND_PRIMARY_LIGHT_LAB = "lab(97% 4 -18)";
export const BRAND_PRIMARY_LIGHT_STRONG_LAB = "lab(93% 8 -35)";
export const BRAND_PRIMARY_BORDER_LAB = "lab(88% 12 -42)";
export const BRAND_PRIMARY_MUTED_LAB = "lab(52% 28 -70)";
export const BRAND_GRADIENT_END_LAB = "lab(28% 38 -92)";
export const BRAND_PAGE_BG_LAB = "#f4f6f9";

// ─── Enterprise shell (sidebar + header) ─────────────────────────────────────

export const enterpriseSidebarClass =
  "bg-white text-slate-700 border-r border-slate-200";

export const enterpriseSidebarBorderClass = "border-slate-100";

export const enterpriseNavInactiveClass =
  "text-slate-600 bg-transparent border-l-2 border-transparent hover:bg-slate-100 hover:text-slate-900";

export const enterpriseNavActiveClass =
  "text-slate-900 bg-slate-100 border-l-2 border-slate-400 font-medium shadow-none";

export const enterpriseNavActiveCollapsedClass =
  "text-slate-900 bg-slate-100 font-medium shadow-none";

export const enterpriseSectionLabelClass =
  "text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase px-2.5 mb-1";

export const enterpriseSectionToggleClass =
  "text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase";

export const enterpriseSectionToggleActiveClass =
  "text-slate-700 bg-slate-100";

export const enterpriseHeaderClass =
  "bg-white border-b border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const enterpriseToggleActiveClass =
  "bg-slate-100 text-slate-800 border border-slate-300";

export const enterpriseToggleInactiveClass =
  "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50";

/** Inline style values for attendance calendar modals. */
export const brandStyle = {
  primary: BRAND_PRIMARY_LAB,
  primaryHover: BRAND_PRIMARY_HOVER_LAB,
  primaryLight: BRAND_PRIMARY_LIGHT_LAB,
  primaryBorder: BRAND_PRIMARY_BORDER_LAB,
  primaryMuted: BRAND_PRIMARY_MUTED_LAB,
} as const;

// ─── Enterprise dashboard ───────────────────────────────────────────────────

export const enterpriseCardClass =
  "bg-white rounded-md border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const enterpriseCardTitleClass =
  "text-[13px] font-semibold text-slate-800 tracking-tight m-0";

export const enterpriseLinkClass =
  "text-xs font-medium no-underline text-slate-500 hover:text-[lab(36.9089%_35.0961_-85.6872)] transition-colors";

export const enterpriseBtnGhostClass =
  "inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[lab(36.9089%_35.0961_-85.6872)] transition-colors cursor-pointer";

export const enterpriseBtnSmClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[lab(36.9089%_35.0961_-85.6872)] hover:bg-[lab(30%_38_-90)] border-0 cursor-pointer transition-colors shadow-sm";

export const enterpriseBtnOutlineSmClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md border border-slate-200 transition-colors text-xs cursor-pointer";

export const enterpriseLoadingClass =
  "bg-white rounded-md border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-8 text-center text-sm text-slate-500";

export const enterpriseFilterLabelClass =
  "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide";

export const enterpriseSelectClass =
  "h-8 px-2.5 py-0 text-xs leading-normal rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300";

export const enterpriseInputClass =
  "w-full h-8 px-2.5 py-0 text-sm leading-normal rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-300";

export const enterprisePaginationBtnClass =
  "px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

export const enterprisePaginationActiveClass =
  "px-3 py-1.5 text-xs rounded-md transition-colors border text-white bg-[lab(36.9089%_35.0961_-85.6872)] border-[lab(36.9089%_35.0961_-85.6872)] hover:bg-[lab(30%_38_-90)] cursor-pointer";

export const enterprisePaginationInactiveClass =
  "px-3 py-1.5 text-xs rounded-md transition-colors border text-slate-600 bg-white border-slate-200 hover:bg-slate-50 cursor-pointer";

export const enterpriseLeaveTypeBadgeClass =
  "inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-[lab(52%_28_-70)]";

export const enterpriseIconTileClass =
  "flex items-center justify-center rounded-md w-10 h-10 bg-slate-50 border border-slate-100 text-[lab(52%_28_-70)]";

export const enterpriseAvatarClass =
  "bg-[lab(36.9089%_35.0961_-85.6872)] border-2 border-slate-100";

export const enterpriseChipClass =
  "text-[11px] font-medium rounded-md px-2 py-1 flex items-center gap-1 bg-white text-slate-700 border border-slate-200 cursor-pointer";

export const enterpriseChipActiveClass =
  "bg-slate-50 text-slate-900 border-slate-300 font-medium";

export const enterpriseMutedPanelClass =
  "rounded-md bg-slate-50 border border-slate-100";

export const enterpriseAccentTextClass = "text-[lab(52%_28_-70)]";

/** @deprecated Prefer enterprise nav tokens. */
export const brandNavActiveClass = enterpriseNavActiveClass;

/** @deprecated Prefer enterpriseSectionToggleActiveClass. */
export const brandSectionActiveClass = enterpriseSectionToggleActiveClass;

/** @deprecated Prefer enterpriseLinkClass. */
export const brandLinkClass = enterpriseLinkClass;

/** @deprecated Prefer enterpriseBtnSmClass. */
export const brandBtnSmClass = enterpriseBtnSmClass;

/** @deprecated Prefer enterpriseAvatarClass. */
export const brandGradientClass = enterpriseAvatarClass;

/** @deprecated Prefer enterpriseCardClass. */
export const brandCardGradientTintClass = "";

/** @deprecated Prefer enterpriseMutedPanelClass. */
export const brandTintBgClass = "bg-slate-50";
export const brandTintBorderClass = "border-slate-200";

/** @deprecated */
export const brandTintStrongBgClass = "bg-slate-100";

/** @deprecated Prefer enterpriseAccentTextClass. */
export const brandAccentTextClass = "text-[lab(52%_28_-70)]";

/** @deprecated */
export const brandMutedTextClass = enterpriseAccentTextClass;

/** @deprecated Prefer enterpriseChipClass. */
export const brandChipClass = enterpriseChipClass;

/** @deprecated Prefer enterpriseChipActiveClass. */
export const brandChipActiveClass = enterpriseChipActiveClass;

/** @deprecated Prefer enterpriseIconTileClass. */
export const brandIconWrapClass = enterpriseIconTileClass;
