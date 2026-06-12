"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Menu,
  Network,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/dashboard";
import { APP_LOCATION, APP_VERSION } from "@/lib/dashboard";
import { useAuth } from "@/lib/auth-context";
import { isNavActive, navLinkClassName } from "@/lib/nav-active";
import { fetchCurrentEmployee, signOut } from "@/lib/hrms-client";

// ── nav config ───────────────────────────────────────────────────────────────
type NavEntry = {
  icon: typeof MapPin;
  label: string;
  href: string;
  also?: string[];
  requiredPermission?: string | string[];
};

// ── Org Setup collapsible group ──────────────────────────────────────────────
const ORG_SETUP_BASE = "/hr/org-setup";
const ORG_SETUP_CHILDREN: NavEntry[] = [
  {
    icon: MapPin,
    label: "Location",
    href: "/hr/org-setup/location",
    requiredPermission: "onboarding.manage",
  },
  {
    icon: Building2,
    label: "Department",
    href: "/hr/org-setup/department",
    requiredPermission: "onboarding.manage",
  },
  {
    icon: BadgeCheck,
    label: "Designation",
    href: "/hr/org-setup/designation",
    requiredPermission: "onboarding.manage",
  },
  {
    icon: Network,
    label: "Department Hierarchy",
    href: "/hr/org-setup/department-hierarchy",
    requiredPermission: "onboarding.manage",
  },
];

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

// ── breadcrumb derived from the URL ──────────────────────────────────────────
const BREADCRUMB_LABELS: Record<string, string> = {
  "/hr/org-setup/location": "Org Setup / Location",
  "/hr/org-setup/department": "Org Setup / Department",
  "/hr/org-setup/designation": "Org Setup / Designation",
  "/hr/org-setup/department-hierarchy": "Org Setup / Department Hierarchy",
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
  const { hasAnyPermission } = useAuth();

  const visibleOrgChildren = ORG_SETUP_CHILDREN.filter((e) =>
    navEntryAllowed(e, hasAnyPermission),
  );

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
          <Link
            href="/dashboard"
            title={collapsed ? "Back to HRMS" : undefined}
            className={navLinkClassName(false, { collapsed })}
          >
            <ArrowLeft size={16} />
            {!collapsed && "Back to HRMS"}
          </Link>

          {/* Org Setup — collapsible group */}
          {visibleOrgChildren.length > 0 &&
            (collapsed ? (
              <Link
                href={visibleOrgChildren[0]?.href ?? "/hr/org-setup/location"}
                title="Org Setup"
                aria-current={inOrgSetup ? "page" : undefined}
                className={navLinkClassName(inOrgSetup, { collapsed })}
              >
                <Network size={16} />
              </Link>
            ) : (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={toggleOrg}
                  className={[
                    "flex items-center rounded-xl text-[13px] font-medium w-full border-0 cursor-pointer px-3 py-2.5 gap-3",
                    inOrgSetup
                      ? "active text-[#be185d] bg-[#fff1f2]"
                      : "text-gray-600 bg-transparent hover:bg-gray-50 hover:text-gray-900",
                  ].join(" ")}
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
                    {visibleOrgChildren.map((entry) => {
                      const { icon: Icon, label, href } = entry;
                      const active = isNavActive(entry, pathname);
                      return (
                        <Link
                          key={label}
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={navLinkClassName(active, { hrNested: true })}
                        >
                          <Icon size={15} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
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
