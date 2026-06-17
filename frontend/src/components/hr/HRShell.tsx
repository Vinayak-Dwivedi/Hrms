"use client";

import { ArrowLeft, Bell, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/dashboard";
import { navLinkClassName } from "@/lib/nav-active";
import { fetchCurrentEmployee } from "@/lib/hrms-client";

function breadcrumbFor(pathname: string): string {
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

  const initials = employee?.initials ?? "··";
  const crumb = breadcrumbFor(pathname);
  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <div className="flex" style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: sidebarWidth,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          transition: "width 180ms ease",
        }}
      >
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

        <nav
          className="flex flex-col gap-1 flex-1"
          style={{ padding: collapsed ? "10px 10px" : "8px 12px" }}
        >
          <Link
            href="/dashboard"
            title={collapsed ? "Back to HRMS" : undefined}
            className={navLinkClassName(false, { collapsed, theme: "light" })}
          >
            <ArrowLeft size={16} />
            {!collapsed && "Back to HRMS"}
          </Link>
        </nav>
      </aside>

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
