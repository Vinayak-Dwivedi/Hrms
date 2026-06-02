"use client";

import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  FileText,
  LogOut,
  Menu,
  Receipt,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_LOCATION, APP_VERSION } from "@/lib/dashboard";
import { fetchCurrentEmployee, signOut } from "@/lib/hrms-client";
import type { Employee } from "@/lib/dashboard";

// ── nav config ───────────────────────────────────────────────────────────────
type NavEntry = {
  icon: typeof Briefcase;
  label: string;
  href: string;
  also?: string[];
};

export const EMPLOYEE_NAV: NavEntry[] = [
  { icon: Briefcase, label: "Dashboard", href: "/dashboard" },
  { icon: Clock, label: "Attendance", href: "/attendance" },
  { icon: CalendarIcon, label: "Leave", href: "/leave", also: ["/leave/new"] },
  { icon: FileText, label: "My Requests", href: "/requests" },
  { icon: Receipt, label: "My Payslips", href: "/payslips" },
  { icon: Users, label: "Directory", href: "/directory" },
  { icon: BookOpen, label: "L&D Portal", href: "/lnd" },
  { icon: FileText, label: "Company Policies", href: "/policies" },
];

function isNavActive(entry: NavEntry, pathname: string): boolean {
  if (pathname === entry.href) return true;
  if (pathname.startsWith(`${entry.href}/`)) return true;
  if (entry.also?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return false;
}

// ── breadcrumb derived from the URL ──────────────────────────────────────────
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

// ── header avatar (initials only — no hardcoded photo asset) ────────────────

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
      className="rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: 34,
        height: 34,
        background: showImg ? "#fff" : "#7c3aed",
        fontSize: 12,
        letterSpacing: 0.5,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          width={34}
          height={34}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ── persistence for collapsed state ──────────────────────────────────────────
const COLLAPSE_KEY = "hrms.sidebar.collapsed";

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

// ── the shell ────────────────────────────────────────────────────────────────

export default function EmployeeShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
        const emp = await fetchCurrentEmployee();
        if (cancelled) return;
        setEmployee(emp);
      } catch {
        /* page surfaces fetch errors itself */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  const initials = employee?.initials ?? "··";
  const crumb = breadcrumbFor(pathname);
  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <div
      className="flex"
      style={{ minHeight: "100vh", background: "#f5f6fa" }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: sidebarWidth,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          transition: "width 180ms ease",
        }}
      >
        {/* Logo + hamburger */}
        <div
          className="flex items-center"
          style={{
            height: 72,
            padding: collapsed ? "0 16px" : "0 16px 0 20px",
            borderBottom: "1px solid #f3f4f6",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
          }}
        >
          {!collapsed && (
            <div>
              <p
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#dc143c",
                  lineHeight: 1,
                }}
              >
                iLeads
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.5,
                  marginTop: 4,
                }}
              >
                EMPLOYEE PORTAL
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be185d",
              cursor: "pointer",
            }}
          >
            <Menu size={15} />
          </button>
        </div>

        {/*
          Profile card removed — identity lives in the header (top-right) and
          the dashboard's Punch hero card. The block is intentionally gone,
          not commented, to keep this file clean.
        */}

        {/* Nav */}
        <nav
          className="flex flex-col gap-1 flex-1"
          style={{ padding: collapsed ? "10px 10px" : "8px 12px" }}
        >
          {EMPLOYEE_NAV.map(({ icon: Icon, label, href }) => {
            const entry = EMPLOYEE_NAV.find((e) => e.label === label);
            const active = entry ? isNavActive(entry, pathname) : false;
            return (
              <a
                key={label}
                href={href}
                title={collapsed ? label : undefined}
                className="flex items-center rounded-xl text-[13px] font-medium no-underline"
                style={{
                  color: active ? "#fff" : "#4b5563",
                  background: active
                    ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                    : "transparent",
                  padding: collapsed ? "10px 0" : "10px 12px",
                  gap: 12,
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <Icon size={16} />
                {!collapsed && label}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #f3f4f6",
            padding: collapsed ? "12px 10px" : "12px 12px",
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Log out" : undefined}
            className="flex items-center rounded-xl text-[13px] font-semibold w-full"
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              border: "none",
              cursor: "pointer",
              padding: collapsed ? "10px 0" : "10px 12px",
              gap: 12,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <LogOut size={16} />
            {!collapsed && "Log out"}
          </button>
          {!collapsed && (
            <p
              className="text-[10px] mt-3 text-center"
              style={{ color: "#9ca3af" }}
            >
              iLeads HRMS {APP_VERSION} · {APP_LOCATION}
            </p>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        <header
          className="flex items-center justify-between px-6"
          style={{ height: 64 }}
        >
          <nav className="flex items-center gap-2 text-sm">
            <span style={{ color: "#9ca3af" }}>Employee</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span className="font-semibold text-gray-800">{crumb}</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex items-center justify-center rounded-full bg-white"
              style={{
                width: 36,
                height: 36,
                border: "1px solid #e5e7eb",
              }}
              aria-label="Notifications"
            >
              <Bell size={17} style={{ color: "#6b7280" }} />
              <span
                className="absolute rounded-full"
                style={{
                  top: 8,
                  right: 8,
                  width: 7,
                  height: 7,
                  background: "#ec4899",
                }}
              />
            </button>
            <div className="flex items-center gap-2">
              <HeaderAvatar initials={initials} src={employee?.avatarUrl} />
              <span className="text-sm font-semibold text-gray-700">
                {employee?.name ?? "—"}
              </span>
              <ChevronDown size={14} style={{ color: "#9ca3af" }} />
            </div>
          </div>
        </header>

        <main className="px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
