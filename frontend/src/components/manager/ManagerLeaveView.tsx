"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MyLeaveSection from "@/components/leave/MyLeaveSection";
import TeamLeaveSection from "@/components/manager/TeamLeaveSection";
import { useReportingManagerAvailable } from "@/lib/use-reporting-manager-available";
import { cn } from "@/lib/utils";

export type LeaveScope = "mine" | "team";

function scopeToggleClass(active: boolean) {
  return cn(
    "px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors border",
    active
      ? "bg-[#fff1f2] text-[#be185d] border-[#fecdd3]"
      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
  );
}

export default function ManagerLeaveView({
  initialScope,
}: {
  initialScope: LeaveScope;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { available: reportingManager, loading: probeLoading } =
    useReportingManagerAvailable();
  const [scope, setScope] = useState<LeaveScope>(initialScope);

  useEffect(() => {
    if (probeLoading) return;

    if (!reportingManager) {
      if (searchParams.get("scope") === "team") {
        router.replace("/leave", { scroll: false });
      }
      return;
    }

    const fromUrl = searchParams.get("scope") === "team" ? "team" : "mine";
    setScope(fromUrl);
  }, [searchParams, reportingManager, probeLoading, router]);

  function selectScope(next: LeaveScope) {
    setScope(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "team") {
      params.set("scope", "team");
    } else {
      params.delete("scope");
    }
    const qs = params.toString();
    router.replace(qs ? `/leave?${qs}` : "/leave", { scroll: false });
  }

  if (probeLoading) {
    return <div className="p-6 text-gray-500">Loading leave…</div>;
  }

  if (!reportingManager) {
    return <MyLeaveSection role="employee" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => selectScope("mine")}
          aria-pressed={scope === "mine" ? true : undefined}
          className={scopeToggleClass(scope === "mine")}
        >
          My Leave
        </button>
        <button
          type="button"
          onClick={() => selectScope("team")}
          aria-pressed={scope === "team" ? true : undefined}
          className={scopeToggleClass(scope === "team")}
        >
          Team Leave
        </button>
      </div>

      {scope === "mine" ? (
        <MyLeaveSection role="manager" />
      ) : (
        <TeamLeaveSection />
      )}
    </div>
  );
}
