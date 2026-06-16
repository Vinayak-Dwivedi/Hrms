"use client";

import { ClipboardList, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatEmployeeDisplayName,
  formatOnboardingStatus,
  type EmployeeListItem,
  type EmployeeStatus,
} from "../api/employees.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconSm,
  employeeViewIconBtnClass,
} from "../employee-theme";

interface Props {
  employees: EmployeeListItem[];
  departmentNames: Map<number, string>;
  designationNames: Map<number, string>;
  showOnboardingAction?: boolean;
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
  departmentNames,
  designationNames,
  showOnboardingAction = false,
}: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => employees.slice(start, start + PAGE_SIZE),
    [employees, start],
  );

  const rangeStart = employees.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, employees.length);

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px]">
          <thead className="bg-gray-50 border-b border-gray-100">
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
                  className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
              pageRows.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 transition-colors text-[13px] text-gray-600"
                >
                  <td className="px-4 py-2.5">{emp.empId}</td>
                  <td className="px-4 py-2.5">
                    {formatEmployeeDisplayName(emp)}
                  </td>
                  <td className="px-4 py-2.5">{emp.workEmail ?? "â€”"}</td>
                  <td className="px-4 py-2.5">{emp.phone}</td>
                  <td className="px-4 py-2.5">
                    {emp.departmentId != null
                      ? (departmentNames.get(emp.departmentId) ?? "â€”")
                      : "â€”"}
                  </td>
                  <td className="px-4 py-2.5">
                    {emp.designationId != null
                      ? (designationNames.get(emp.designationId) ?? "â€”")
                      : "â€”"}
                  </td>
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
                      {showOnboardingAction && (
                        <Link
                          aria-label={`Onboarding for ${emp.firstName} ${emp.lastName}`}
                          className="text-pink-700 hover:text-pink-800 bg-transparent border-0 cursor-pointer p-0 transition-colors"
                          href={`/employees/${emp.id}/onboarding`}
                          title="Onboarding"
                        >
                          <ClipboardList className={employeeIconSm} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {employees.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
          <p className="text-[13px] text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{employees.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-[13px] text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={[
                    "px-3 py-1.5 text-[13px] rounded-lg transition-colors border",
                    p === safePage
                      ? "text-white bg-[#ff014f] border-[#ff014f] hover:bg-[#eb0249]"
                      : "text-gray-600 bg-white border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                  onClick={() => setPage(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            <button
              className="px-3 py-1.5 text-[13px] text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
