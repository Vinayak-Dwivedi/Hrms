"use client";

import { useEffect, useMemo, useState } from "react";
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
  fetchDepartments,
  fetchDesignations,
  fetchEmployeeById,
  fetchEmployees,
  fetchGrades,
  formatEmployeeDisplayName,
  resendOnboardingInvitation,
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
    if (!open || employeeId == null) return;

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
  }, [open, employeeId]);

  const managerLabel = useMemo(() => {
    if (!employee?.reportingManagerId) return "—";
    const mgr = allEmployees.find((e) => e.id === employee.reportingManagerId);
    return mgr ? `${mgr.firstName} ${mgr.lastName} (${mgr.empId})` : "—";
  }, [allEmployees, employee?.reportingManagerId]);

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
            departments={departments}
            designations={designations}
            employee={employee}
            grades={grades}
            managerLabel={managerLabel}
            onEdit={() => onEdit(employee.id)}
            onResendInvitation={() => void handleResendInvitation()}
            resendingInvitation={resendingInvitation}
            variant="modal"
          />
          {showOnboardingPanel && (
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
