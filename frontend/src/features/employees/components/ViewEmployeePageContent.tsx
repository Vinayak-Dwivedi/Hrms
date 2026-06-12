"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EmployeeDetailView from "./EmployeeDetailView";
import {
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import { hasOnboardingPanelAccess } from "./OnboardingAdminPanel";
import { useAuth } from "@/lib/auth-context";
import {
  fetchBranches,
  fetchDepartments,
  fetchDesignations,
  fetchEmployeeById,
  fetchEmployees,
  fetchGrades,
  resendOnboardingInvitation,
  type EmployeeDetail,
  type LookupItem,
} from "../api/employees.client";

interface Props {
  employeeId: number;
}

export default function ViewEmployeePageContent({ employeeId }: Props) {
  const { hasAnyPermission } = useAuth();
  const showOnboardingLink = hasOnboardingPanelAccess(hasAnyPermission);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [grades, setGrades] = useState<LookupItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<
    Awaited<ReturnType<typeof fetchEmployees>>
  >([]);
  const [resendingInvitation, setResendingInvitation] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const [emp, depts, desigs, brs, grds, emps] = await Promise.all([
          fetchEmployeeById(employeeId),
          fetchDepartments(),
          fetchDesignations(),
          fetchBranches(),
          fetchGrades(),
          fetchEmployees(),
        ]);
        if (cancelled) return;
        setEmployee(emp);
        setDepartments(depts);
        setDesignations(desigs);
        setBranches(brs);
        setGrades(grds);
        setAllEmployees(emps);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const managerLabel = useMemo(() => {
    if (!employee?.reportingManagerId) return "—";
    const mgr = allEmployees.find((e) => e.id === employee.reportingManagerId);
    return mgr ? `${mgr.firstName} ${mgr.lastName} (${mgr.empId})` : "—";
  }, [allEmployees, employee?.reportingManagerId]);

  async function handleResendInvitation() {
    setResendingInvitation(true);
    setInvitationMessage(null);
    try {
      const result = await resendOnboardingInvitation(employeeId);
      setInvitationMessage(
        `Invitation sent. Expires ${new Date(result.expiresAt).toLocaleString("en-IN")}.`,
      );
      const emp = await fetchEmployeeById(employeeId);
      setEmployee(emp);
    } catch (e) {
      setInvitationMessage((e as Error).message);
    } finally {
      setResendingInvitation(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link className={employeeBtnOutlineSmClass} href="/employees">
          ← Back to employees
        </Link>
        {showOnboardingLink && (
          <Link
            className={employeeBtnOutlineSmClass}
            href={`/employees/${employeeId}/onboarding`}
          >
            Manage onboarding
          </Link>
        )}
      </div>

      {loading && <div className={employeeLoadingClass}>Loading employee…</div>}
      {loadError && (
        <div className={employeeErrorBannerClass}>{loadError}</div>
      )}
      {!loading && !loadError && employee && (
        <>
          {invitationMessage && (
            <div className="mb-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {invitationMessage}
            </div>
          )}
          <EmployeeDetailView
            branches={branches}
            departments={departments}
            designations={designations}
            employee={employee}
            grades={grades}
            managerLabel={managerLabel}
            onboardingHref={
              showOnboardingLink
                ? `/employees/${employee.id}/onboarding`
                : undefined
            }
            onResendInvitation={() => void handleResendInvitation()}
            resendingInvitation={resendingInvitation}
            variant="page"
          />
        </>
      )}
    </>
  );
}
