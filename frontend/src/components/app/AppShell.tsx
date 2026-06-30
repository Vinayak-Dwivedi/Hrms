"use client";

import {
  BarChart3,
  Briefcase,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ChevronDown,
  Clock,
  GitBranch,
  Lock,
  LogOut,
  MapPin,
  Network,
  Settings,
  Shield,
  ShieldPlus,
  Timer,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppLogo } from "@/components/app/AppLogo";
import AppHeader from "@/components/app/AppHeader";
import { APP_LOCATION, APP_VERSION } from "@/lib/dashboard";
import {
  fetchHeaderIdentity,
  fetchLeaveApprovals,
  identityFromAuthUser,
} from "@/lib/hrms-client";
import type { Employee } from "@/lib/dashboard";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/roles";
import { navSectionsForRole } from "@/lib/role-config";
import {
  MY_CLEARANCES_PERMISSIONS,
  NAV_ENTRY_PERMISSIONS,
  navEntryAllowed,
} from "@/lib/nav-permissions";
import {
  enterpriseMainPaddingClass,
  enterpriseNavActiveCollapsedClass,
  enterpriseSectionToggleActiveClass,
  enterpriseSectionToggleClass,
  enterpriseSidebarBorderClass,
  enterpriseSidebarClass,
} from "@/lib/branding";
import {
  formatEntryId,
  isNavActive,
  isSettingsPath,
  isUserMgmtPath,
  navLinkClassName,
  resolveActiveEntryId,
} from "@/lib/nav-active";

// ─── nav model ──────────────────────────────────────────────────────────────
type NavEntry = {
  icon: LucideIcon;
  label: string;
  href: string;
  also?: string[];
  badgeKey?: "pendingApprovals";
  requiredPermission?: string | string[];
};

type NavSection = {
  title: string;
  entries: NavEntry[];
  collapsible?: boolean;
  sectionKey?: string;
  collapsedIcon?: LucideIcon;
};

const USER_MGMT_SECTION: NavSection = {
  title: "USER MANAGEMENT",
  sectionKey: "user-management",
  collapsible: true,
  collapsedIcon: Users,
  entries: [
    {
      icon: Users,
      label: "Employees",
      href: "/employees",
      requiredPermission: NAV_ENTRY_PERMISSIONS.employeesView,
    },
    {
      icon: GitBranch,
      label: "Org Config",
      href: "/departments/hierarchy",
      requiredPermission: NAV_ENTRY_PERMISSIONS.employeesView,
    },
    {
      icon: Network,
      label: "Department Hierarchy",
      href: "/hierarchy",
      requiredPermission: NAV_ENTRY_PERMISSIONS.employeesView,
    },
    {
      icon: UserPlus,
      label: "Add Employee",
      href: "/add-employee",
      requiredPermission: NAV_ENTRY_PERMISSIONS.employeesCreate,
    },
    {
      icon: Lock,
      label: "Permissions",
      href: "/permissions",
      also: ["/add-permission", "/user-roles"],
      requiredPermission: NAV_ENTRY_PERMISSIONS.adminPermissions,
    },
  ],
};

const SETTINGS_HREFS = [
  "/leave-policy",
  "/holiday-calendars",
  "/weekly-off",
  "/leave-credits",
  "/offboarding",
];

const SETTINGS_SECTION: NavSection = {
  title: "SETTINGS",
  sectionKey: "settings",
  collapsible: true,
  collapsedIcon: Settings,
  entries: [
    // Weekly Off lives as a tab inside Leave Policy; Holiday Policy is here.
    { icon: CalendarIcon, label: "Leave Policy", href: "/leave-policy", requiredPermission: [...NAV_ENTRY_PERMISSIONS.leavePolicyManage] },
    {
      icon: CalendarDays,
      label: "Holiday Policy",
      href: "/holiday-calendars",
      requiredPermission: [...NAV_ENTRY_PERMISSIONS.holidayPolicyManage],
    },
    {
      icon: Timer,
      label: "Shift Configuration",
      href: "/shift-configuration",
      requiredPermission: [...NAV_ENTRY_PERMISSIONS.shiftPolicyManage],
    },
    // Leave Credits hidden for now — kept for later re-enable.
    // {
    //   icon: Receipt,
    //   label: "Leave Credits",
    //   href: "/leave-credits",
    //   requiredPermission: "admin.roles",
    // },
    {
      icon: LogOut,
      label: "Offboarding",
      href: "/offboarding",
      requiredPermission: NAV_ENTRY_PERMISSIONS.adminRoles,
    },
  ],
};

function filterNavSections(
  sections: NavSection[],
  hasAnyPermission: (codes: string[]) => boolean,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((e) =>
        navEntryAllowed(e.requiredPermission, hasAnyPermission),
      ),
    }))
    .filter((section) => section.entries.length > 0);
}

/** Nav sections filtered by DB-backed permissions (see role_permissions). */
const ALL_NAV_SECTIONS: NavSection[] = [
  {
    title: "PERSONAL",
    entries: [
      { icon: Briefcase, label: "Dashboard", href: "/dashboard" },
      {
        icon: Clock,
        label: "Attendance",
        href: "/attendance",
        requiredPermission: NAV_ENTRY_PERMISSIONS.attendanceView,
      },
      {
        icon: Upload,
        label: "Upload Attendance",
        href: "/attendance/upload",
        requiredPermission: NAV_ENTRY_PERMISSIONS.attendanceUpload,
      },
      {
        icon: CalendarIcon,
        label: "Leave",
        href: "/leave",
        also: ["/leave/new"],
        requiredPermission: NAV_ENTRY_PERMISSIONS.leaveView,
      },
      // {
      //   icon: Receipt,
      //   label: "My Payslips",
      //   href: "/payslips",
      //   requiredPermission: "payroll.view",
      // },
      // {
      //   icon: Users,
      //   label: "Directory",
      //   href: "/directory",
      //   requiredPermission: "employees.view",
      // },
    ],
  },
  {
    title: "MY TEAM",
    entries: [
      {
        icon: CheckSquare,
        label: "Approvals",
        href: "/manager/approvals",
        badgeKey: "pendingApprovals",
        requiredPermission: NAV_ENTRY_PERMISSIONS.leaveApprove,
      },
      {
        icon: BarChart3,
        label: "Attendance Report",
        href: "/attendance/report",
        requiredPermission: NAV_ENTRY_PERMISSIONS.leaveApprove,
      },
      {
        icon: ClipboardCheck,
        label: "My Clearances",
        href: "/my-clearances",
        requiredPermission: [...MY_CLEARANCES_PERMISSIONS],
      },
    ],
  },
  USER_MGMT_SECTION,
  SETTINGS_SECTION,
];

function buildNav(): NavSection[] {
  return ALL_NAV_SECTIONS;
}

function defaultSectionOpen(sectionKey: string, pathname: string): boolean {
  if (sectionKey === "user-management") return isUserMgmtPath(pathname);
  if (sectionKey === "settings") return isSettingsPath(pathname);
  return false;
}

function activeCollapsibleSection(pathname: string): string | null {
  if (isUserMgmtPath(pathname)) return "user-management";
  if (isSettingsPath(pathname)) return "settings";
  return null;
}

const COLLAPSIBLE_SECTION_KEYS = ["user-management", "settings"] as const;

function isSectionPathActive(section: NavSection, pathname: string): boolean {
  return section.entries.some((entry) => isNavActive(entry, pathname));
}

// ─── breadcrumb table ──────────────────────────────────────────────────────
const BREADCRUMB_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/leave": "Leave",
  "/leave/new": "Apply Leave",
  "/payslips": "My Payslips",
  "/directory": "Directory",
  "/holidays": "Holidays",
  "/manager/approvals": "Approvals",
  "/hierarchy": "Department Hierarchy",
  "/departments/hierarchy": "Org Config",
  "/add-employee": "Add Employee",
  "/add-permission": "Add Permission",
  "/user-roles": "System Access Roles",
  "/locations": "Location",
  "/leave-policy": "Leave Policy",
  "/holiday-calendars": "Holiday Policy",
  "/shift-configuration": "Shift Configuration",
  "/employees": "Employees",
  "/employees/bulk-upload": "Bulk Upload",
  "/attendance/upload": "Upload Attendance",
  "/attendance/report": "Attendance Report",
};

function breadcrumbFor(pathname: string): string {
  const fromTable = BREADCRUMB_LABELS[pathname];
  if (fromTable) return fromTable;
  if (/^\/employees\/\d+\/edit$/.test(pathname)) return "Edit Employee";
  if (/^\/employees\/\d+\/onboarding$/.test(pathname)) return "Employee Onboarding";
  if (/^\/employees\/\d+$/.test(pathname)) return "View Employee";
  const derived = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" / ");
  return derived || "Dashboard";
}

function rootLabelFor(role: Role, authRole?: string): string {
  if (authRole === "master") return "Master";
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  if (role === "hr") return "HR";
  return "Employee";
}

// ─── collapse persistence ───────────────────────────────────────────────────
const COLLAPSE_KEY = "hrms.sidebar.collapsed";
const SECTION_OPEN_KEY = "hrms.sidebar.sections.open";

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

function loadSectionOpen(sectionKey: string, pathname: string): boolean {
  if (typeof window === "undefined") {
    return defaultSectionOpen(sectionKey, pathname);
  }
  try {
    const raw = window.localStorage.getItem(SECTION_OPEN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (typeof parsed[sectionKey] === "boolean") {
        return parsed[sectionKey];
      }
    }
  } catch {
    /* ignore */
  }
  return defaultSectionOpen(sectionKey, pathname);
}

function saveSectionOpen(sectionKey: string, open: boolean) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SECTION_OPEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[sectionKey] = open;
    window.localStorage.setItem(SECTION_OPEN_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

// ─── the shell ──────────────────────────────────────────────────────────────
export default function AppShell({
  children,
  role = "employee",
}: {
  children: React.ReactNode;
  role?: Role;
}) {
  const pathname = usePathname();
  const { hasAnyPermission, hasPermission, user } = useAuth();

  const [identity, setIdentity] = useState<Employee | null>(() =>
    identityFromAuthUser(user),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Open the section for the current route; close the other collapsible section.
  // Manual toggles on the same page are kept until the route changes.
  useEffect(() => {
    const active = activeCollapsibleSection(pathname);
    setOpenSections((prev) => {
      if (!active) {
        if (Object.keys(prev).length > 0) return prev;
        const initial = {
          "user-management": loadSectionOpen("user-management", pathname),
          settings: loadSectionOpen("settings", pathname),
        };
        return initial;
      }

      const next: Record<string, boolean> = {
        "user-management": active === "user-management",
        settings: active === "settings",
      };

      const unchanged =
        prev["user-management"] === next["user-management"] &&
        prev.settings === next.settings;
      if (unchanged) return prev;

      for (const key of COLLAPSIBLE_SECTION_KEYS) {
        saveSectionOpen(key, next[key] ?? false);
      }
      return next;
    });
  }, [pathname]);

  function toggleSection(sectionKey: string) {
    setOpenSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      saveSectionOpen(sectionKey, Boolean(next[sectionKey]));
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* localStorage disabled — fine */
      }
      return next;
    });
  }

  useEffect(() => {
    setIdentity(identityFromAuthUser(user));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const emp = await fetchHeaderIdentity();
      if (!cancelled && emp) {
        setIdentity(emp);
      }

      // Pending-approvals badge: shown for any role with the
      // "pendingApprovals" badgeKey on a nav entry (manager + admin today).
      if (hasPermission("leave.approve")) {
        try {
          const approvals = await fetchLeaveApprovals("pending");
          if (cancelled) return;
          setPendingApprovals(approvals.length);
        } catch {
          /* badge stays at 0 if the call fails */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, role, hasPermission, user]);

  const sections = filterNavSections(
    navSectionsForRole(role, buildNav(), hasAnyPermission),
    hasAnyPermission,
  );
  const activeEntryId = useMemo(
    () => resolveActiveEntryId(sections, pathname),
    [sections, pathname],
  );
  const badgeFor = (key?: NavEntry["badgeKey"]): number | null => {
    if (key === "pendingApprovals") return pendingApprovals;
    return null;
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          // On mobile: fixed overlay, full sidebar width, toggleable
          // On desktop: static, collapsible
          "fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 py-2 pb-2",
          "transition-transform lg:transition-[width] duration-200 ease-out",
          "lg:static lg:inset-y-auto lg:left-auto lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "w-[248px]",
          collapsed ? "lg:w-[72px]" : "lg:w-[248px]",
          enterpriseSidebarClass,
        ].join(" ")}
      >
        {/* Logo */}
        <div
          className={[
            "flex items-center h-14 border-b gap-2",
            enterpriseSidebarBorderClass,
            collapsed ? "lg:px-4 lg:justify-center pl-5 pr-4" : "pl-5 pr-4",
          ].join(" ")}
        >
          <div className={collapsed ? "lg:hidden" : ""}><AppLogo /></div>
        </div>

        {/* Nav (sectioned) */}
        <nav
          className={[
            "flex flex-col flex-1 gap-4 overflow-y-auto",
            collapsed ? "lg:p-2 py-[14px] pr-3 pl-0" : "py-[14px] pr-3 pl-0",
          ].join(" ")}
        >
          {sections.map((section) => {
            // On mobile overlay, always show labels even if desktop is collapsed
            const effectiveCollapsed = collapsed && !mobileOpen;
            const isCollapsible = section.collapsible && section.sectionKey;
            const isOpen = isCollapsible
              ? (openSections[section.sectionKey!] ?? false)
              : true;
            const sectionActive = isSectionPathActive(section, pathname);
            const CollapsedIcon = section.collapsedIcon ?? Users;

            return (
              <div key={section.title} className="flex flex-col gap-1">
                {isCollapsible && !effectiveCollapsed ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleSection(section.sectionKey!)}
                    className={[
                      "flex items-center w-full rounded-r-md rounded-l-none text-[10px] gap-2 pl-2.5 pr-2.5 py-1.5 mb-0.5 border-0 cursor-pointer transition-colors",
                      enterpriseSectionToggleClass,
                      sectionActive
                        ? enterpriseSectionToggleActiveClass
                        : "hover:bg-slate-100 hover:text-slate-600",
                    ].join(" ")}
                  >
                    <span className="flex-1 text-left">{section.title}</span>
                    <ChevronDown
                      className={[
                        "shrink-0 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90",
                      ].join(" ")}
                      size={14}
                    />
                  </button>
                ) : isCollapsible && effectiveCollapsed ? (
                  <button
                    type="button"
                    title={section.title}
                    aria-expanded={isOpen}
                    onClick={() => toggleSection(section.sectionKey!)}
                    className={[
                      "flex items-center justify-center rounded-md py-2.5 w-full border-0 cursor-pointer transition-colors",
                      sectionActive
                        ? enterpriseNavActiveCollapsedClass
                        : "text-slate-500 bg-transparent hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <CollapsedIcon size={16} />
                  </button>
                ) : null}

                {(!isCollapsible || isOpen) &&
                  section.entries.map(({ icon: Icon, label, href, badgeKey }) => {
                    const active =
                      formatEntryId(section.title, label) === activeEntryId;
                    const badge = badgeFor(badgeKey);
                    return (
                      <Link
                        key={label}
                        href={href}
                        title={effectiveCollapsed ? label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={navLinkClassName(active, {
                          collapsed: effectiveCollapsed,
                          nested: Boolean(isCollapsible),
                          theme: "enterprise",
                        })}
                      >
                        <Icon size={16} />
                        {!effectiveCollapsed && (
                          <>
                            <span className="flex-1">{label}</span>
                            {badge !== null && badge > 0 && (
                              <span
                                className={[
                                  "inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[20px] h-5 px-1.5",
                                  active
                                    ? "bg-slate-200 text-slate-800"
                                    : "bg-amber-100 text-amber-800",
                                ].join(" ")}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        {/* Footer — logout is now in the header user dropdown only. */}
        {(!collapsed || mobileOpen) && (
          <div className={["border-t p-3", enterpriseSidebarBorderClass].join(" ")}>
            <p className="text-[10px] text-center text-slate-400 m-0">
              iLeads HRMS {APP_VERSION} · {APP_LOCATION}
            </p>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <AppHeader role={role} identity={identity} sessionUser={user} onMobileMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className={["flex-1", enterpriseMainPaddingClass].join(" ")}>{children}</main>
      </div>
    </div>
  );
}
