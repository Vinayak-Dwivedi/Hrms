"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { LocationListItem } from "../api/locations.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconPen,
} from "@/features/employees/employee-theme";

interface Props {
  locations: LocationListItem[];
  onEdit: (id: number) => void;
  onDelete: (location: LocationListItem) => void;
}

const PAGE_SIZE = 10;

export default function LocationsTable({
  locations,
  onEdit,
  onDelete,
}: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(locations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => locations.slice(start, start + PAGE_SIZE),
    [locations, start],
  );

  const rangeStart = locations.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, locations.length);

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-nowrap">
              {["Name", "Address", "Headcount", "Action"].map((h) => (
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
                  colSpan={3}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  No locations found.
                </td>
              </tr>
            ) : (
              pageRows.map((location) => (
                <tr
                  key={location.id}
                  className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
                >
                  <td className="px-6 py-4 font-medium">{location.name}</td>
                  <td className="px-6 py-4 max-w-xs truncate">
                    {location.address ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    {location.headcount === 0 ? "—" : location.headcount}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        aria-label={`Edit ${location.name}`}
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(location.id)}
                        title="Edit"
                        type="button"
                      >
                        <Pencil className={employeeIconPen} />
                      </button>
                      <button
                        aria-label={`Delete ${location.name}`}
                        className="text-rose-500 hover:text-rose-700"
                        onClick={() => onDelete(location)}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className={employeeIconPen} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {locations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 m-0">
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{locations.length}</span> results
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
