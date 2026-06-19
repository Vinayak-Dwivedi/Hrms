"use client";

import { useState } from "react";
import {
  employeeCardClass,
} from "@/features/employees/employee-theme";
import CompOffSection from "./CompOffSection";
// Approval tab disabled for now — kept for later re-enable.
// import ApprovalSection from "./ApprovalSection";
import MasterLeaveTypesSection from "./MasterLeaveTypesSection";
import LeavePoliciesSection from "./LeavePoliciesSection";
import WeeklyOffPage from "@/features/weekly-off/WeeklyOffPage";
// Holiday Policy now lives in the sidebar (Settings → Holiday Policy).
// import HolidayPolicyPage from "@/features/holiday-calendars/HolidayPolicyPage";

// Leave Policy is a tabbed settings page. The tab indicator slides under the
// active label, and the panel content slides + cross-fades when switching.
//
// Config flow order: define the catalog (Leave Types) → bundle quotas into
// Leave Policies → tune Comp-Off → set Approval routing.
//
// Theme: matches the employee-portal pages — white card with slate border,
// brand lab accent for active states.

// Order: Leave Types → Weekly Off → Leave Policies → Comp Off.
// Approval is disabled; Holiday Policy moved to the sidebar (Settings).
type Tab = "master" | "weekly-off" | "policies" | "comp-off";
const TAB_ORDER: Tab[] = ["master", "weekly-off", "policies", "comp-off"];
const TAB_LABEL: Record<Tab, string> = {
  master: "Leave Types",
  "weekly-off": "Weekly Off",
  policies: "Leave Policies",
  "comp-off": "Compensatory Off",
};

export default function LeavePolicyPage() {
  const [tab, setTab] = useState<Tab>("master");

  function switchTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
  }

  return (
    <div className="flex flex-col gap-6 pb-10">



      {/* Tab header */}
      <TabHeader active={tab} onChange={switchTab} />

      {/* Panel — fades in on tab switch. Deliberately NO transform/overflow
          here: a transformed (or overflow-hidden) ancestor becomes the
          containing block for the `fixed` modals inside the Weekly Off / Holiday
          Policy panels, trapping + clipping them instead of covering the
          viewport. An opacity-only fade avoids creating a containing block. */}
      <div className="relative">
        <div key={tab} className="animate-fade-in">
          {tab === "master" && <MasterLeaveTypesSection />}
          {tab === "weekly-off" && <WeeklyOffPage />}
          {tab === "policies" && <LeavePoliciesSection />}
          {tab === "comp-off" && <CompOffSection />}
          {/* Approval disabled: {tab === "approval" && <ApprovalSection />} */}
          {/* Holiday Policy moved to the sidebar (Settings → Holiday Policy). */}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 200ms ease-out both;
        }
      `}</style>
    </div>
  );
}

// ─── Tab header ───────────────────────────────────────────────────────────────

function TabHeader({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const TAB_WIDTH = 158;
  const activeIdx = TAB_ORDER.indexOf(active);
  return (
    <div className={`${employeeCardClass} px-2 py-2 inline-flex relative self-start`}>
      <div
        aria-hidden
        className="absolute top-2 bottom-2 rounded-md bg-[lab(36.9089%_35.0961_-85.6872)] transition-transform duration-300 ease-out"
        style={{
          width: TAB_WIDTH,
          left: 8,
          transform: `translateX(${activeIdx * (TAB_WIDTH + 4)}px)`,
        }}
      />
      {TAB_ORDER.map((t, i) => {
        const isActive = active === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            style={{
              width: TAB_WIDTH,
              marginLeft: i === 0 ? 0 : 4,
            }}
            className={[
              "relative z-10 py-2 rounded-md text-[13px] font-medium transition-colors border-0 cursor-pointer bg-transparent",
              isActive ? "text-white" : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            {TAB_LABEL[t]}
          </button>
        );
      })}
    </div>
  );
}
