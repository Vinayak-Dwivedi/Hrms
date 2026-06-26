"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchOrgHierarchyRoleLookups,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/components/OrgHierarchyRoleFields";
import {
  fetchEmployeeShift,
  formatEmployeeShiftLabel,
} from "@/features/shift-configuration/api/employee-shift.client";
import {
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import {
  fetchBranches,
  fetchEmployeeById,
  fetchEmployees,
  fetchRoleOptions,
  isOnboardingCompleted,
  resendOnboardingInvitation,
  resolveSystemAccessRoleLabel,
  type EmployeeDetail,
  type LookupItem,
} from "../api/employees.client";
import EmployeeDetailView from "./EmployeeDetailView";

interface Props {
  employeeId: number;
}

export default function ViewEmployeePageContent({ employeeId }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [orgLookups, setOrgLookups] = useState<OrgHierarchyRoleLookups>({
    departments: [],
    subDepartments: [],
    designations: [],
    levels: [],
    structures: [],
  });
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [roleOptions, setRoleOptions] = useState<LookupItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<
    Awaited<ReturnType<typeof fetchEmployees>>
  >([]);
  const [resendingInvitation, setResendingInvitation] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState<string | null>(
    null,
  );
  const [shiftLabel, setShiftLabel] = useState<string>("—");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const [emp, org, brs, roles, emps, shift] = await Promise.all([
          fetchEmployeeById(employeeId),
          fetchOrgHierarchyRoleLookups(),
          fetchBranches(),
          fetchRoleOptions(),
          fetchEmployees(),
          fetchEmployeeShift(employeeId).catch(() => null),
        ]);
        if (cancelled) return;
        setEmployee(emp);
        setOrgLookups(org);
        setBranches(brs);
        setRoleOptions(roles);
        setAllEmployees(emps);
        setShiftLabel(formatEmployeeShiftLabel(shift));
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

  const systemAccessRoleLabel = useMemo(() => {
    if (!employee) return "—";
    return resolveSystemAccessRoleLabel(employee, roleOptions);
  }, [employee, roleOptions]);

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
            employee={employee}
            managerLabel={managerLabel}
            orgLookups={orgLookups}
            shiftLabel={shiftLabel}
            systemAccessRoleLabel={systemAccessRoleLabel}
            onResendInvitation={
              !isOnboardingCompleted(employee)
                ? () => void handleResendInvitation()
                : undefined
            }
            resendingInvitation={resendingInvitation}
            variant="page"
          />
        </>
      )}
    </>
  );
}
