"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import LeaveTable from "@/components/leave/LeaveTable";
import {
  APP_LOCATION,
  APP_VERSION,
  type Employee,
  type LeaveRequest,
  mockEmployee,
  mockLeaveNavItems,
} from "@/lib/dashboard";
import {
  cancelLeaveRequest,
  fetchCurrentEmployee,
  fetchMyLeaveRequests,
} from "@/lib/hrms-client";

const ROLE_ROUTES: Record<string, string> = {
  Employee: "/dashboard",
  Manager: "/manager/dashboard",
  HR: "/hr/dashboard",
};

export default function LeavePage() {
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

  const [employee, setEmployee] = useState<Employee>(mockEmployee);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [emp, lr] = await Promise.all([
          fetchCurrentEmployee(),
          fetchMyLeaveRequests(),
        ]);
        if (cancelled) return;
        setEmployee(emp);
        setRequests(lr);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCancel(id: string) {
    setBusyId(id);
    setLoadError(null);
    try {
      await cancelLeaveRequest(id);
      const fresh = await fetchMyLeaveRequests();
      setRequests(fresh);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "100vh", background: "#f8f9fb" }}
    >
      <Sidebar
        employee={employee}
        navItems={mockLeaveNavItems}
        version={APP_VERSION}
        location={APP_LOCATION}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="flex items-center justify-between px-6 bg-white shrink-0"
          style={{ height: 64, borderBottom: "1px solid #e5e7eb" }}
        >
          <nav className="flex items-center gap-2 text-sm">
            <span style={{ color: "#9ca3af" }}>Employee</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span className="font-medium text-gray-800">Leave</span>
          </nav>

          <div className="flex items-center gap-3">

            <button
              className="relative flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ width: 36, height: 36 }}
            >
              <Bell size={19} style={{ color: "#6b7280" }} />
              <span
                className="absolute rounded-full"
                style={{
                  top: 7,
                  right: 7,
                  width: 7,
                  height: 7,
                  background: "#e91e8c",
                }}
              />
            </button>

            <div className="flex items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ width: 34, height: 34, background: "#7c3aed" }}
              >
                {employee.initials}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {employee.name.split(" ")[0]}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {loadError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Failed to load leave requests: {loadError}
            </div>
          )}
          {loading ? (
            <div style={{ padding: 24, color: "#6b7280" }}>
              Loading leave requests…
            </div>
          ) : (
            <LeaveTable
              requests={requests}
              onCancel={handleCancel}
              busyId={busyId}
            />
          )}
        </main>
      </div>
    </div>
  );
}
