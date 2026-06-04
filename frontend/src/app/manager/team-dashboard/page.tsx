"use client";

import { useEffect, useState } from "react";
import TeamDashboard from "@/components/manager/TeamDashboard";
import { type Employee } from "@/lib/dashboard";
import {
  fetchCurrentManager,
  fetchLeaveApprovals,
  fetchRegularisationApprovals,
  fetchTeamAttendance,
  type TeamAttendanceResponse,
} from "@/lib/hrms-client";

export default function TeamDashboardPage() {
  const [manager, setManager] = useState<Employee | null>(null);
  const [teamData, setTeamData] = useState<TeamAttendanceResponse | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mgr, team, leaveApprovals, regApprovals] = await Promise.all([
          fetchCurrentManager(),
          fetchTeamAttendance(),
          fetchLeaveApprovals("pending"),
          fetchRegularisationApprovals("pending"),
        ]);
        if (cancelled) return;
        setManager(mgr);
        setTeamData(team);
        setPendingApprovals(leaveApprovals.length + regApprovals.length);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {loadError && (
        <div
          className="mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Failed to load team data: {loadError}
        </div>
      )}
      <TeamDashboard
        data={teamData}
        loading={loading}
        pendingApprovals={pendingApprovals}
        managerName={manager?.name ?? "Loading…"}
        managerRole={manager?.role ?? ""}
      />
    </>
  );
}
