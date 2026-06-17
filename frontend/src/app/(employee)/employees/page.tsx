"use client";

import Link from "next/link";
import { PlusCircle, RotateCcw, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import BulkUploadEmployeeModal from "@/features/employees/components/BulkUploadEmployeeModal";
import EmployeeTable from "@/features/employees/components/EmployeeTable";
import { hasOnboardingPanelAccess } from "@/features/employees/components/OnboardingAdminPanel";
import { useAuth } from "@/lib/auth-context";
import {
  employeeBtnOutlineSmClass,
  employeeBtnSmClass,
  employeeCardClass,
  employeeErrorBannerClass,
  employeeIconSm,
  employeeIconXs,
  employeeListFilterLabelClass,
  employeeListInputClass,
  employeeListSelectClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchDepartments,
  fetchDesignations,
  fetchEmployees,
  formatOnboardingStatus,
  type EmployeeStatus,
  type LookupItem,
  type OnboardingPipelineStatus,
} from "@/features/employees/api/employees.client";
import {
  resolveEmployeeListRoleDisplay,
  resolveEmployeeOrgRoleIds,
} from "@/features/employees/lib/resolve-employee-org-role";
import {
  fetchOrgHierarchyRoleLookups,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/components/OrgHierarchyRoleFields";

const ALL_STATUS = "All";
const ALL_ONBOARDING = "All";

export default function EmployeesPage() {
  const { hasAnyPermission } = useAuth();
  const showOnboardingAction = hasOnboardingPanelAccess(hasAnyPermission);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<
    Awaited<ReturnType<typeof fetchEmployees>>
  >([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);
  const [orgLookups, setOrgLookups] = useState<OrgHierarchyRoleLookups | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [onboardingFilter, setOnboardingFilter] =
    useState<string>(ALL_ONBOARDING);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("hrms.openBulkUpload") === "1") {
      sessionStorage.removeItem("hrms.openBulkUpload");
      setBulkUploadOpen(true);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const [empsResult, deptsResult, desigsResult, orgResult] =
        await Promise.allSettled([
        fetchEmployees(),
        fetchDepartments(),
        fetchDesignations(),
        fetchOrgHierarchyRoleLookups(),
      ]);

      const failures: string[] = [];
      if (empsResult.status === "fulfilled") {
        setEmployees(empsResult.value);
      } else {
        failures.push(
          empsResult.reason instanceof Error
            ? empsResult.reason.message
            : "employees list",
        );
        setEmployees([]);
      }
      if (deptsResult.status === "fulfilled") {
        setDepartments(deptsResult.value);
      } else {
        failures.push(
          deptsResult.reason instanceof Error
            ? deptsResult.reason.message
            : "departments",
        );
        setDepartments([]);
      }
      if (desigsResult.status === "fulfilled") {
        setDesignations(desigsResult.value);
      } else {
        failures.push(
          desigsResult.reason instanceof Error
            ? desigsResult.reason.message
            : "designations",
        );
        setDesignations([]);
      }
      if (orgResult.status === "fulfilled") {
        setOrgLookups(orgResult.value);
      } else {
        failures.push(
          orgResult.reason instanceof Error
            ? orgResult.reason.message
            : "org hierarchy",
        );
        setOrgLookups(null);
      }

      setLoadError(failures.length > 0 ? failures.join("; ") : null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const departmentNames = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments],
  );
  const designationNames = useMemo(
    () => new Map(designations.map((d) => [d.id, d.name])),
    [designations],
  );

  const filterDepartments = useMemo(() => {
    if (orgLookups) {
      return orgLookups.departments.map((d) => ({ id: d.id, name: d.name }));
    }
    return departments;
  }, [orgLookups, departments]);

  const filterDesignations = useMemo(() => {
    if (orgLookups) {
      return orgLookups.designations.map((d) => ({ id: d.id, name: d.name }));
    }
    return designations;
  }, [orgLookups, designations]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (statusFilter !== ALL_STATUS && emp.employeeStatus !== statusFilter) {
        return false;
      }
      if (
        onboardingFilter !== ALL_ONBOARDING &&
        (emp.onboardingStatus ?? "PENDING") !== onboardingFilter
      ) {
        return false;
      }

      const roleIds =
        orgLookups != null
          ? resolveEmployeeOrgRoleIds(emp, orgLookups)
          : {
              departmentId: emp.departmentId,
              designationId: emp.designationId,
            };

      if (
        departmentFilter &&
        String(roleIds.departmentId ?? "") !== departmentFilter
      ) {
        return false;
      }
      if (
        designationFilter &&
        String(roleIds.designationId ?? "") !== designationFilter
      ) {
        return false;
      }

      if (!q) return true;

      const roleDisplay =
        orgLookups != null
          ? resolveEmployeeListRoleDisplay(
              emp,
              orgLookups,
              departmentNames,
              designationNames,
            )
          : {
              department: departmentNames.get(emp.departmentId ?? -1) ?? "",
              designation: designationNames.get(emp.designationId ?? -1) ?? "",
            };

      const haystack = [
        emp.empId,
        emp.firstName,
        emp.lastName,
        emp.workEmail ?? "",
        emp.phone,
        roleDisplay.department,
        roleDisplay.designation,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }).sort((a, b) => b.id - a.id);
  }, [
    employees,
    search,
    statusFilter,
    onboardingFilter,
    departmentFilter,
    designationFilter,
    departmentNames,
    designationNames,
    orgLookups,
  ]);

  function resetFilters() {
    setSearch("");
    setStatusFilter(ALL_STATUS);
    setOnboardingFilter(ALL_ONBOARDING);
    setDepartmentFilter("");
    setDesignationFilter("");
  }

  function openBulkUpload() {
    setBulkUploadOpen(true);
  }

  function closeBulkUpload() {
    setBulkUploadOpen(false);
  }

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={employeeListFilterLabelClass} htmlFor="emp-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeListInputClass} pl-8`}
                id="emp-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                type="text"
                value={search}
              />
              <Search className={`${employeeIconXs} text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2`} />
            </div>
          </div>

          <div>
            <label className={employeeListFilterLabelClass} htmlFor="emp-status">
              Status
            </label>
            <select
              className={employeeListSelectClass}
              id="emp-status"
              onChange={(e) => setStatusFilter(e.target.value)}
              value={statusFilter}
            >
              <option value={ALL_STATUS}>All Status</option>
              {(
                [
                  "Active",
                  "Inactive",
                  "Probation",
                  "Notice",
                  "Exited",
                ] as EmployeeStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={employeeListFilterLabelClass}
              htmlFor="emp-onboarding"
            >
              Onboarding
            </label>
            <select
              className={employeeListSelectClass}
              id="emp-onboarding"
              onChange={(e) => setOnboardingFilter(e.target.value)}
              value={onboardingFilter}
            >
              <option value={ALL_ONBOARDING}>All Onboarding</option>
              {(
                [
                  "PENDING",
                  "INVITATION_SENT",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "EXPIRED",
                ] as OnboardingPipelineStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {formatOnboardingStatus(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={employeeListFilterLabelClass} htmlFor="emp-dept">
              Department
            </label>
            <select
              className={employeeListSelectClass}
              id="emp-dept"
              onChange={(e) => setDepartmentFilter(e.target.value)}
              value={departmentFilter}
            >
              <option value="">All Departments</option>
              {filterDepartments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={employeeListFilterLabelClass} htmlFor="emp-desig">
              Designation
            </label>
            <select
              className={employeeListSelectClass}
              id="emp-desig"
              onChange={(e) => setDesignationFilter(e.target.value)}
              value={designationFilter}
            >
              <option value="">All Designations</option>
              {filterDesignations.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium text-[13px] transition-colors bg-transparent border-0 cursor-pointer"
            onClick={resetFilters}
            type="button"
          >
            <RotateCcw className={employeeIconSm} />
            Reset Filters
          </button>
          <div className="flex items-center gap-2">
            <button
              className={employeeBtnOutlineSmClass}
              onClick={openBulkUpload}
              type="button"
            >
              <Upload className={employeeIconXs} />
              Bulk Upload
            </button>
            <Link className={employeeBtnSmClass} href="/add-employee">
              <PlusCircle className={employeeIconXs} />
              Add Employee
            </Link>
          </div>
        </div>
      </div>

      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load employees: {loadError}
        </div>
      )}

      {loading ? (
        <div className={employeeLoadingClass}>Loading employees…</div>
      ) : (
        <EmployeeTable
          key={`${search}-${statusFilter}-${onboardingFilter}-${departmentFilter}-${designationFilter}`}
          departmentNames={departmentNames}
          designationNames={designationNames}
          employees={filteredEmployees}
          orgLookups={orgLookups}
          showOnboardingAction={showOnboardingAction}
        />
      )}

      <BulkUploadEmployeeModal
        onClose={closeBulkUpload}
        onSuccess={() => void loadEmployees()}
        open={bulkUploadOpen}
      />
    </>
  );
}
