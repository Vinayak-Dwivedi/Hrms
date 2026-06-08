"use client";

import {
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  Menu,
  Network,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/dashboard";
import { APP_LOCATION, APP_VERSION } from "@/lib/dashboard";
import { fetchCurrentEmployee, signOut } from "@/lib/hrms-client";

// ── nav config ───────────────────────────────────────────────────────────────
type NavEntry = {
  icon: typeof Briefcase;
  label: string;
  href: string;
  also?: string[];
};

export const HR_NAV: NavEntry[] = [
  { icon: Briefcase, label: "Dashboard", href: "/hr/dashboard" },
  { icon: Clock, label: "Attendance", href: "/hr/attendance" },
  { icon: CalendarIcon, label: "Leave", href: "/hr/leave" },
];

// ── Org Setup collapsible group ──────────────────────────────────────────────
const ORG_SETUP_BASE = "/hr/org-setup";
const ORG_SETUP_CHILDREN: NavEntry[] = [
  { icon: MapPin, label: "Location", href: "/hr/org-setup/location" },
  { icon: Building2, label: "Department", href: "/hr/org-setup/department" },
  { icon: BadgeCheck, label: "Designation", href: "/hr/org-setup/designation" },
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
  "/hr/dashboard": "Dashboard",
  "/hr/attendance": "Attendance",
  "/hr/leave": "Leave",
  "/hr/org-setup/location": "Org Setup / Location",
  "/hr/org-setup/department": "Org Setup / Department",
  "/hr/org-setup/designation": "Org Setup / Designation",
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

const COLLAPSE_KEY = "hrms.hr.sidebar.collapsed";

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

export default function HRShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const inOrgSetup = pathname.startsWith(ORG_SETUP_BASE);
  const [orgOpen, setOrgOpen] = useState(false);

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  // Keep the group expanded whenever the user is on an Org Setup route.
  useEffect(() => {
    if (inOrgSetup) setOrgOpen(true);
  }, [inOrgSetup]);

  function toggleOrg() {
    const next = !orgOpen;
    setOrgOpen(next);
    // Opening the group jumps to its default route (Location).
    if (next && !inOrgSetup) router.push("/hr/org-setup/location");
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* localStorage disabled */
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
        /* error handled by page */
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
    <div className="flex" style={{ minHeight: "100vh", background: "#f5f6fa" }}>
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
                HR PORTAL
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

        {/* Nav */}
        <nav
          className="flex flex-col gap-1 flex-1"
          style={{ padding: collapsed ? "10px 10px" : "8px 12px" }}
        >
          {HR_NAV.map(({ icon: Icon, label, href }) => {
            const entry = HR_NAV.find((e) => e.label === label);
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

          {/* Org Setup — collapsible group */}
          {collapsed ? (
            <a
              href="/hr/org-setup/location"
              title="Org Setup"
              className="flex items-center justify-center rounded-xl text-[13px] font-medium no-underline"
              style={{
                color: inOrgSetup ? "#fff" : "#4b5563",
                background: inOrgSetup
                  ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                  : "transparent",
                padding: "10px 0",
              }}
            >
              <Network size={16} />
            </a>
          ) : (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={toggleOrg}
                className="flex items-center rounded-xl text-[13px] font-medium w-full"
                style={{
                  color: inOrgSetup ? "#be185d" : "#4b5563",
                  background: inOrgSetup ? "#fff1f2" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 12px",
                  gap: 12,
                }}
              >
                <Network size={16} />
                <span className="flex-1 text-left">Org Setup</span>
                <ChevronRight
                  size={14}
                  style={{
                    transform: orgOpen ? "rotate(90deg)" : "none",
                    transition: "transform 160ms ease",
                  }}
                />
              </button>

              {orgOpen && (
                <div className="flex flex-col gap-1 mt-1">
                  {ORG_SETUP_CHILDREN.map(({ icon: Icon, label, href }) => {
                    const active =
                      pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <a
                        key={label}
                        href={href}
                        className="flex items-center rounded-xl text-[13px] font-medium no-underline"
                        style={{
                          color: active ? "#fff" : "#4b5563",
                          background: active
                            ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
                            : "transparent",
                          padding: "9px 12px 9px 36px",
                          gap: 10,
                        }}
                      >
                        <Icon size={15} />
                        {label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer */}
      
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        <header
          className="flex items-center justify-between px-6"
          style={{ height: 64 }}
        >
          <nav className="flex items-center gap-2 text-sm">
            <span style={{ color: "#9ca3af" }}>HR</span>
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
