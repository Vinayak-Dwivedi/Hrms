"use client";

import { Eye, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { DepartmentListItem } from "../api/departments.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconMd,
  employeeIconPen,
  employeeViewIconBtnClass,
} from "@/features/employees/employee-theme";

interface Props {
  departments: DepartmentListItem[];
  managerNames: Map<number, string>;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
}

const PAGE_SIZE = 10;

export default function DepartmentsTable({
  departments,
  managerNames,
  onView,
  onEdit,
}: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(departments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => departments.slice(start, start + PAGE_SIZE),
    [departments, start],
  );

  const rangeStart = departments.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, departments.length);

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-nowrap">
              {["Name", "Manager", "Branch", "Headcount", "Action"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  No departments found.
                </td>
              </tr>
            ) : (
              pageRows.map((dept) => (
                <tr
                  key={dept.id}
                  className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
                >
                  <td className="px-6 py-4 font-medium">{dept.name}</td>
                  <td className="px-6 py-4">
                    {dept.managerId != null
                      ? (managerNames.get(dept.managerId) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-6 py-4">{dept.locationArea ?? "—"}</td>
                  <td className="px-6 py-4">
                    {dept.headcount === 0 ? "—" : dept.headcount}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        aria-label={`View ${dept.name}`}
                        className={employeeViewIconBtnClass}
                        onClick={() => onView(dept.id)}
                        title="View"
                        type="button"
                      >
                        <Eye className={employeeIconMd} />
                      </button>
                      <button
                        aria-label={`Edit ${dept.name}`}
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(dept.id)}
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

      {departments.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{departments.length}</span> results
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
