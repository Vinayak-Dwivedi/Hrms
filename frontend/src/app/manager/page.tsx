"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import ManagerSidebar from "@/components/manager/ManagerSidebar";
import PunchCard from "@/components/dashboard/PunchCard";
import LeaveBalance from "@/components/dashboard/LeaveBalance";
import UpcomingHolidays from "@/components/dashboard/UpcomingHolidays";
import {
  mockManager,
  mockAttendance,
  mockLeaveBalance,
  mockHolidays,
} from "@/lib/dashboard";

const ROLE_ROUTES: Record<string, string> = {
  Employee: "/dashboard",
  Manager: "/manager/dashboard",
  HR: "/hr/dashboard",
};

export default function ManagerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeRole = pathname.startsWith("/manager")
    ? "Manager"
    : pathname.startsWith("/hr")
    ? "HR"
    : "Employee";

  function handleRoleSwitch(role: string) {
    console.log("[RoleSwitcher] clicked:", role, "→", ROLE_ROUTES[role]);
    router.push(ROLE_ROUTES[role]);
  }

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "#f8f9fb" }}>
      <ManagerSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="flex items-center justify-between px-6 bg-white shrink-0"
          style={{ height: "64px", borderBottom: "1px solid #e5e7eb" }}
        >
          <nav className="flex items-center gap-2 text-sm">
            <span style={{ color: "#9ca3af" }}>Manager</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span className="font-medium text-gray-800">Team Dashboard</span>
          </nav>

          <div className="flex items-center gap-3">

            <button
              className="relative flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ width: "36px", height: "36px" }}
            >
              <Bell size={19} style={{ color: "#6b7280" }} />
              <span
                className="absolute rounded-full"
                style={{ top: "7px", right: "7px", width: "7px", height: "7px", background: "#e91e8c" }}
              />
            </button>

            <div className="flex items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ width: "34px", height: "34px", background: "#dc143c" }}
              >
                PS
              </div>
              <span className="text-sm font-medium text-gray-700">Priya</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="flex gap-6 items-start">
            <PunchCard employee={mockManager} attendance={mockAttendance} />
            <LeaveBalance leaves={mockLeaveBalance} />
            <UpcomingHolidays holidays={mockHolidays} />
          </div>
        </main>
      </div>
    </div>
  );
}
