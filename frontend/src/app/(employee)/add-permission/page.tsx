"use client";

import { PlusCircle, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddPermissionModal from "@/features/access-control/components/AddPermissionModal";
import EditPermissionModal from "@/features/access-control/components/EditPermissionModal";
import PermissionsTable from "@/features/access-control/components/PermissionsTable";
import ViewPermissionModal from "@/features/access-control/components/ViewPermissionModal";
import {
  deletePermission,
  fetchPermissions,
  PERMISSION_MODULES,
  type PermissionListItem,
} from "@/features/access-control/api/permissions.client";
import { toast } from "sonner";
import {
  employeeBtnSmClass,
  employeeCardClass,
  employeeIconXs,
  employeeListErrorBannerClass,
  employeeListFilterLabelClass,
  employeeListInputClass,
  employeeListLoadingClass,
  employeeListResetBtnClass,
  employeeListSelectClass,
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

  async function handleDelete(id: number) {
    if (
      !window.confirm(
        "Delete this permission permanently? It will be removed from all roles.",
      )
    ) {
      return;
    }
    try {
      await deletePermission(id);
      toast.success("Permission deleted.");
      if (viewId === id) setViewId(null);
      if (editId === id) setEditId(null);
      await loadPermissions();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={employeeListFilterLabelClass} htmlFor="perm-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeListInputClass} pl-8`}
                id="perm-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions..."
                type="text"
                value={search}
              />
              <Search
                className={`${employeeIconXs} text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2`}
              />
            </div>
          </div>

          <div>
            <label className={employeeListFilterLabelClass} htmlFor="perm-module">
              Module
            </label>
            <select
              className={employeeListSelectClass}
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
            <label className={employeeListFilterLabelClass} htmlFor="perm-status">
              Status
            </label>
            <select
              className={employeeListSelectClass}
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
            className={employeeListResetBtnClass}
            onClick={resetFilters}
            type="button"
          >
            <RotateCcw className={employeeIconXs} />
            Reset Filters
          </button>
          <button className={employeeBtnSmClass} onClick={openAdd} type="button">
            <PlusCircle className={employeeIconXs} />
            Add Permission
          </button>
        </div>
      </div>

      {loadError && (
        <div className={employeeListErrorBannerClass}>
          Failed to load permissions: {loadError}
        </div>
      )}

      {loading ? (
        <div className={employeeListLoadingClass}>Loading permissions…</div>
      ) : (
        <PermissionsTable
          key={`${search}-${moduleFilter}-${statusFilter}`}
          onDelete={(id) => void handleDelete(id)}
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
