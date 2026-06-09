"use client";

import { Bell, ChevronDown, LogOut, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Employee } from "@/lib/dashboard";
import { signOut } from "@/lib/hrms-client";
import type { Role } from "@/lib/roles";

// Universal app header — breadcrumb on the left, notifications + user menu on
// the right. Mounted by AppShell so every authenticated page renders the same
// top bar. Owns its own dropdown / confirm-modal state and signs the user out
// directly (no callback prop) so AppShell stays focused on the sidebar.

// ─── breadcrumb table ───────────────────────────────────────────────────────
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
  "/manager/dashboard": "Dashboard",
  "/manager/attendance": "My Attendance",
  "/manager/leave": "Leave",
  "/manager/team-dashboard": "Team Dashboard",
  "/manager/team-attendance-report": "Team Attendance",
  "/manager/approvals": "Approvals",
  "/admin/dashboard": "Dashboard",
  "/admin/attendance": "My Attendance",
  "/admin/leave": "Leave",
  "/admin/employees": "Employees",
  "/admin/approvals": "Approvals",
  "/admin/org": "Org Dashboard",
  "/admin/reports": "Reports",
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

function rootLabelFor(role: Role): string {
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  return "Employee";
}

// ─── header avatar primitive ────────────────────────────────────────────────
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
      className={[
        "rounded-full overflow-hidden flex items-center justify-center shrink-0",
        "w-[34px] h-[34px] text-[12px] font-bold text-white tracking-wide",
        showImg ? "bg-white" : "bg-violet-600",
      ].join(" ")}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          width={34}
          height={34}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover block"
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ─── header ─────────────────────────────────────────────────────────────────
export default function AppHeader({
  role,
  identity,
}: {
  role: Role;
  identity: Employee | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown on outside-click or Escape. Confirm modal handles its
  // own dismissal via the backdrop / Cancel button.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  }

  const initials = identity?.initials ?? "··";
  const crumb = breadcrumbFor(pathname);

  return (
    <>
      <header className="flex items-center justify-between px-6 h-16">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">{rootLabelFor(role)}</span>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">{crumb}</span>
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200"
            aria-label="Notifications"
          >
            <Bell size={17} className="text-gray-500" />
            <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-[#ec4899]" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-100 cursor-pointer"
            >
              <HeaderAvatar
                initials={initials}
                src={identity?.avatarUrl}
              />
              <span className="text-sm font-semibold text-gray-700">
                {identity?.name ?? "—"}
              </span>
              <ChevronDown
                size={14}
                className={[
                  "text-gray-400 transition-transform duration-150",
                  menuOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-40 w-56 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden"
              >
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">
                    {identity?.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {identity?.role ?? rootLabelFor(role)}
                  </p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 text-left cursor-pointer border-b border-gray-100"
                >
                  <UserRound size={14} />
                  My Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[#dc2626] hover:bg-[#fef2f2] text-left cursor-pointer"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Logout confirmation modal ─────────────────────────────────── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loggingOut) {
              setConfirmOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center">
              <h3 className="text-[17px] font-bold text-gray-900">
                Log out ?
              </h3>
              <p className="text-[12px] text-gray-500 mt-1 max-w-[260px] leading-relaxed">
                You'll need to sign in again to access your account.
              </p>
            </div>
            <div className="px-4 pb-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loggingOut ? "Logging out…" : "Yes, log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
