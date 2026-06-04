"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_LOCATION, APP_VERSION } from "@/lib/dashboard";
import {
  fetchCurrentEmployee,
  fetchCurrentManager,
  fetchLeaveApprovals,
  signOut,
} from "@/lib/hrms-client";
import type { Employee } from "@/lib/dashboard";
import type { Role } from "@/lib/roles";

// ─── nav model ──────────────────────────────────────────────────────────────
type NavEntry = {
  icon: LucideIcon;
  label: string;
  href: string;
  also?: string[];
  badgeKey?: "pendingApprovals";
};

type NavSection = { title: string; entries: NavEntry[] };

// Single source of truth for what each role sees. Sections render in order.
function buildNav(role: Role): NavSection[] {
  if (role === "manager") {
    return [
      {
        title: "PERSONAL",
        entries: [
          { icon: Briefcase, label: "Dashboard", href: "/manager/dashboard" },
          { icon: Clock, label: "My Attendance", href: "/manager/attendance" },
          { icon: CalendarIcon, label: "Leave", href: "/manager/leave" },
        ],
      },
      {
        title: "MY TEAM",
        entries: [
          {
            icon: LayoutDashboard,
            label: "Team Dashboard",
            href: "/manager/team-dashboard",
            also: ["/manager/team-attendance-report"],
          },
          {
            icon: CheckSquare,
            label: "Approvals",
            href: "/manager/approvals",
            badgeKey: "pendingApprovals",
          },
        ],
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        title: "PERSONAL",
        entries: [
          { icon: Briefcase, label: "Dashboard", href: "/admin/dashboard" },
          { icon: Clock, label: "My Attendance", href: "/admin/attendance" },
          { icon: CalendarIcon, label: "Leave", href: "/admin/leave" },
        ],
      },
      {
        title: "ADMINISTRATION",
        entries: [
          { icon: Users, label: "Employees", href: "/admin/employees" },
          {
            icon: CheckSquare,
            label: "Approvals",
            href: "/admin/approvals",
            badgeKey: "pendingApprovals",
          },
          {
            icon: LayoutDashboard,
            label: "Org Dashboard",
            href: "/admin/org",
          },
          { icon: BarChart3, label: "Reports", href: "/admin/reports" },
        ],
      },
    ];
  }

  return [
    {
      title: "PERSONAL",
      entries: [
        { icon: Briefcase, label: "Dashboard", href: "/dashboard" },
        { icon: Clock, label: "Attendance", href: "/attendance" },
        {
          icon: CalendarIcon,
          label: "Leave",
          href: "/leave",
          also: ["/leave/new"],
        },
        { icon: FileText, label: "My Requests", href: "/requests" },
        { icon: Receipt, label: "My Payslips", href: "/payslips" },
        { icon: Users, label: "Directory", href: "/directory" },
        { icon: BookOpen, label: "L&D Portal", href: "/lnd" },
        { icon: FileText, label: "Company Policies", href: "/policies" },
      ],
    },
  ];
}

function isNavActive(entry: NavEntry, pathname: string): boolean {
  if (pathname === entry.href) return true;
  if (pathname.startsWith(`${entry.href}/`)) return true;
  if (entry.also?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return false;
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
  "/lnd": "L&D Portal",
  "/policies": "Company Policies",
  "/holidays": "Holidays",
  "/manager/dashboard": "Dashboard",
  "/manager/attendance": "My Attendance",
  "/manager/leave": "Leave",
  "/manager/team-dashboard": "Team Dashboard",
  "/manager/team-attendance-report": "Team Attendance",
  "/manager/approvals": "Approvals",
  "/admin/dashboard": "Dashboard",
  "/admin/attendance": "My Attendance",
  "/admin/leave": "Leave",
  "/admin/employees": "Employees",
  "/admin/approvals": "Approvals",
  "/admin/org": "Org Dashboard",
  "/admin/reports": "Reports",
};

function breadcrumbFor(pathname: string): string {
  const fromTable = BREADCRUMB_LABELS[pathname];
  if (fromTable) return fromTable;
  const derived = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" / ");
  return derived || "Dashboard";
}

function rootLabelFor(role: Role): string {
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  return "Employee";
}

function portalSubtitleFor(role: Role): string {
  if (role === "manager") return "MANAGER PORTAL";
  if (role === "admin") return "ADMIN PORTAL";
  return "EMPLOYEE PORTAL";
}

// ─── header avatar ──────────────────────────────────────────────────────────
function HeaderAvatar({
  initials,
  src,
}: {
  initials: string;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <div
      className={[
        "rounded-full overflow-hidden flex items-center justify-center shrink-0",
        "w-[34px] h-[34px] text-[12px] font-bold text-white tracking-wide",
        showImg ? "bg-white" : "bg-violet-600",
      ].join(" ")}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          width={34}
          height={34}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover block"
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ─── collapse persistence ───────────────────────────────────────────────────
const COLLAPSE_KEY = "hrms.sidebar.collapsed";

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

// ─── the shell ──────────────────────────────────────────────────────────────
export default function AppShell({
  children,
  role = "employee",
}: {
  children: React.ReactNode;
  role?: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [identity, setIdentity] = useState<Employee | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

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
    let cancelled = false;
    (async () => {
      try {
        const emp =
          role === "manager"
            ? await fetchCurrentManager()
            : await fetchCurrentEmployee();
        if (cancelled) return;
        setIdentity(emp);
      } catch {
        /* page surfaces fetch errors itself */
      }

      // Pending-approvals badge: shown for any role with the
      // "pendingApprovals" badgeKey on a nav entry (manager + admin today).
      if (role === "manager" || role === "admin") {
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
  }, [pathname, role]);

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  const initials = identity?.initials ?? "··";
  const crumb = breadcrumbFor(pathname);

  const sections = buildNav(role);
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
              <p className="text-[19px] font-bold leading-none text-[#dc143c]">
                iLeads
              </p>
              <p className="text-[10px] tracking-[1.5px] mt-1 text-gray-400">
                {portalSubtitleFor(role)}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#be185d] cursor-pointer"
          >
            <Menu size={15} />
          </button>
        </div>

        {/* Nav (sectioned) */}
        <nav
          className={[
            "flex flex-col flex-1 gap-[18px]",
            collapsed ? "p-[10px]" : "px-3 py-3",
          ].join(" ")}
        >
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              {!collapsed && (
                <p className="text-[10px] font-bold tracking-widest text-gray-400 px-2 mb-1">
                  {section.title}
                </p>
              )}
              {section.entries.map(({ icon: Icon, label, href, badgeKey, also }) => {
                const active = isNavActive(
                  { icon: Icon, label, href, also },
                  pathname,
                );
                const badge = badgeFor(badgeKey);
                return (
                  <a
                    key={label}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={[
                      "flex items-center rounded-xl text-[13px] font-medium no-underline gap-3",
                      collapsed ? "py-2.5 justify-center" : "px-3 py-2.5",
                      active
                        ? "text-white bg-gradient-to-br from-[#ec4899] to-[#be185d]"
                        : "text-gray-600 bg-transparent",
                    ].join(" ")}
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
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className={[
            "border-t border-gray-100",
            collapsed ? "p-[10px]" : "p-3",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Log out" : undefined}
            className={[
              "flex items-center rounded-xl text-[13px] font-semibold w-full gap-3 bg-[#fee2e2] text-[#dc2626] cursor-pointer border-0",
              collapsed ? "py-2.5 justify-center" : "px-3 py-2.5",
            ].join(" ")}
          >
            <LogOut size={16} />
            {!collapsed && "Log out"}
          </button>
          {!collapsed && (
            <p className="text-[10px] mt-3 text-center text-gray-400">
              iLeads HRMS {APP_VERSION} · {APP_LOCATION}
            </p>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between px-6 h-16">
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{rootLabelFor(role)}</span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-800">{crumb}</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200"
              aria-label="Notifications"
            >
              <Bell size={17} className="text-gray-500" />
              <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-[#ec4899]" />
            </button>
            <div className="flex items-center gap-2">
              <HeaderAvatar initials={initials} src={identity?.avatarUrl} />
              <span className="text-sm font-semibold text-gray-700">
                {identity?.name ?? "—"}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </header>

        <main className="px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
