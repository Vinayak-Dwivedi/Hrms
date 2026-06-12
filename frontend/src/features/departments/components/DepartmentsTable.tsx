"use client";

import { Eye, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { DepartmentListItem } from "../api/departments.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconSm,
  employeeListPaginationBtnActiveClass,
  employeeListPaginationBtnClass,
  employeeListPaginationBtnInactiveClass,
  employeeListTableCellClass,
  employeeListTableEmptyClass,
  employeeListTableFooterClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
  employeeListTableSummaryClass,
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
              {["Name", "Manager", "Branch", "Headcount", "Action"].map((h) => (
                <th key={h} className={employeeListTableHeadClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className={employeeListTableEmptyClass}>
                  No departments found.
                </td>
              </tr>
            ) : (
              pageRows.map((dept) => (
                <tr key={dept.id} className={employeeListTableRowClass}>
                  <td className={`${employeeListTableCellClass} font-medium`}>
                    {dept.name}
                  </td>
                  <td className={employeeListTableCellClass}>
                    {dept.managerId != null
                      ? (managerNames.get(dept.managerId) ?? "—")
                      : "—"}
                  </td>
                  <td className={employeeListTableCellClass}>
                    {dept.locationArea ?? "—"}
                  </td>
                  <td className={employeeListTableCellClass}>
                    {dept.headcount === 0 ? "—" : dept.headcount}
                  </td>
                  <td className={employeeListTableCellClass}>
                    <div className="flex items-center gap-3">
                      <button
                        aria-label={`View ${dept.name}`}
                        className={employeeViewIconBtnClass}
                        onClick={() => onView(dept.id)}
                        title="View"
                        type="button"
                      >
                        <Eye className={employeeIconSm} />
                      </button>
                      <button
                        aria-label={`Edit ${dept.name}`}
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(dept.id)}
                        title="Edit"
                        type="button"
                      >
                        <Pencil className={employeeIconSm} />
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
        <div className={employeeListTableFooterClass}>
          <p className={employeeListTableSummaryClass}>
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{departments.length}</span> results
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
                  className={
                    p === safePage
                      ? employeeListPaginationBtnActiveClass
                      : employeeListPaginationBtnInactiveClass
                  }
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
