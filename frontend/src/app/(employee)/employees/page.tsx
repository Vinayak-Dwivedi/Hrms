"use client";

import Link from "next/link";
import { PlusCircle, RotateCcw, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import BulkUploadEmployeeModal from "@/features/employees/components/BulkUploadEmployeeModal";
import EditEmployeeModal from "@/features/employees/components/EditEmployeeModal";
import EmployeeTable from "@/features/employees/components/EmployeeTable";
import ViewEmployeeModal from "@/features/employees/components/ViewEmployeeModal";
import {
  employeeBtnOutlineSmClass,
  employeeBtnSmClass,
  employeeCardClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeIconSm,
  employeeIconXs,
  employeeInputClass,
  employeeLoadingClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";
import {
  fetchDepartments,
  fetchDesignations,
  fetchEmployees,
  type EmployeeStatus,
  type LookupItem,
  type OnboardingPipelineStatus,
} from "@/features/employees/api/employees.client";

const ALL_STATUS = "All";
const ALL_ONBOARDING = "All";

export default function EmployeesPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<
    Awaited<ReturnType<typeof fetchEmployees>>
  >([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [onboardingFilter, setOnboardingFilter] =
    useState<string>(ALL_ONBOARDING);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");

  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("hrms.openBulkUpload") === "1") {
      sessionStorage.removeItem("hrms.openBulkUpload");
      setBulkUploadOpen(true);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const [empsResult, deptsResult, desigsResult] = await Promise.allSettled([
        fetchEmployees(),
        fetchDepartments(),
        fetchDesignations(),
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

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (statusFilter !== ALL_STATUS && emp.employeeStatus !== statusFilter) {
        return false;
      }
      if (
        onboardingFilter !== ALL_ONBOARDING &&
        emp.onboardingStatus !== onboardingFilter
      ) {
        return false;
      }
      if (
        departmentFilter &&
        String(emp.departmentId ?? "") !== departmentFilter
      ) {
        return false;
      }
      if (
        designationFilter &&
        String(emp.designationId ?? "") !== designationFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        emp.empId,
        emp.firstName,
        emp.lastName,
        emp.workEmail ?? "",
        emp.phone,
        departmentNames.get(emp.departmentId ?? -1) ?? "",
        designationNames.get(emp.designationId ?? -1) ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    employees,
    search,
    statusFilter,
    onboardingFilter,
    departmentFilter,
    designationFilter,
    departmentNames,
    designationNames,
  ]);

  function resetFilters() {
    setSearch("");
    setStatusFilter(ALL_STATUS);
    setOnboardingFilter(ALL_ONBOARDING);
    setDepartmentFilter("");
    setDesignationFilter("");
  }

  function openView(id: number) {
    setEditId(null);
    setViewId(id);
  }

  function openEdit(id: number) {
    setViewId(null);
    setEditId(id);
  }

  function openBulkUpload() {
    setViewId(null);
    setEditId(null);
    setBulkUploadOpen(true);
  }

  function closeBulkUpload() {
    setBulkUploadOpen(false);
  }

  function switchViewToEdit(id: number) {
    setViewId(null);
    setEditId(id);
  }

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={employeeFilterLabelClass} htmlFor="emp-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeInputClass} pl-10`}
                id="emp-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                type="text"
                value={search}
              />
              <Search className={`${employeeIconSm} text-gray-400 absolute left-3 top-1/2 -translate-y-1/2`} />
            </div>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="emp-status">
              Status
            </label>
            <select
              className={employeeSelectClass}
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
              className={employeeFilterLabelClass}
              htmlFor="emp-onboarding"
            >
              Onboarding
            </label>
            <select
              className={employeeSelectClass}
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
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="emp-dept">
              Department
            </label>
            <select
              className={employeeSelectClass}
              id="emp-dept"
              onChange={(e) => setDepartmentFilter(e.target.value)}
              value={departmentFilter}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="emp-desig">
              Designation
            </label>
            <select
              className={employeeSelectClass}
              id="emp-desig"
              onChange={(e) => setDesignationFilter(e.target.value)}
              value={designationFilter}
            >
              <option value="">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors bg-transparent border-0 cursor-pointer"
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
          key={`${search}-${statusFilter}-${departmentFilter}-${designationFilter}`}
          departmentNames={departmentNames}
          designationNames={designationNames}
          employees={filteredEmployees}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      <ViewEmployeeModal
        employeeId={viewId}
        onClose={() => setViewId(null)}
        onEdit={switchViewToEdit}
        open={viewId != null}
      />

      <EditEmployeeModal
        employeeId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => void loadEmployees()}
        open={editId != null}
      />

      <BulkUploadEmployeeModal
        onClose={closeBulkUpload}
        onSuccess={() => void loadEmployees()}
        open={bulkUploadOpen}
      />
    </>
  );
}
