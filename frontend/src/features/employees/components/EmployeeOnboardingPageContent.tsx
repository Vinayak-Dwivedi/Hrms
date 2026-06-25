"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import OnboardingProfileReadOnly from "@/features/onboarding/components/OnboardingProfileReadOnly";
import {
  computeOnboardingPipeline,
  computeOnboardingReadiness,
  fetchEmployeeOnboarding,
  fetchEmployeeOnboardingProfile,
  type OnboardingTimeline,
} from "../api/hr-onboarding.client";
import {
  fetchEmployeeById,
  formatEmployeeDisplayName,
  formatOnboardingStatus,
  type EmployeeDetail,
} from "../api/employees.client";
import {
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import { onboardingReviewCardClass } from "../onboarding-admin-theme";
import OnboardingAdminPanel, {
  hasOnboardingPanelAccess,
} from "./OnboardingAdminPanel";
import { useAuth } from "@/lib/auth-context";
import type { OnboardingProfileValues } from "@/features/onboarding/schemas/onboarding.schema";

interface Props {
  employeeId: number;
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  IN_PROGRESS: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
  INVITATION_SENT: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
  PENDING: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  EXPIRED: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
};

function SubmittedProfilePanel({
  profileValues,
  submittedAt,
}: {
  profileValues: OnboardingProfileValues;
  submittedAt?: string | null;
}) {
  return (
    <section className={onboardingReviewCardClass}>
      <header className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
          Reference only
        </p>
        <h2 className="text-sm font-semibold text-slate-900 mt-0.5 mb-0">
          Employee submission
        </h2>
        {submittedAt ? (
          <p className="text-xs text-slate-500 mt-1 mb-0">
            Submitted {new Date(submittedAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </header>
      <div className="p-4">
        <OnboardingProfileReadOnly values={profileValues} layout="page" />
      </div>
    </section>
  );
}

export default function EmployeeOnboardingPageContent({ employeeId }: Props) {
  const router = useRouter();
  const { hasAnyPermission } = useAuth();
  const canAccess = hasOnboardingPanelAccess(hasAnyPermission);

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [profileValues, setProfileValues] =
    useState<OnboardingProfileValues | null>(null);
  const [timeline, setTimeline] = useState<OnboardingTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [emp, profile, onboarding] = await Promise.all([
        fetchEmployeeById(employeeId),
        fetchEmployeeOnboardingProfile(employeeId),
        fetchEmployeeOnboarding(employeeId),
      ]);
      setEmployee(emp);
      setProfileValues(computeOnboardingReadiness(profile).formValues);
      setTimeline(onboarding);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [canAccess, load]);

  if (!canAccess) {
    return (
      <div className={employeeErrorBannerClass}>
        You do not have permission to manage employee onboarding.
      </div>
    );
  }

  const pipeline = timeline ? computeOnboardingPipeline(timeline) : null;
  const showSubmittedDetails =
    profileValues != null &&
    pipeline != null &&
    (pipeline.isSubmitted || pipeline.isCompleted);

  const statusKey = employee?.onboardingStatus ?? "PENDING";
  const statusBadgeClass =
    STATUS_BADGE[statusKey] ?? "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  const sideContent =
    showSubmittedDetails && profileValues ? (
      <SubmittedProfilePanel
        profileValues={profileValues}
        submittedAt={timeline?.submittedAt}
      />
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link className={employeeBtnOutlineSmClass} href="/employees">
          ← Back to employees
        </Link>
        {employee && (
          <Link
            className={employeeBtnOutlineSmClass}
            href={`/employees/${employeeId}`}
          >
            View employee profile
          </Link>
        )}
      </div>

      {loading && (
        <div className={employeeLoadingClass}>Loading onboarding…</div>
      )}
      {loadError && (
        <div className={employeeErrorBannerClass}>{loadError}</div>
      )}

      {!loading && !loadError && employee && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 m-0">
                Employee onboarding
              </p>
              <h1 className="text-xl font-semibold text-slate-900 mt-1 mb-0 tracking-tight">
                {formatEmployeeDisplayName(employee)}
              </h1>
              <p className="text-sm text-slate-500 mt-1 mb-0">{employee.empId}</p>
            </div>

            <span
              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shrink-0 ${statusBadgeClass}`}
            >
              {formatOnboardingStatus(employee.onboardingStatus)}
            </span>
          </div>

          <OnboardingAdminPanel
            employeeId={employeeId}
            variant="page"
            sideContent={sideContent}
            onTimelineLoaded={setTimeline}
            onUpdated={async () => {
              const [emp, profile, onboarding] = await Promise.all([
                fetchEmployeeById(employeeId),
                fetchEmployeeOnboardingProfile(employeeId),
                fetchEmployeeOnboarding(employeeId),
              ]);
              setEmployee(emp);
              setProfileValues(
                computeOnboardingReadiness(profile).formValues,
              );
              setTimeline(onboarding);
            }}
            onOnboardingCompleted={() => {
              router.push("/employees");
              router.refresh();
            }}
          />
        </>
      )}
    </div>
  );
}
