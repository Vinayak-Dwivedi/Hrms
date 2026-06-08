"use client";

import { Eye, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { PermissionListItem } from "../api/permissions.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconMd,
  employeeIconPen,
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
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  No permissions found.
                </td>
              </tr>
            ) : (
              pageRows.map((perm) => (
                <tr
                  key={perm.id}
                  className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
                >
                  <td className="px-6 py-4 font-mono text-xs">{perm.code}</td>
                  <td className="px-6 py-4">{perm.name}</td>
                  <td className="px-6 py-4 capitalize">{perm.module}</td>
                  <td className="px-6 py-4 max-w-xs truncate">
                    {perm.description ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        perm.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {perm.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        aria-label={`View ${perm.name}`}
                        className={employeeViewIconBtnClass}
                        onClick={() => onView(perm.id)}
                        title="View"
                        type="button"
                      >
                        <Eye className={employeeIconMd} />
                      </button>
                      <button
                        aria-label={`Edit ${perm.name}`}
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(perm.id)}
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

      {permissions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{permissions.length}</span> results
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
