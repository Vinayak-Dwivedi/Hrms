"use client";

import { useState } from "react";
import ClearanceTemplatesSection from "@/features/offboarding/ClearanceTemplatesSection";
import ExitDocumentTemplatesSection from "@/features/offboarding/ExitDocumentTemplatesSection";
import ExitInterviewTemplatesSection from "@/features/offboarding/ExitInterviewTemplatesSection";
import ExitReasonsSection from "@/features/offboarding/ExitReasonsSection";
import FnfSection from "@/features/offboarding/FnfSection";
import HrResignationsSection from "@/features/offboarding/HrResignationsSection";
import OffboardingCasesSection from "@/features/offboarding/OffboardingCasesSection";
import ResignationFlowsSection from "@/features/offboarding/ResignationFlowsSection";

// Admin / HR offboarding hub. Tabs cover the Phase-1 surface: HR review of
// resignations, the active offboarding cases, and the admin config
// (resignation flows + exit reasons). Later phases add Clearance Templates,
// Exit-Interview Templates, Exit-Document Templates and FnF tabs here.

type Tab =
  | "resignations"
  | "cases"
  | "fnf"
  | "flows"
  | "clearance"
  | "interviews"
  | "documents"
  | "reasons";

const TABS: { key: Tab; label: string }[] = [
  { key: "resignations", label: "Resignations" },
  { key: "cases", label: "Active Cases" },
  { key: "fnf", label: "FnF Settlement" },
  { key: "flows", label: "Resignation Flows" },
  { key: "clearance", label: "Clearance Templates" },
  { key: "interviews", label: "Exit Interviews" },
  { key: "documents", label: "Exit Documents" },
  { key: "reasons", label: "Exit Reasons" },
];

export default function OffboardingPage() {
  const [tab, setTab] = useState<Tab>("resignations");

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Offboarding</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Review resignations, track offboarding cases, and configure resignation flows.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border border-gray-200 rounded-2xl px-2 py-2 inline-flex self-start gap-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-[#FF014F] to-[#eb0249] text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <section>
        {tab === "resignations" && <HrResignationsSection />}
        {tab === "cases" && <OffboardingCasesSection />}
        {tab === "fnf" && <FnfSection />}
        {tab === "flows" && <ResignationFlowsSection />}
        {tab === "clearance" && <ClearanceTemplatesSection />}
        {tab === "interviews" && <ExitInterviewTemplatesSection />}
        {tab === "documents" && <ExitDocumentTemplatesSection />}
        {tab === "reasons" && <ExitReasonsSection />}
      </section>
    </div>
  );
}

