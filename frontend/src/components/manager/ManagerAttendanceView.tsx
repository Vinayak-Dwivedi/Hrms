"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AttendanceScopeToggle, {
  type AttendanceScope,
} from "@/components/attendance/AttendanceScopeToggle";
import RoleAttendance from "@/components/attendance/RoleAttendance";
import TeamAttendanceReport from "@/components/manager/TeamAttendanceReport";
import { employeeErrorBannerClass } from "@/features/employees/employee-theme";
import {
  fetchTeamAttendance,
  type TeamAttendanceResponse,
} from "@/lib/hrms-client";
import { useReportingManagerAvailable } from "@/lib/use-reporting-manager-available";
import { enterpriseLoadingClass } from "@/lib/branding";

export type { AttendanceScope } from "@/components/attendance/AttendanceScopeToggle";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TeamAttendanceReportSection() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthLabel = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const [data, setData] = useState<TeamAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const team = await fetchTeamAttendance(ymd(monthStart), ymd(monthEnd));
      setData(team);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <>
      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load team report: {loadError}
        </div>
      )}
      <TeamAttendanceReport
        data={data}
        loading={loading}
        monthLabel={monthLabel}
        onUploaded={reload}
      />
    </>
  );
}

export default function ManagerAttendanceView({
  initialScope,
}: {
  initialScope: AttendanceScope;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { available: reportingManager, loading: probeLoading } =
    useReportingManagerAvailable();
  const [scope, setScope] = useState<AttendanceScope>(initialScope);
  const autoApplyLeave = searchParams.get("apply") === "1";

  useEffect(() => {
    if (probeLoading) return;

    if (!reportingManager) {
      if (searchParams.get("scope") === "team") {
        router.replace("/attendance", { scroll: false });
      }
      return;
    }

    const fromUrl = searchParams.get("scope") === "team" ? "team" : "mine";
    setScope(fromUrl);
  }, [searchParams, reportingManager, probeLoading, router]);

  function selectScope(next: AttendanceScope) {
    setScope(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "team") {
      params.set("scope", "team");
    } else {
      params.delete("scope");
    }
    const qs = params.toString();
    router.replace(qs ? `/attendance?${qs}` : "/attendance", { scroll: false });
  }

  if (probeLoading) {
    return <div className={enterpriseLoadingClass}>Loading attendance…</div>;
  }

  if (!reportingManager) {
    return <RoleAttendance role="employee" autoApplyLeave={autoApplyLeave} />;
  }

  const scopeToggle = (
    <AttendanceScopeToggle scope={scope} onSelect={selectScope} />
  );

  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-2"
      style={{ height: "calc(100vh - 7rem)" }}
    >
      {scope === "mine" ? (
        <RoleAttendance
          role="manager"
          leadingToolbar={scopeToggle}
          autoApplyLeave={autoApplyLeave}
        />
      ) : (
        <>
          <div className="flex items-center shrink-0">{scopeToggle}</div>
          <div className="flex-1 min-h-0 overflow-auto">
            <TeamAttendanceReportSection />
          </div>
        </>
      )}
    </div>
  );
}
