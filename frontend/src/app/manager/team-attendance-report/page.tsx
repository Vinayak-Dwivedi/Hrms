"use client";

import { useCallback, useEffect, useState } from "react";
import TeamAttendanceReport from "@/components/manager/TeamAttendanceReport";
import {
  fetchTeamAttendance,
  type TeamAttendanceResponse,
} from "@/lib/hrms-client";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TeamAttendanceReportPage() {
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
        <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-[13px] rounded-lg px-3.5 py-2.5">
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
