"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { employeeCardClass } from "@/features/employees/employee-theme";
import type { PendingReviewEmployee } from "@/features/employees/api/hr-onboarding.client";
import { cn } from "@/lib/utils";

export type HrDashboardData = {
  completionStats: {
    total: number;
    completed: number;
    completionRate: number;
    byStatus: Record<string, number>;
  } | null;
  employeeCount: number | null;
  pendingReview: PendingReviewEmployee[] | null;
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className={cn(employeeCardClass, "p-4 min-w-0")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 m-0">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 m-0 mt-1">{value}</p>
      {sub && (
        <p className="text-[12px] text-gray-500 m-0 mt-1">{sub}</p>
      )}
    </div>
  );
}

export default function HrDashboardSection({
  data,
  showOnboarding,
  showEmployees,
  loading,
}: {
  data: HrDashboardData;
  showOnboarding: boolean;
  showEmployees: boolean;
  loading?: boolean;
}) {
  if (!showOnboarding && !showEmployees) return null;

  if (loading && !data.completionStats && data.employeeCount == null) {
    return (
      <div className={cn(employeeCardClass, "p-5 h-32 animate-pulse bg-gray-50")} />
    );
  }

  const pendingCount = data.pendingReview?.length ?? 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900 m-0">HR Operations</h2>
        {showEmployees && (
          <Link
            href="/employees"
            className="text-[12px] font-semibold text-[#be185d] no-underline hover:underline"
          >
            View all employees →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {showEmployees && data.employeeCount != null && (
          <StatCard label="Employees" value={data.employeeCount} />
        )}
        {showOnboarding && data.completionStats && (
          <>
            <StatCard
              label="Onboarding complete"
              value={`${data.completionStats.completionRate}%`}
              sub={`${data.completionStats.completed} of ${data.completionStats.total}`}
            />
            <StatCard
              label="Pending review"
              value={pendingCount}
              sub="Awaiting HR action"
            />
            <StatCard
              label="In progress"
              value={data.completionStats.byStatus.IN_PROGRESS ?? 0}
            />
          </>
        )}
      </div>

      {showOnboarding && !loading && pendingCount === 0 && (
        <div
          className={cn(
            employeeCardClass,
            "p-4 flex items-center gap-2 text-[12px] text-gray-500",
          )}
        >
          <Users size={14} />
          No onboarding submissions awaiting review.
        </div>
      )}
    </section>
  );
}
