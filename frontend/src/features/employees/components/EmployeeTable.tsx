"use client";

import { Eye, Pencil } from "lucide-react";
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
  employeeIconMd,
  employeeIconPen,
  employeeViewIconBtnClass,
} from "../employee-theme";

interface Props {
  employees: EmployeeListItem[];
  departmentNames: Map<number, string>;
  designationNames: Map<number, string>;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
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
  onView,
  onEdit,
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
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
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
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  No employees found.
                </td>
              </tr>
            ) : (
              pageRows.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
                >
                  <td className="px-6 py-4">{emp.empId}</td>
                  <td className="px-6 py-4">
                    {formatEmployeeDisplayName(emp)}
                  </td>
                  <td className="px-6 py-4">{emp.workEmail ?? "—"}</td>
                  <td className="px-6 py-4">{emp.phone}</td>
                  <td className="px-6 py-4">
                    {emp.departmentId != null
                      ? (departmentNames.get(emp.departmentId) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {emp.designationId != null
                      ? (designationNames.get(emp.designationId) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_CLASS[emp.employeeStatus]}`}
                    >
                      {emp.employeeStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                      {formatOnboardingStatus(emp.onboardingStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{fmtDate(emp.joiningDate)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        aria-label={`View ${emp.firstName} ${emp.lastName}`}
                        className={employeeViewIconBtnClass}
                        onClick={() => onView(emp.id)}
                        title="View"
                        type="button"
                      >
                        <Eye className={employeeIconMd} />
                      </button>
                      <button
                        aria-label={`Edit ${emp.firstName} ${emp.lastName}`}
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(emp.id)}
                        title="Edit"
                        type="button"
                      >
                        <Pencil className={employeeIconPen} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {employees.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{employees.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    "px-4 py-2 text-sm rounded-lg transition-colors border",
                    p === safePage
                      ? "text-white bg-[#FF014F] border-[#FF014F] hover:bg-[#eb0249]"
                      : "text-gray-600 bg-white border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                  onClick={() => setPage(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            <button
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
