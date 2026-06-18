"use client";

import { useState } from "react";
import {
  employeeCardClass,
} from "@/features/employees/employee-theme";
import CompOffSection from "./CompOffSection";
import ApprovalSection from "./ApprovalSection";
import MasterLeaveTypesSection from "./MasterLeaveTypesSection";
import LeavePoliciesSection from "./LeavePoliciesSection";

// Leave Policy is a tabbed settings page. The tab indicator slides under the
// active label, and the panel content slides + cross-fades when switching.
//
// Config flow order: define the catalog (Leave Types) → bundle quotas into
// Leave Policies → tune Comp-Off → set Approval routing.
//
// Theme: matches the employee-portal pages — white card with slate border,
// brand lab accent for active states.

type Tab = "master" | "policies" | "comp-off" | "approval";
const TAB_ORDER: Tab[] = ["master", "policies", "comp-off", "approval"];
const TAB_LABEL: Record<Tab, string> = {
  master: "Leave Types",
  policies: "Leave Policies",
  "comp-off": "Compensatory Off",
  approval: "Approval",
};

export default function LeavePolicyPage() {
  const [tab, setTab] = useState<Tab>("master");
  // Direction of slide for the new panel: forward when going comp-off → approval,
  // backward when going the other way. Drives the CSS transform.
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  function switchTab(next: Tab) {
    if (next === tab) return;
    const curIdx = TAB_ORDER.indexOf(tab);
    const nextIdx = TAB_ORDER.indexOf(next);
    setDirection(nextIdx > curIdx ? "forward" : "backward");


    
    setTab(next);
  }

  return (
    <div className="flex flex-col gap-6 pb-10">



      {/* Tab header */}
      <TabHeader active={tab} onChange={switchTab} />

      {/* Animated panel — each panel slides in from its side and fades in */}
      <div className="relative overflow-hidden">
        <div
          key={tab}
          className={[
            "transition-[transform,opacity] duration-300 ease-out",
            direction === "forward"
              ? "animate-slide-in-right"
              : "animate-slide-in-left",
          ].join(" ")}
        >
          {tab === "master" && <MasterLeaveTypesSection />}
          {tab === "policies" && <LeavePoliciesSection />}
          {tab === "comp-off" && <CompOffSection />}
          {tab === "approval" && <ApprovalSection />}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-slide-in-left {
          animation: slideInLeft 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
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
  const TAB_WIDTH = 190;
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
