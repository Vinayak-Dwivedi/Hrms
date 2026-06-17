"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LeaveScopeToggle, {
  type LeaveScope,
} from "@/components/leave/LeaveScopeToggle";
import MyLeaveSection from "@/components/leave/MyLeaveSection";
import TeamLeaveSection from "@/components/manager/TeamLeaveSection";
import { useReportingManagerAvailable } from "@/lib/use-reporting-manager-available";
import { enterpriseLoadingClass } from "@/lib/branding";

export type { LeaveScope } from "@/components/leave/LeaveScopeToggle";

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
    return <div className={enterpriseLoadingClass}>Loading leave…</div>;
  }

  if (!reportingManager) {
    return <MyLeaveSection role="employee" />;
  }

  const scopeToggle = (
    <LeaveScopeToggle scope={scope} onSelect={selectScope} />
  );

  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-2"
      style={{ height: "calc(100vh - 7rem)" }}
    >
      {scope === "mine" ? (
        <MyLeaveSection role="manager" leadingToolbar={scopeToggle} />
      ) : (
        <>
          <div className="flex items-center shrink-0">{scopeToggle}</div>
          <div className="flex-1 min-h-0 flex flex-col">
            <TeamLeaveSection />
          </div>
        </>
      )}
    </div>
  );
}
