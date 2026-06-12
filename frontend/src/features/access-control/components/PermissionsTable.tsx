"use client";

import { Eye, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { PermissionListItem } from "../api/permissions.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconSm,
  employeeListPaginationBtnActiveClass,
  employeeListPaginationBtnClass,
  employeeListPaginationBtnInactiveClass,
  employeeListTableBadgeClass,
  employeeListTableCellClass,
  employeeListTableEmptyClass,
  employeeListTableFooterClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
  employeeListTableSummaryClass,
  employeeViewIconBtnClass,
} from "@/features/employees/employee-theme";

interface Props {
  permissions: PermissionListItem[];
  onView: (id: number) => void;
  onEdit: (id: number) => void;
}

const PAGE_SIZE = 10;

export default function PermissionsTable({
  permissions,
  onView,
  onEdit,
}: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(permissions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => permissions.slice(start, start + PAGE_SIZE),
    [permissions, start],
  );

  const rangeStart = permissions.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, permissions.length);

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-nowrap">
              {["Code", "Name", "Module", "Description", "Status", "Action"].map(
                (h) => (
                  <th key={h} className={employeeListTableHeadClass}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className={employeeListTableEmptyClass}>
                  No permissions found.
                </td>
              </tr>
            ) : (
              pageRows.map((perm) => (
                <tr key={perm.id} className={employeeListTableRowClass}>
                  <td className={`${employeeListTableCellClass} font-mono text-[11px]`}>
                    {perm.code}
                  </td>
                  <td className={employeeListTableCellClass}>{perm.name}</td>
                  <td className={`${employeeListTableCellClass} capitalize`}>
                    {perm.module}
                  </td>
                  <td className={`${employeeListTableCellClass} max-w-xs truncate`}>
                    {perm.description ?? "—"}
                  </td>
                  <td className={employeeListTableCellClass}>
                    <span
                      className={`${employeeListTableBadgeClass} ${
                        perm.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {perm.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={employeeListTableCellClass}>
                    <div className="flex items-center gap-3">
                      <button
                        aria-label={`View ${perm.name}`}
                        className={employeeViewIconBtnClass}
                        onClick={() => onView(perm.id)}
                        title="View"
                        type="button"
                      >
                        <Eye className={employeeIconSm} />
                      </button>
                      <button
                        aria-label={`Edit ${perm.name}`}
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(perm.id)}
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

      {permissions.length > 0 && (
        <div className={employeeListTableFooterClass}>
          <p className={employeeListTableSummaryClass}>
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{permissions.length}</span> results
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
