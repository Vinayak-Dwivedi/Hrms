"use client";

import { Ban, CheckCircle2, ClipboardList, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatEmployeeDisplayName,
  formatOnboardingStatus,
  setEmployeeStatus,
  type EmployeeListItem,
  type EmployeeStatus,
} from "../api/employees.client";
import { type OrgHierarchyRoleLookups } from "@/features/org-hierarchy/lib/org-hierarchy-role";
import { resolveEmployeeListRoleDisplay } from "../lib/resolve-employee-org-role";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconSm,
  employeeListPaginationBtnActiveClass,
  employeeListPaginationBtnClass,
  employeeListPaginationBtnInactiveClass,
  employeeViewIconBtnClass,
} from "../employee-theme";
import { cn } from "@/lib/utils";

export type EmployeeTablePagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

interface Props {
  employees: EmployeeListItem[];
  orgLookups: OrgHierarchyRoleLookups | null;
  departmentNames: Map<number, string>;
  designationNames: Map<number, string>;
  showOnboardingAction?: boolean;
  canEditEmployees?: boolean;
  onStatusChanged?: () => void | Promise<void>;
  pagination?: EmployeeTablePagination;
}

const STATUS_CLASS: Record<EmployeeStatus, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-red-100 text-red-700",
  Probation: "bg-blue-100 text-blue-700",
  Notice: "bg-yellow-100 text-yellow-700",
  Exited: "bg-gray-100 text-gray-600",
};

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeTable({
  employees,
  orgLookups,
  departmentNames,
  designationNames,
  showOnboardingAction = false,
  canEditEmployees = false,
  onStatusChanged,
  pagination,
}: Props) {
  const [internalPage, setInternalPage] = useState(1);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const pageSize = pagination?.pageSize ?? PAGE_SIZE;
  const totalCount = pagination?.totalCount ?? employees.length;
  const page = pagination?.page ?? internalPage;
  const setPage = pagination?.onPageChange ?? setInternalPage;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = useMemo(
    () => (pagination ? employees : employees.slice(start, start + pageSize)),
    [employees, pagination, start, pageSize],
  );

  const rangeStart = totalCount === 0 ? 0 : start + 1;
  const rangeEnd = pagination
    ? Math.min(start + pageRows.length, totalCount)
    : Math.min(start + pageSize, employees.length);

  async function handleToggleEmployeeStatus(emp: EmployeeListItem) {
    if (emp.employeeStatus === "Exited") return;

    const nextStatus: "Active" | "Inactive" =
      emp.employeeStatus === "Inactive" ? "Active" : "Inactive";
    const displayName = formatEmployeeDisplayName(emp);

    if (nextStatus === "Inactive") {
      if (
        !window.confirm(
          `Mark ${displayName} as inactive? They will no longer be able to sign in.`,
        )
      ) {
        return;
      }
    } else if (
      !window.confirm(`Reactivate ${displayName}? They will be able to sign in again.`)
    ) {
      return;
    }

    setStatusUpdatingId(emp.id);
    try {
      await setEmployeeStatus(emp.id, nextStatus);
      await onStatusChanged?.();
    } catch (e) {
      window.alert((e as Error).message ?? "Could not update employee status.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-nowrap">
              {[
                "Emp ID",
                "Name",
                "Work Email",
                "Phone",
                "Department",
                "Designation",
                "Status",
                "Onboarding",
                "Joined",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-[13px] text-gray-400"
                >
                  No employees found.
                </td>
              </tr>
            ) : (
              pageRows.map((emp) => {
                const roleDisplay = orgLookups
                  ? resolveEmployeeListRoleDisplay(
                      emp,
                      orgLookups,
                      departmentNames,
                      designationNames,
                    )
                  : {
                      department:
                        emp.departmentId != null
                          ? (departmentNames.get(emp.departmentId) ?? "—")
                          : "—",
                      designation:
                        emp.designationId != null
                          ? (designationNames.get(emp.designationId) ?? "—")
                          : "—",
                    };

                return (
                <tr
                  key={emp.id}
                  className="hover:bg-slate-50 transition-colors text-[13px] text-slate-600"
                >
                  <td className="px-4 py-2.5">{emp.empId}</td>
                  <td className="px-4 py-2.5">
                    {formatEmployeeDisplayName(emp)}
                  </td>
                  <td className="px-4 py-2.5">{emp.workEmail ?? "—"}</td>
                  <td className="px-4 py-2.5">{emp.phone}</td>
                  <td className="px-4 py-2.5">{roleDisplay.department}</td>
                  <td className="px-4 py-2.5">{roleDisplay.designation}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${STATUS_CLASS[emp.employeeStatus]}`}
                    >
                      {emp.employeeStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-700">
                      {formatOnboardingStatus(emp.onboardingStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{fmtDate(emp.joiningDate)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Link
                        aria-label={`View ${emp.firstName} ${emp.lastName}`}
                        className={employeeViewIconBtnClass}
                        href={`/employees/${emp.id}`}
                        title="View"
                      >
                        <Eye className={employeeIconSm} />
                      </Link>
                      <Link
                        aria-label={`Edit ${emp.firstName} ${emp.lastName}`}
                        className={employeeEditIconBtnClass}
                        href={`/employees/${emp.id}/edit`}
                        title="Edit"
                      >
                        <Pencil className={employeeIconSm} />
                      </Link>
                      {showOnboardingAction &&
                        emp.onboardingStatus !== "COMPLETED" && (
                        <Link
                          aria-label={`Onboarding for ${emp.firstName} ${emp.lastName}`}
                          className={employeeEditIconBtnClass}
                          href={`/employees/${emp.id}/onboarding`}
                          title="Onboarding"
                        >
                          <ClipboardList className={employeeIconSm} />
                        </Link>
                      )}
                      {canEditEmployees && emp.employeeStatus !== "Exited" && (
                        <button
                          aria-label={
                            emp.employeeStatus === "Inactive"
                              ? `Activate ${emp.firstName} ${emp.lastName}`
                              : `Mark ${emp.firstName} ${emp.lastName} inactive`
                          }
                          className={cn(
                            "bg-transparent border-0 cursor-pointer p-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                            emp.employeeStatus === "Inactive"
                              ? "text-emerald-600 hover:text-emerald-800"
                              : "text-amber-600 hover:text-amber-800",
                          )}
                          disabled={statusUpdatingId === emp.id}
                          onClick={() => void handleToggleEmployeeStatus(emp)}
                          title={
                            emp.employeeStatus === "Inactive"
                              ? "Activate"
                              : "Mark inactive"
                          }
                          type="button"
                        >
                          {emp.employeeStatus === "Inactive" ? (
                            <CheckCircle2 className={employeeIconSm} />
                          ) : (
                            <Ban className={employeeIconSm} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
          <p className="text-[13px] text-slate-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{totalCount}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className={employeeListPaginationBtnClass}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              type="button"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  className={cn(
                    p === safePage
                      ? employeeListPaginationBtnActiveClass
                      : employeeListPaginationBtnInactiveClass,
                  )}
                  onClick={() => setPage(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            <button
              className={employeeListPaginationBtnClass}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
