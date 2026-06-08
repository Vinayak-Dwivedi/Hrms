"use client";

import { CalendarDays, ChevronLeft, Clock, Home, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Employee, NavItem } from "@/lib/dashboard";
import { signOut } from "@/lib/hrms-client";

interface SidebarProps {
  employee: Employee;
  navItems: NavItem[];
  version: string;
  location: string;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: Home,
  Attendance: Clock,
  Leave: CalendarDays,
};

export default function Sidebar({
  employee,
  navItems,
  version,
  location,
  collapsed,
  onToggle,
}: SidebarProps) {
  const [signingOut, setSigningOut] = useState(false);
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
      style={{
        background: "#1a1d2e",
        width: collapsed ? "64px" : "240px",
      }}
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
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{
            width: "28px",
            height: "28px",
            background: "rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
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
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          justifyContent: collapsed ? "center" : undefined,
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: "#4b5563" }}
        >
          {employee.initials}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{employee.name}</p>
            <p className="text-xs truncate" style={{ color: "#9ca3af" }}>
              {employee.role}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.label] ?? Home;
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center rounded-lg text-sm font-medium transition-colors no-underline"
              style={{
                gap: collapsed ? undefined : "12px",
                padding: collapsed ? "10px 8px" : "10px 12px",
                justifyContent: collapsed ? "center" : undefined,
                color: item.active ? "#e91e8c" : "#9ca3af",
                background: item.active ? "rgba(233,30,140,0.15)" : undefined,
              }}
              onMouseEnter={(e) => {
                if (!item.active) {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!item.active) {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                }
              }}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

   
    

      {/* Footer */}
      {!collapsed && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs" style={{ color: "#4b5563" }}>
            iLeads HRMS {version} · {location}
          </p>
        </div>
      )}
    </aside>
  );
}
