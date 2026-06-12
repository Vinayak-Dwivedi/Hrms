"use client";

import {
  Briefcase,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Network,
  Receipt,
  Settings,
  Shield,
  ShieldPlus,
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
      requiredPermission: "employees.view",
    },
    {
      icon: Network,
      label: "Hierarchy",
      href: "/departments/hierarchy",
      requiredPermission: "employees.view",
    },
    {
      icon: UserPlus,
      label: "Add Employee",
      href: "/add-employee",
      requiredPermission: "employees.create",
    },
    {
      icon: ShieldPlus,
      label: "Add Permission",
      href: "/add-permission",
      requiredPermission: "admin.permissions",
    },
    {
      icon: Shield,
      label: "User Roles",
      href: "/user-roles",
      requiredPermission: "admin.roles",
    },
  ],
};

const SETTINGS_HREFS = [
  "/locations",
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
    {
      icon: MapPin,
      label: "Location",
      href: "/locations",
      requiredPermission: "admin.roles",
    },
    { icon: CalendarIcon, label: "Leave Policy", href: "/leave-policy" },
    {
      icon: CalendarIcon,
      label: "Holiday Policy",
      href: "/holiday-calendars",
      requiredPermission: "admin.roles",
    },
    {
      icon: CalendarIcon,
      label: "Weekly Off",
      href: "/weekly-off",
      requiredPermission: "admin.roles",
    },
    {
      icon: Receipt,
      label: "Leave Credits",
      href: "/leave-credits",
      requiredPermission: "admin.roles",
    },
    {
      icon: LogOut,
      label: "Offboarding",
      href: "/offboarding",
      requiredPermission: "admin.roles",
    },
  ],
};

function navEntryAllowed(
  entry: NavEntry,
  hasAnyPermission: (codes: string[]) => boolean,
): boolean {
  if (!entry.requiredPermission) return true;
  const codes = Array.isArray(entry.requiredPermission)
    ? entry.requiredPermission
    : [entry.requiredPermission];
  return hasAnyPermission(codes);
}

function filterNavSections(
  sections: NavSection[],
  hasAnyPermission: (codes: string[]) => boolean,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((e) => navEntryAllowed(e, hasAnyPermission)),
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
        requiredPermission: "attendance.view",
      },
      {
        icon: CalendarIcon,
        label: "Leave",
        href: "/leave",
        also: ["/leave/new"],
        requiredPermission: "leave.view",
      },
      {
        icon: FileText,
        label: "My Requests",
        href: "/requests",
        requiredPermission: "leave.view",
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
        icon: LayoutDashboard,
        label: "Team Dashboard",
        href: "/manager/team-dashboard",
        requiredPermission: "leave.approve",
      },
      {
        icon: Clock,
        label: "Team Attendance",
        href: "/manager/team-attendance-report",
        requiredPermission: "leave.approve",
      },
      {
        icon: CheckSquare,
        label: "Approvals",
        href: "/manager/approvals",
        badgeKey: "pendingApprovals",
        requiredPermission: "leave.approve",
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
  "/requests": "My Requests",
  "/payslips": "My Payslips",
  "/directory": "Directory",
  "/holidays": "Holidays",
  "/manager/team-dashboard": "Team Dashboard",
  "/manager/team-attendance-report": "Team Attendance",
  "/manager/approvals": "Approvals",
  "/departments/hierarchy": "Departments / Hierarchy",
  "/add-employee": "Add Employee",
  "/add-permission": "Add Permission",
  "/user-roles": "User Roles",
  "/locations": "Location",
  "/leave-policy": "Leave Policy",
  "/employees": "Employees",
  "/employees/bulk-upload": "Bulk Upload",
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
  return "Employee";
}

function portalSubtitleFor(role: Role): string {
  if (role === "manager") return "";
  if (role === "admin") return "";
  return "";
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
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

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

  const sections = filterNavSections(buildNav(), hasAnyPermission);
  const activeEntryId = useMemo(
    () => resolveActiveEntryId(sections, pathname),
    [sections, pathname],
  );
  const badgeFor = (key?: NavEntry["badgeKey"]): number | null => {
    if (key === "pendingApprovals") return pendingApprovals;
    return null;
  };

  return (
    <div className="flex min-h-screen bg-[#f5f6fa]">
      {/* Sidebar */}
      <aside
        className={[
          "flex flex-col shrink-0 bg-white border-r border-gray-200 transition-[width] duration-200 ease-out",
          collapsed ? "w-[72px]" : "w-[240px]",
        ].join(" ")}
      >
        {/* Logo + hamburger */}
        <div
          className={[
            "flex items-center h-[72px] border-b border-gray-100 gap-2",
            collapsed ? "px-4 justify-center" : "pl-5 pr-4 justify-between",
          ].join(" ")}
        >
          {!collapsed && (
            <div>
              <AppLogo />
              <p className="text-[10px] tracking-[1.5px] mt-1 text-gray-400">
                {portalSubtitleFor(role)}
              </p>
            </div>
          )}
          {/* <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#be185d] cursor-pointer"
          >
            <Menu size={15} />
          </button> */}
        </div>

        {/* Nav (sectioned) */}
        <nav
          className={[
            "flex flex-col flex-1 gap-[18px]",
            collapsed ? "p-[10px]" : "px-3 py-3",
          ].join(" ")}
        >
          {sections.map((section) => {
            const sectionKey = section.sectionKey ?? section.title;
            const isCollapsible = section.collapsible && section.sectionKey;
            const isOpen = isCollapsible
              ? (openSections[section.sectionKey!] ?? false)
              : true;
            const sectionActive = isSectionPathActive(section, pathname);
            const CollapsedIcon = section.collapsedIcon ?? Users;

            return (
              <div key={section.title} className="flex flex-col gap-1">
                {isCollapsible && !collapsed ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleSection(section.sectionKey!)}
                    className={[
                      "flex items-center w-full rounded-lg text-[10px] font-bold tracking-widest gap-2 px-2 py-1.5 mb-0.5 border-0 cursor-pointer transition-colors",
                      sectionActive
                        ? "text-[#be185d] bg-[#fff1f2]"
                        : "text-gray-400 bg-transparent hover:text-gray-600 hover:bg-gray-50",
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
                ) : isCollapsible && collapsed ? (
                  <button
                    type="button"
                    title={section.title}
                    aria-expanded={isOpen}
                    onClick={() => toggleSection(section.sectionKey!)}
                    className={[
                      "flex items-center justify-center rounded-xl py-2.5 w-full border-0 cursor-pointer transition-colors",
                      sectionActive
                        ? "text-white bg-gradient-to-br from-[#ec4899] to-[#be185d]"
                        : "text-gray-600 bg-transparent hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <CollapsedIcon size={16} />
                  </button>
                ) : (
                  !collapsed && (
                    <p className="text-[10px] font-bold tracking-widest text-gray-400 px-2 mb-1">
                      {section.title}
                    </p>
                  )
                )}

                {(!isCollapsible || isOpen) &&
                  section.entries.map(({ icon: Icon, label, href, badgeKey }) => {
                    const active =
                      formatEntryId(section.title, label) === activeEntryId;
                    const badge = badgeFor(badgeKey);
                    return (
                      <Link
                        key={label}
                        href={href}
                        title={collapsed ? label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={navLinkClassName(active, {
                          collapsed,
                          nested: Boolean(isCollapsible),
                        })}
                      >
                        <Icon size={16} />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{label}</span>
                            {badge !== null && badge > 0 && (
                              <span
                                className={[
                                  "inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[20px] h-5 px-1.5",
                                  active
                                    ? "bg-white/25 text-white"
                                    : "bg-[#fed7aa] text-[#9a3412]",
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
        {!collapsed && (
          <div className="border-t border-gray-100 p-3">
            <p className="text-[10px] text-center text-gray-400">
              iLeads HRMS {APP_VERSION} · {APP_LOCATION}
            </p>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        <AppHeader role={role} identity={identity} sessionUser={user} />
        <main className="px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
