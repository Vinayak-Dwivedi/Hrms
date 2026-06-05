"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import TeamDashboard from "@/components/manager/TeamDashboard";
import {
  type ApprovalLeaveRequest,
  type ApprovalRegRequest,
  fetchLeaveApprovals,
  fetchRegularisationApprovals,
  fetchTeam,
  fetchTeamAttendance,
  fetchTeamAttrition,
  type TeamAttendanceResponse,
  type TeamAttrition,
  type TeamMember,
} from "@/lib/hrms-client";

function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [teamAttendance, setTeamAttendance] =
    useState<TeamAttendanceResponse | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<
    ApprovalLeaveRequest[] | null
  >(null);
  const [pendingRegs, setPendingRegs] = useState<
    ApprovalRegRequest[] | null
  >(null);
  const [monthLeaves, setMonthLeaves] = useState<
    ApprovalLeaveRequest[] | null
  >(null);
  const [attrition, setAttrition] = useState<TeamAttrition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Last 7 days (today inclusive) — anchors the attendance grid + trend.
  const today = new Date();
  const sevenAgo = new Date(today);
  sevenAgo.setDate(today.getDate() - 6);

  const reload = useCallback(async () => {
    try {
      const [tm, att, pl, pr, all, attr] = await Promise.all([
        fetchTeam(),
        fetchTeamAttendance(ymd(sevenAgo), ymd(today)),
        fetchLeaveApprovals("pending"),
        fetchRegularisationApprovals("pending"),
        fetchLeaveApprovals("all"),
        fetchTeamAttrition(),
      ]);
      setTeam(tm);
      setTeamAttendance(att);
      setPendingLeaves(pl);
      setPendingRegs(pr);
      setMonthLeaves(all);
      setAttrition(attr);
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
          Failed to load team data: {loadError}
        </div>
      )}
      <TeamDashboard
        team={team}
        attendance={teamAttendance}
        pendingLeaves={pendingLeaves}
        pendingRegs={pendingRegs}
        monthLeaves={monthLeaves}
        attrition={attrition}
        loading={loading}
        windowEnd={today}
        onExport={() => toast.info("Export — coming soon")}
      />
    </>
  );
}
