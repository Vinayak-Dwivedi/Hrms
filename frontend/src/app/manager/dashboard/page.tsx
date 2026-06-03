"use client";

import {
  ArrowRight,
  Bell,
  Briefcase,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  Plane,
  Plus,
  Sun,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ManagerSidebar from "@/components/manager/ManagerSidebar";
import {
  type AttendanceRecord,
  type Employee,
  type LeaveType,
  mockAttendance,
  mockHolidays,
  mockLeaveBalance,
  mockManager,
} from "@/lib/dashboard";
import {
  type ApprovalLeaveRequest,
  fetchCurrentManager,
  fetchLeaveApprovals,
  fetchManagerLeaveBalances,
  fetchManagerTodayAttendance,
} from "@/lib/hrms-client";

const ROLE_ROUTES: Record<string, string> = {
  Employee: "/dashboard",
  Manager: "/manager/dashboard",
  HR: "/hr/dashboard",
};

function Ring({ used, total, className }: { used: number; total: number; className?: string }) {
  const r = 28,
    stroke = 5;
  const circ = 2 * Math.PI * r;
  const dash = total > 0 ? (used / total) * circ : 0;
  return (
    <div className={className} style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke="#dc143c"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>
          {used}/{total}
        </span>
      </div>
    </div>
  );
}

function leaveIcon(code: string) {
  if (code === "SL") return Briefcase;
  if (code === "AL" || code === "EL") return Plane;
  return Briefcase;
}

function fmtApplied(iso: string, days: string) {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const n = Number(days);
  return `Applied ${dateStr} • ${n} Day${n === 1 ? "" : "s"}`;
}

function statusStyle(s: ApprovalLeaveRequest["status"]): {
  label: string;
  bg: string;
  color: string;
} {
  if (s === "Approved")
    return { label: "APPROVED", bg: "#f0fdf4", color: "#15803d" };
  if (s === "Rejected")
    return { label: "REJECTED", bg: "#fef2f2", color: "#b91c1c" };
  if (s === "Cancelled")
    return { label: "CANCELLED", bg: "#fef2f2", color: "#b91c1c" };
  if (s === "Forwarded")
    return { label: "FORWARDED", bg: "#eff6ff", color: "#1d4ed8" };
  return { label: "PENDING", bg: "#fff7ed", color: "#c2410c" };
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeRole = pathname.startsWith("/manager")
    ? "Manager"
    : pathname.startsWith("/hr")
      ? "HR"
      : "Employee";

  function handleRoleSwitch(role: string) {
    router.push(ROLE_ROUTES[role]);
  }

  const [manager, setManager] = useState<Employee>(mockManager);
  const [attendance, setAttendance] =
    useState<AttendanceRecord>(mockAttendance);
  const [balances, setBalances] = useState<LeaveType[]>(mockLeaveBalance);
  const [teamLeaves, setTeamLeaves] = useState<ApprovalLeaveRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mgr, att, bal, approvals] = await Promise.all([
          fetchCurrentManager(),
          fetchManagerTodayAttendance(),
          fetchManagerLeaveBalances(),
          fetchLeaveApprovals("all"),
        ]);
        if (cancelled) return;
        setManager(mgr);
        setAttendance(att);
        if (bal.length > 0) setBalances(bal);
        setTeamLeaves(approvals.slice(0, 4));
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingTeamLeaveCount = teamLeaves.filter(
    (r) => r.status === "Pending",
  ).length;

  const totalLeaves = balances.reduce((s, l) => s + l.total, 0);
  const usedLeaves = balances.reduce((s, l) => s + l.used, 0);
  const balLeaves = totalLeaves - usedLeaves;

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "100vh", background: "#f0f2f5" }}
    >
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
            <span className="font-medium text-gray-800">Dashboard</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              className="relative flex items-center justify-center rounded-full hover:bg-gray-100"
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
                style={{ width: 34, height: 34, background: "#dc143c" }}
              >
                {manager.initials}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {manager.name.split(" ")[0]}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5">
          {loadError && (
            <div
              className="mb-4"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Failed to load manager data: {loadError}
            </div>
          )}
          <div className="flex gap-4 items-start">
            {/* ── LEFT ── */}
            <div
              className="flex flex-col gap-4"
              style={{ width: 260, flexShrink: 0 }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(160deg, #9b1747 0%, #6b0f30 100%)",
                }}
              >
                <div className="flex flex-col items-center py-8 px-5">
                  <div
                    className="rounded-full flex items-center justify-center text-xl font-bold text-white mb-4"
                    style={{
                      width: 76,
                      height: 76,
                      background: "rgba(255,255,255,0.18)",
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {manager.initials}
                  </div>
                  <p className="text-white font-bold text-lg leading-tight text-center">
                    {manager.name}
                  </p>
                  <p
                    className="text-sm mt-1 text-center"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {manager.role}
                  </p>
                  <div
                    className="mt-3 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {manager.employeeId}
                  </div>
                  <div
                    className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: "rgba(0,0,0,0.2)", color: "#fff" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: attendance.punchIn ? "#4ade80" : "#9ca3af",
                      }}
                    />
                    {attendance.punchIn ? "CHECKED IN" : "CHECKED OUT"}
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-2xl p-5"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: "#9ca3af" }}
                  >
                    ATTENDANCE
                  </span>
                  <Clock size={16} style={{ color: "#dc143c" }} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {attendance.workingHours || "0h 0m"}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Working Hours Today
                </p>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  Shift: {attendance.shift || "9:00 – 6:00"}
                </p>
                <button
                  className="w-full mt-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-red-50"
                  style={{
                    border: "1.5px solid #dc143c",
                    color: "#dc143c",
                    background: "transparent",
                  }}
                >
                  Punch Out
                </button>
              </div>

              <div
                className="bg-white rounded-2xl p-5"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <p
                  className="text-xs font-bold tracking-widest mb-3"
                  style={{ color: "#9ca3af" }}
                >
                  SHIFT DETAILS
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                    }}
                  >
                    <Sun size={16} style={{ color: "#f97316" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      General Shift
                    </p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      09:00 AM - 06:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CENTER ── */}
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              <div
                className="bg-white rounded-2xl p-6"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-gray-900">
                    Leave Balance
                  </h2>
                  <a
                    href="/manager/leave"
                    className="text-sm font-medium no-underline flex items-center gap-1"
                    style={{ color: "#dc143c" }}
                  >
                    View all <ArrowRight size={14} />
                  </a>
                </div>
                {[
                  {
                    label: "Total Leaves",
                    used: totalLeaves,
                    total: totalLeaves,
                    days: totalLeaves,
                    code: "TOT",
                  },
                  {
                    label: "Used Leaves",
                    used: usedLeaves,
                    total: totalLeaves,
                    days: usedLeaves,
                    code: "USD",
                  },
                  {
                    label: "Balance Leaves",
                    used: balLeaves,
                    total: totalLeaves,
                    days: balLeaves,
                    code: "BAL",
                  },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center gap-4 py-4 border-b last:border-0 last:pb-0"
                    style={{ borderColor: "#f3f4f6" }}
                  >
                    <Ring className="font-bold" used={item.used} total={item.total} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.label}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#9ca3af" }}
                      >
                        {item.days} days
                      </p>
                    </div>
                    <span
                      className="px-3 py-1 text-xs font-bold rounded-lg"
                      style={{ background: "#f3f4f6", color: "#6b7280" }}
                    >
                      {item.code}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="bg-white rounded-2xl p-6"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      Recent Team Leave Requests
                    </h2>
                    {pendingTeamLeaveCount > 0 && (
                      <span
                        className="text-[10px] font-bold text-white rounded-full px-2 py-0.5 leading-none"
                        style={{ background: "#f97316" }}
                      >
                        {pendingTeamLeaveCount} pending
                      </span>
                    )}
                  </div>
                  <a
                    href="/manager/approvals"
                    className="text-sm font-semibold no-underline flex items-center gap-1"
                    style={{ color: "#dc143c" }}
                  >
                    Review all <Plus size={14} />
                  </a>
                </div>
                {teamLeaves.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: "#9ca3af" }}>
                    No team leave requests yet.
                  </p>
                ) : (
                  teamLeaves.map((item) => {
                    const Icon = leaveIcon(item.leaveTypeCode);
                    const st = statusStyle(item.status);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 py-4 border-b last:border-0 last:pb-0"
                        style={{ borderColor: "#f3f4f6" }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: "#fff1f2",
                            border: "1px solid #fecdd3",
                          }}
                        >
                          <Icon size={16} style={{ color: "#dc143c" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.firstName} {item.lastName} ·{" "}
                            {item.leaveTypeName}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "#9ca3af" }}
                          >
                            {fmtApplied(item.appliedOn, item.days)} ·{" "}
                            {item.reason.slice(0, 50)}
                            {item.reason.length > 50 ? "…" : ""}
                          </p>
                        </div>
                        <span
                          className="px-3 py-1 text-xs font-bold rounded-lg shrink-0"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── RIGHT ── */}
            <div
              className="flex flex-col gap-4"
              style={{ width: 280, flexShrink: 0 }}
            >
              <div
                className="bg-white rounded-2xl p-5"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p
                    className="text-xs font-bold tracking-widest"
                    style={{ color: "#9ca3af" }}
                  >
                    UPCOMING HOLIDAYS
                  </p>
                  <a
                    href="#"
                    className="text-xs font-semibold no-underline flex items-center gap-1"
                    style={{ color: "#dc143c" }}
                  >
                    All <ArrowRight size={12} />
                  </a>
                </div>
                <div className="flex flex-col gap-3">
                  {mockHolidays.slice(0, 2).map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #f3f4f6",
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center rounded-lg text-center shrink-0"
                        style={{
                          width: 44,
                          height: 44,
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase"
                          style={{ color: "#dc143c" }}
                        >
                          {h.month}
                        </p>
                        <p className="text-base font-bold text-gray-900 leading-none">
                          {h.day}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {h.name}
                        </p>
                        <p className="text-xs" style={{ color: "#9ca3af" }}>
                          {h.year}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                        style={{
                          background:
                            h.type === "National"
                              ? "#eff6ff"
                              : h.type === "Regional"
                                ? "#f0fdf4"
                                : "#fafafa",
                          color:
                            h.type === "National"
                              ? "#1d4ed8"
                              : h.type === "Regional"
                                ? "#15803d"
                                : "#6b7280",
                        }}
                      >
                        {h.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="bg-white rounded-2xl p-5"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <p
                  className="text-xs font-bold tracking-widest mb-4"
                  style={{ color: "#9ca3af" }}
                >
                  QUICK LINKS
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { icon: FileText, label: "Company Policies" },
                    { icon: CreditCard, label: "My Payslips" },
                    { icon: Users, label: "Company Directory" },
                    { icon: GraduationCap, label: "L&D Portal" },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-gray-50 w-full"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <Icon size={15} style={{ color: "#6b7280" }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="flex items-center gap-3 bg-white rounded-2xl p-4"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#fff1f2", border: "1px solid #fecdd3" }}
                >
                  <HelpCircle size={18} style={{ color: "#dc143c" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Need Help?
                  </p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>
                    Contact IT Support Team
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
