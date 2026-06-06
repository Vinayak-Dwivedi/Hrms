"use client";

import { PlusCircle, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddDepartmentModal from "@/features/departments/components/AddDepartmentModal";
import DepartmentsTable from "@/features/departments/components/DepartmentsTable";
import EditDepartmentModal from "@/features/departments/components/EditDepartmentModal";
import ViewDepartmentModal from "@/features/departments/components/ViewDepartmentModal";
import {
  fetchDepartmentsList,
  type DepartmentListItem,
} from "@/features/departments/api/departments.client";
import {
  fetchBranches,
  fetchEmployees,
  formatEmployeeDisplayName,
  type EmployeeListItem,
  type LookupItem,
} from "@/features/employees/api/employees.client";
import {
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

const ALL_BRANCHES = "All";

export default function DepartmentsPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [managerNames, setManagerNames] = useState<Map<number, string>>(
    new Map(),
  );

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES);

  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadDepartments = useCallback(async () => {
    try {
      const [rows, employeeRows, branchRows] = await Promise.all([
        fetchDepartmentsList(),
        fetchEmployees(),
        fetchBranches(),
      ]);
      setDepartments(rows);
      setEmployees(employeeRows);
      setBranches(branchRows);
      setManagerNames(
        new Map(
          employeeRows.map((emp) => [emp.id, formatEmployeeDisplayName(emp)]),
        ),
      );
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments.filter((dept) => {
      if (
        branchFilter !== ALL_BRANCHES &&
        (dept.locationArea ?? "") !== branchFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [dept.name, dept.locationArea ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [departments, search, branchFilter]);

  function resetFilters() {
    setSearch("");
    setBranchFilter(ALL_BRANCHES);
  }

  function openView(id: number) {
    setEditId(null);
    setAddOpen(false);
    setViewId(id);
  }

  function openEdit(id: number) {
    setViewId(null);
    setAddOpen(false);
    setEditId(id);
  }

  function openAdd() {
    setViewId(null);
    setEditId(null);
    setAddOpen(true);
  }

  function switchViewToEdit(id: number) {
    setViewId(null);
    setEditId(id);
  }

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={employeeFilterLabelClass} htmlFor="dept-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeInputClass} pl-10`}
                id="dept-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search departments..."
                type="text"
                value={search}
              />
              <Search
                className={`${employeeIconSm} text-gray-400 absolute left-3 top-1/2 -translate-y-1/2`}
              />
            </div>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="dept-branch">
              Branch
            </label>
            <select
              className={employeeSelectClass}
              id="dept-branch"
              onChange={(e) => setBranchFilter(e.target.value)}
              value={branchFilter}
            >
              <option value={ALL_BRANCHES}>All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
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
          <button className={employeeBtnSmClass} onClick={openAdd} type="button">
            <PlusCircle className={employeeIconXs} />
            Add Department
          </button>
        </div>
      </div>

      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load departments: {loadError}
        </div>
      )}

      {loading ? (
        <div className={employeeLoadingClass}>Loading departments…</div>
      ) : (
        <DepartmentsTable
          key={`${search}-${branchFilter}`}
          departments={filteredDepartments}
          managerNames={managerNames}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      <ViewDepartmentModal
        departmentId={viewId}
        managerNames={managerNames}
        onClose={() => setViewId(null)}
        onEdit={switchViewToEdit}
        open={viewId != null}
      />

      <EditDepartmentModal
        branches={branches}
        departmentId={editId}
        employees={employees}
        onClose={() => setEditId(null)}
        onSaved={() => void loadDepartments()}
        open={editId != null}
      />

      <AddDepartmentModal
        branches={branches}
        employees={employees}
        onClose={() => setAddOpen(false)}
        onSaved={() => void loadDepartments()}
        open={addOpen}
      />
    </>
  );
}
