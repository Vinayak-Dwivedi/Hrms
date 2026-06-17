import {
  enterpriseNavActiveClass,
  enterpriseNavActiveCollapsedClass,
  enterpriseNavInactiveClass,
} from "@/lib/branding";

export type NavEntryLike = {
  label: string;
  href: string;
  also?: string[];
};

export type NavSectionLike = {
  title: string;
  entries: NavEntryLike[];
  sectionKey?: string;
};

export const USER_MGMT_HREFS = [
  "/employees",
  "/hierarchy",
  "/departments",
  "/add-employee",
  "/add-permission",
  "/user-roles",
];

export const SETTINGS_HREFS = ["/locations"];

export function formatEntryId(sectionTitle: string, label: string): string {
  return `${sectionTitle}::${label}`;
}

function pathMatchLength(href: string, pathname: string): number {
  if (pathname === href) return href.length;
  if (pathname.startsWith(`${href}/`)) return href.length;
  return 0;
}

/** Longest matching href wins so parent routes do not steal child highlights. */
export function navMatchSpecificity(
  entry: NavEntryLike,
  pathname: string,
): number {
  let best = pathMatchLength(entry.href, pathname);
  for (const href of entry.also ?? []) {
    best = Math.max(best, pathMatchLength(href, pathname));
  }
  return best;
}

export function isNavActive(entry: NavEntryLike, pathname: string): boolean {
  return navMatchSpecificity(entry, pathname) > 0;
}

export function isUserMgmtPath(pathname: string): boolean {
  return USER_MGMT_HREFS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

export function isSettingsPath(pathname: string): boolean {
  return SETTINGS_HREFS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

export function resolveActiveEntryId(
  sections: NavSectionLike[],
  pathname: string,
): string | null {
  const userMgmt = isUserMgmtPath(pathname);
  const settings = isSettingsPath(pathname);

  let activeId: string | null = null;
  let bestSpecificity = 0;

  for (const section of sections) {
    if (userMgmt && section.sectionKey !== "user-management") continue;
    if (settings && section.sectionKey !== "settings") continue;

    for (const entry of section.entries) {
      const specificity = navMatchSpecificity(entry, pathname);
      if (specificity > bestSpecificity) {
        bestSpecificity = specificity;
        activeId = formatEntryId(section.title, entry.label);
      }
    }
  }

  return activeId;
}

type NavLinkClassOptions = {
  collapsed?: boolean;
  nested?: boolean;
  hrNested?: boolean;
  /** `enterprise` = white sidebar with blue active/hover; `light` = same nav styles (HR shell). */
  theme?: "enterprise" | "light";
};

export function navLinkClassName(
  active: boolean,
  options: NavLinkClassOptions = {},
): string {
  const {
    collapsed = false,
    nested = false,
    hrNested = false,
    theme = "enterprise",
  } = options;

  const navActive = collapsed
    ? enterpriseNavActiveCollapsedClass
    : enterpriseNavActiveClass;

  return [
    "flex items-center text-[13px] font-medium no-underline transition-colors duration-150",
    theme === "enterprise"
      ? collapsed
        ? "rounded-md"
        : "rounded-r-md rounded-l-none"
      : "rounded-xl",
    hrNested ? "gap-2.5 py-2 pl-9 pr-3" : "gap-2.5",
    collapsed
      ? "py-2.5 justify-center"
      : !hrNested
        ? "px-3 py-2"
        : "",
    nested && !collapsed ? "ml-1" : "",
    active ? `active ${navActive}` : enterpriseNavInactiveClass,
  ]
    .filter(Boolean)
    .join(" ");
}
