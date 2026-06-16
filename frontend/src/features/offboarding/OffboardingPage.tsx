"use client";

import {
  Activity,
  ClipboardCheck,
  FileSignature,
  FileText,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Offboarding overview â€” a brief introduction to the features that will live
// under this section. Cards are informational for now; clicking them is wired
// when each sub-feature ships.
//
// Theme matches Leave Policy / employee portal: white cards, gray-200 border,
// brand pink (#ff014f) for accents, rounded-2xl, soft shadow on hover.

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: FileText,
    title: "Resignation Flow",
    description:
      "Have multiple resignation flows for various locations and designations with varied notice periods, clearance processes, and more.",
  },
  {
    icon: ClipboardCheck,
    title: "Clearances",
    description:
      "Ensures that all tasks related to an employee's exit, such as knowledge transfer, returning company property, and obtaining approvals, are completed.",
  },
  {
    icon: MessageSquare,
    title: "Exit Interview",
    description:
      "Customize exit interview question templates and use them as part of the resignation process.",
  },
  {
    icon: FileSignature,
    title: "Generate Exit Documents",
    description:
      "Create ready-to-send documents such as experience letters, NDA forms, and benefit documents to share with departing employees.",
  },
  {
    icon: Activity,
    title: "Track Offboarding",
    description:
      "Centralized space to track and add new offboarding records and manage clearance.",
  },
];

export default function OffboardingPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
            Offboarding
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Here is a brief introduction to the various features of the
            offboarding service.
          </p>
        </div>
      </div>

      {/* Overview section */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-baseline gap-3 mb-5">
          <h2 className="text-[15px] font-semibold text-gray-900">Overview</h2>
          <span className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div
      className={[
        "group relative flex flex-col gap-3 p-5",
        "bg-white border border-gray-200 rounded-xl",
        "transition-all duration-200",
        "hover:border-[#ff014f]/40 hover:shadow-sm hover:-translate-y-0.5",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            "shrink-0 rounded-xl p-2",
            "bg-pink-50 text-[#ff014f]",
            "transition-colors group-hover:bg-[#eb0249] group-hover:text-white",
          ].join(" ")}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-[14px] font-semibold text-gray-900 leading-tight">
          {feature.title}
        </h3>
      </div>
      <p className="text-[13px] text-gray-500 leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}
