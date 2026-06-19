"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminLeaveSection from "@/components/leave/AdminLeaveSection";
import MyLeaveSection from "@/components/leave/MyLeaveSection";
import TeamLeaveSection from "@/components/manager/TeamLeaveSection";
import { useAuth } from "@/lib/auth-context";
import { resolveUiRole } from "@/lib/resolve-ui-role";
import { enterpriseLoadingClass } from "@/lib/branding";
import { cn } from "@/lib/utils";

// Role-gated Leave page with a sliding tab header:
//   admin    → My Leave · My Team · All
//   manager  → My Leave · My Team
//   employee → My Leave (no tab bar)
type Tab = "mine" | "team" | "all";
const TAB_LABEL: Record<Tab, string> = {
  mine: "My Leave",
  team: "My Team",
  all: "All",
};

function LeavePageContent() {
  const { hasPermission, user } = useAuth();
  const searchParams = useSearchParams();
  const uiRole = resolveUiRole(hasPermission, user?.role);
  const isAdmin = uiRole === "admin";
  const canApprove = hasPermission("leave.approve");

  const tabs = useMemo<Tab[]>(
    () =>
      isAdmin
        ? ["mine", "team", "all"]
        : canApprove
          ? ["mine", "team"]
          : ["mine"],
    [isAdmin, canApprove],
  );

  const [tab, setTab] = useState<Tab>(
    searchParams.get("scope") === "team" ? "team" : "mine",
  );
  const active = tabs.includes(tab) ? tab : tabs[0]!;

  // Single tab (employee): no tab bar, the section fills the page on its own.
  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-3"
      style={{ height: "calc(100vh - 7rem)" }}
    >
      {tabs.length > 1 && (
        <div className="shrink-0">
          <LeaveTabHeader tabs={tabs} active={active} onChange={setTab} />
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col">
        {active === "mine" ? (
          <MyLeaveSection role={uiRole} />
        ) : active === "team" ? (
          <TeamLeaveSection />
        ) : (
          <AdminLeaveSection />
        )}
      </div>
    </div>
  );
}

export default function LeavePage() {
  return (
    <Suspense
      fallback={<div className={enterpriseLoadingClass}>Loading leave…</div>}
    >
      <LeavePageContent />
    </Suspense>
  );
}

function LeaveTabHeader({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const TAB_WIDTH = 128;
  const activeIdx = Math.max(0, tabs.indexOf(active));
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-1.5 py-1.5 inline-flex relative self-start shadow-sm">
      <div
        aria-hidden
        className="absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] transition-transform duration-300 ease-out"
        style={{
          width: TAB_WIDTH,
          left: 6,
          transform: `translateX(${activeIdx * (TAB_WIDTH + 4)}px)`,
        }}
      />
      {tabs.map((t, i) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          style={{ width: TAB_WIDTH, marginLeft: i === 0 ? 0 : 4 }}
          className={cn(
            "relative z-10 py-1.5 rounded-lg text-[13px] font-semibold transition-colors border-0 cursor-pointer bg-transparent",
            active === t ? "text-white" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {TAB_LABEL[t]}
        </button>
      ))}
    </div>
  );
}
