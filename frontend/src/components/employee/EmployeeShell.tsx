"use client";

import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  LogOut,
  Receipt,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_LOCATION, APP_VERSION } from "@/lib/dashboard";
import {
  fetchCurrentEmployee,
  fetchTodayAttendance,
  signOut,
  type LoggedInUser as _LoggedInUser,
} from "@/lib/hrms-client";
import type {
  AttendanceRecord,
  Employee,
} from "@/lib/dashboard";

// ── nav config ───────────────────────────────────────────────────────────────
// The single source of truth for sidebar items. Order = display order.
// `match` is used to highlight the active entry — a path matches if it
// equals the href, starts with `${href}/`, or is listed in `also`.
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

// ── small avatar primitives ──────────────────────────────────────────────────

function SidebarAvatar({ initials }: { initials: string }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: 56,
        height: 56,
        background:
          "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        fontSize: 18,
        letterSpacing: 0.5,
      }}
    >
      {initials}
    </div>
  );
}

function HeaderAvatar({ initials }: { initials: string }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: 32,
        height: 32,
        background: "#7c3aed",
        fontSize: 12,
        letterSpacing: 0.5,
      }}
    >
      {initials}
    </div>
  );
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
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [emp, att] = await Promise.all([
          fetchCurrentEmployee(),
          fetchTodayAttendance(),
        ]);
        if (cancelled) return;
        setEmployee(emp);
        setAttendance(att);
      } catch {
        // The page itself will surface fetch errors; the shell stays usable
        // with placeholder text.
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

  return (
    <div
      className="flex"
      style={{ minHeight: "100vh", background: "#f5f6fa" }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: 240,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <div
          className="flex items-center justify-between px-5"
          style={{ height: 72, borderBottom: "1px solid #f3f4f6" }}
        >
          <div>
            <p
              style={{
                fontSize: 18,
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
        </div>

        <div className="px-5 py-5 flex flex-col items-center text-center">
          <SidebarAvatar initials={initials} />
          <p
            className="text-[14px] font-semibold text-gray-900 mt-3 leading-tight"
            style={{ minHeight: 18 }}
          >
            {employee?.name ?? "Loading…"}
          </p>
          <p className="text-[12px] text-gray-500 leading-tight">
            {employee?.role ?? ""}
          </p>
          {employee?.employeeId && (
            <div
              className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "#fff1f2", color: "#be185d" }}
            >
              {employee.employeeId}
            </div>
          )}
          {attendance && (
            <div
              className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "#dcfce7", color: "#166534" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: attendance.punchIn ? "#16a34a" : "#9ca3af",
                }}
              />
              {attendance.punchIn ? "CHECKED IN" : "CHECKED OUT"}
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 px-3 flex-1">
          {EMPLOYEE_NAV.map(({ icon: Icon, label, href }) => {
            const entry = EMPLOYEE_NAV.find((e) => e.label === label);
            const active = entry ? isNavActive(entry, pathname) : false;
            return (
              <a
                key={label}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium no-underline"
                style={{
                  color: active ? "#fff" : "#4b5563",
                  background: active
                    ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                    : "transparent",
                }}
              >
                <Icon size={16} />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="px-3 py-4" style={{ borderTop: "1px solid #f3f4f6" }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              border: "none",
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
          <p
            className="text-[10px] mt-3 text-center"
            style={{ color: "#9ca3af" }}
          >
            iLeads HRMS {APP_VERSION} · {APP_LOCATION}
          </p>
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
              <HeaderAvatar initials={initials} />
              <span className="text-sm font-semibold text-gray-700">
                {employee?.name ?? "—"}
              </span>
            </div>
          </div>
        </header>

        <main className="px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
