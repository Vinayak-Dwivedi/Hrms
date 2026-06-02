"use client";

import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  Clock,
  Home,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { signOut } from "@/lib/hrms-client";

interface ManagerSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const PERSONAL_NAV = [
  { label: "Dashboard", href: "/manager/dashboard", icon: Home },
  { label: "My Attendance", href: "/manager/attendance", icon: Clock },
  { label: "Leave", href: "/manager/leave", icon: CalendarDays },
];

const TEAM_NAV = [
  { label: "Team Dashboard", href: "/manager/team-dashboard", icon: LayoutDashboard, badge: null },
  { label: "Approvals", href: "/manager/approvals", icon: CheckSquare, badge: "5" },
];

export default function ManagerSidebar({ collapsed, onToggle }: ManagerSidebarProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
      window.location.href = "/login";
    } catch (e) {
      toast.error((e as Error).message);
      setSigningOut(false);
    }
  }

  return (
    <aside
      className="h-full flex flex-col shrink-0 transition-all duration-300 overflow-hidden"
      style={{ background: "#1a1d2e", width: collapsed ? "64px" : "240px" }}
    >
      {/* Logo + Toggle */}
      <div
        className="flex items-center h-16 border-b px-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <div className="flex flex-col select-none leading-none">
            <span className="text-[18px] font-bold">
              <em className="not-italic" style={{ color: "#e91e8c" }}>i</em>
              <span className="text-white">Leads</span>
            </span>
            <span
              className="text-[8px] font-medium tracking-[0.15em] mt-0.5"
              style={{ color: "#6b7280" }}
            >
              MANAGER PORTAL
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }}
        >
          <ChevronLeft
            size={14}
            className="text-gray-300 transition-transform duration-300"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>

      {/* User */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)", justifyContent: collapsed ? "center" : undefined }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: "#dc143c" }}
        >
          PS
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Priya Sharma</p>
            <p className="text-xs truncate" style={{ color: "#9ca3af" }}>Process Manager</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {/* PERSONAL */}
        <div>
          {!collapsed && (
            <p
              className="text-[10px] font-semibold tracking-widest px-3 mb-1"
              style={{ color: "#4b5563" }}
            >
              PERSONAL
            </p>
          )}
          <div className="space-y-0.5">
            {PERSONAL_NAV.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <a
                  key={href}
                  href={href}
                  className="flex items-center rounded-lg text-sm font-medium transition-colors no-underline"
                  style={{
                    gap: collapsed ? undefined : "12px",
                    padding: collapsed ? "10px 8px" : "10px 12px",
                    justifyContent: collapsed ? "center" : undefined,
                    color: active ? "#e91e8c" : "#9ca3af",
                    background: active ? "rgba(233,30,140,0.15)" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLElement).style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                    }
                  }}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </a>
              );
            })}
          </div>
        </div>

        {/* MY TEAM */}
        <div>
          {!collapsed && (
            <p
              className="text-[10px] font-semibold tracking-widest px-3 mb-1"
              style={{ color: "#4b5563" }}
            >
              MY TEAM
            </p>
          )}
          <div className="space-y-0.5">
            {TEAM_NAV.map(({ label, href, icon: Icon, badge }) => {
              const active = isActive(href);
              const isTeamDashboard = href === "/manager";
              return (
                <a
                  key={href}
                  href={href}
                  className="flex items-center rounded-lg text-sm font-medium transition-colors no-underline"
                  style={{
                    gap: collapsed ? undefined : "12px",
                    padding: collapsed ? "10px 8px" : "10px 12px",
                    justifyContent: collapsed ? "center" : undefined,
                    color: active ? (isTeamDashboard ? "#ffffff" : "#e91e8c") : "#9ca3af",
                    background: active
                      ? isTeamDashboard
                        ? "#dc143c"
                        : "rgba(233,30,140,0.15)"
                      : undefined,
                    borderRadius: active && isTeamDashboard ? "20px" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLElement).style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                    }
                  }}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="flex-1">{label}</span>}
                  {!collapsed && badge && (
                    <span
                      className="text-[10px] font-bold text-white rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "#f97316", minWidth: "18px", height: "18px", padding: "0 5px" }}
                    >
                      {badge}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div
        className="px-2 py-3 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          title="Sign out"
          className="flex items-center w-full rounded-lg text-sm font-medium transition-colors"
          style={{
            gap: collapsed ? undefined : "12px",
            padding: collapsed ? "10px 8px" : "10px 12px",
            justifyContent: collapsed ? "center" : undefined,
            color: "#fca5a5",
            background: "transparent",
            border: "none",
            cursor: signingOut ? "wait" : "pointer",
            opacity: signingOut ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(220,38,38,0.12)";
            (e.currentTarget as HTMLElement).style.color = "#fecaca";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "#fca5a5";
          }}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{signingOut ? "Signing out…" : "Log out"}</span>}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "#4b5563" }}>
            iLeads HRMS v2.4 · Dehradun
          </p>
        </div>
      )}
    </aside>
  );
}
