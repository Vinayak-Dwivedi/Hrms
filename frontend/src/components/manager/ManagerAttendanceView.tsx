"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RoleAttendance from "@/components/attendance/RoleAttendance";
import TeamAttendanceReport from "@/components/manager/TeamAttendanceReport";
import { employeeErrorBannerClass } from "@/features/employees/employee-theme";
import {
  fetchTeamAttendance,
  type TeamAttendanceResponse,
} from "@/lib/hrms-client";
import { useReportingManagerAvailable } from "@/lib/use-reporting-manager-available";
import { cn } from "@/lib/utils";

export type AttendanceScope = "mine" | "team";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function scopeToggleClass(active: boolean) {
  return cn(
    "px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors border",
    active
      ? "bg-[#fff1f2] text-[#be185d] border-[#fecdd3]"
      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
  );
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
    return <div className="p-6 text-gray-500">Loading attendance…</div>;
  }

  if (!reportingManager) {
    return <RoleAttendance role="employee" />;
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
          My Attendance
        </button>
        <button
          type="button"
          onClick={() => selectScope("team")}
          aria-pressed={scope === "team" ? true : undefined}
          className={scopeToggleClass(scope === "team")}
        >
          Team Attendance
        </button>
      </div>

      {scope === "mine" ? (
        <RoleAttendance role="manager" />
      ) : (
        <TeamAttendanceReportSection />
      )}
    </div>
  );
}
