"use client";

import { PlusCircle, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddPermissionModal from "@/features/access-control/components/AddPermissionModal";
import EditPermissionModal from "@/features/access-control/components/EditPermissionModal";
import PermissionsTable from "@/features/access-control/components/PermissionsTable";
import ViewPermissionModal from "@/features/access-control/components/ViewPermissionModal";
import {
  fetchPermissions,
  PERMISSION_MODULES,
  type PermissionListItem,
} from "@/features/access-control/api/permissions.client";
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

const ALL_STATUS = "All";
const ALL_MODULES = "All";

export default function AddPermissionPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionListItem[]>([]);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState(ALL_MODULES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);

  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadPermissions = useCallback(async () => {
    try {
      const rows = await fetchPermissions();
      setPermissions(rows);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((perm) => {
      if (moduleFilter !== ALL_MODULES && perm.module !== moduleFilter) {
        return false;
      }
      if (statusFilter === "Active" && !perm.isActive) return false;
      if (statusFilter === "Inactive" && perm.isActive) return false;
      if (!q) return true;
      const haystack = [
        perm.code,
        perm.name,
        perm.module,
        perm.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [permissions, search, moduleFilter, statusFilter]);

  function resetFilters() {
    setSearch("");
    setModuleFilter(ALL_MODULES);
    setStatusFilter(ALL_STATUS);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={employeeFilterLabelClass} htmlFor="perm-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeInputClass} pl-10`}
                id="perm-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions..."
                type="text"
                value={search}
              />
              <Search
                className={`${employeeIconSm} text-gray-400 absolute left-3 top-1/2 -translate-y-1/2`}
              />
            </div>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="perm-module">
              Module
            </label>
            <select
              className={employeeSelectClass}
              id="perm-module"
              onChange={(e) => setModuleFilter(e.target.value)}
              value={moduleFilter}
            >
              <option value={ALL_MODULES}>All Modules</option>
              {PERMISSION_MODULES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="perm-status">
              Status
            </label>
            <select
              className={employeeSelectClass}
              id="perm-status"
              onChange={(e) => setStatusFilter(e.target.value)}
              value={statusFilter}
            >
              <option value={ALL_STATUS}>All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
            Add Permission
          </button>
        </div>
      </div>

      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load permissions: {loadError}
        </div>
      )}

      {loading ? (
        <div className={employeeLoadingClass}>Loading permissions…</div>
      ) : (
        <PermissionsTable
          key={`${search}-${moduleFilter}-${statusFilter}`}
          onEdit={openEdit}
          onView={openView}
          permissions={filteredPermissions}
        />
      )}

      <ViewPermissionModal
        onClose={() => setViewId(null)}
        onEdit={switchViewToEdit}
        open={viewId != null}
        permissionId={viewId}
      />

      <EditPermissionModal
        onClose={() => setEditId(null)}
        onSaved={() => void loadPermissions()}
        open={editId != null}
        permissionId={editId}
      />

      <AddPermissionModal
        onClose={() => setAddOpen(false)}
        onSaved={() => void loadPermissions()}
        open={addOpen}
      />
    </>
  );
}
