"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchOrgHierarchyRoleLookups,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/components/OrgHierarchyRoleFields";
import {
  fetchEmployeeShift,
  formatEmployeeShiftLabel,
} from "@/features/shift-configuration/api/employee-shift.client";
import EmployeeDetailView from "./EmployeeDetailView";
import EmployeeModalShell from "./EmployeeModalShell";
import {
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import OnboardingAdminPanel, {
  hasOnboardingPanelAccess,
} from "./OnboardingAdminPanel";
import { useAuth } from "@/lib/auth-context";
import {
  fetchBranches,
  fetchEmployeeById,
  fetchEmployees,
  fetchRoleOptions,
  formatEmployeeDisplayName,
  isOnboardingCompleted,
  resendOnboardingInvitation,
  resolveSystemAccessRoleLabel,
  type EmployeeDetail,
  type LookupItem,
} from "../api/employees.client";

interface Props {
  employeeId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  onOnboardingCompleted?: () => void;
}

export default function ViewEmployeeModal({
  employeeId,
  open,
  onClose,
  onEdit,
  onOnboardingCompleted,
}: Props) {
  const { hasAnyPermission } = useAuth();
  const showOnboardingPanel = hasOnboardingPanelAccess(hasAnyPermission);

  const [loading, setLoading] = useState(false);
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
    if (!open || employeeId == null) return;

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
  }, [open, employeeId]);

  const managerLabel = useMemo(() => {
    if (!employee?.reportingManagerId) return "—";
    const mgr = allEmployees.find((e) => e.id === employee.reportingManagerId);
    return mgr ? `${mgr.firstName} ${mgr.lastName} (${mgr.empId})` : "—";
  }, [allEmployees, employee?.reportingManagerId]);

  const systemAccessRoleLabel = useMemo(() => {
    if (!employee) return "—";
    return resolveSystemAccessRoleLabel(employee, roleOptions);
  }, [employee, roleOptions]);

  const title =
    employee != null
      ? formatEmployeeDisplayName(employee)
      : "Employee Details";

  async function handleResendInvitation() {
    if (employeeId == null) return;
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
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && <div className={employeeLoadingClass}>Loading employee…</div>}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && employee && (
        <>
          {invitationMessage && (
            <div className="mx-6 mt-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
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
            onEdit={() => onEdit(employee.id)}
            onResendInvitation={
              employee && !isOnboardingCompleted(employee)
                ? () => void handleResendInvitation()
                : undefined
            }
            resendingInvitation={resendingInvitation}
            variant="modal"
          />
          {showOnboardingPanel &&
            employee &&
            !isOnboardingCompleted(employee) && (
            <div className="px-6 pb-6">
              <OnboardingAdminPanel
                employeeId={employee.id}
                onUpdated={async () => {
                  const emp = await fetchEmployeeById(employee.id);
                  setEmployee(emp);
                }}
                onOnboardingCompleted={onOnboardingCompleted}
              />
            </div>
          )}
        </>
      )}
    </EmployeeModalShell>
  );
}
