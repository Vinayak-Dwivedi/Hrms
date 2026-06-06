"use client";

import { PlusCircle, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddRoleModal from "@/features/access-control/components/AddRoleModal";
import EditRoleModal from "@/features/access-control/components/EditRoleModal";
import RolesTable from "@/features/access-control/components/RolesTable";
import ViewRoleModal from "@/features/access-control/components/ViewRoleModal";
import {
  fetchRolePermissionMap,
  fetchRoles,
  type RoleListItem,
} from "@/features/access-control/api/roles.client";
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

export default function UserRolesPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [permissionMap, setPermissionMap] = useState<Record<number, number[]>>(
    {},
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);

  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      const [rows, map] = await Promise.all([
        fetchRoles(),
        fetchRolePermissionMap(),
      ]);
      setRoles(rows);
      setPermissionMap(map);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const permissionCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const [roleIdStr, ids] of Object.entries(permissionMap)) {
      counts.set(Number(roleIdStr), ids.length);
    }
    return counts;
  }, [permissionMap]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((role) => {
      if (statusFilter === "Active" && !role.isActive) return false;
      if (statusFilter === "Inactive" && role.isActive) return false;
      if (!q) return true;
      const haystack = [role.code, role.name, role.description ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [roles, search, statusFilter]);

  function resetFilters() {
    setSearch("");
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={employeeFilterLabelClass} htmlFor="role-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeInputClass} pl-10`}
                id="role-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                type="text"
                value={search}
              />
              <Search
                className={`${employeeIconSm} text-gray-400 absolute left-3 top-1/2 -translate-y-1/2`}
              />
            </div>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="role-status">
              Status
            </label>
            <select
              className={employeeSelectClass}
              id="role-status"
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
            Add Role
          </button>
        </div>
      </div>

      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load roles: {loadError}
        </div>
      )}

      {loading ? (
        <div className={employeeLoadingClass}>Loading roles…</div>
      ) : (
        <RolesTable
          key={`${search}-${statusFilter}`}
          onEdit={openEdit}
          onView={openView}
          permissionCounts={permissionCounts}
          roles={filteredRoles}
        />
      )}

      <ViewRoleModal
        onClose={() => setViewId(null)}
        onEdit={switchViewToEdit}
        open={viewId != null}
        roleId={viewId}
      />

      <EditRoleModal
        onClose={() => setEditId(null)}
        onSaved={() => void loadRoles()}
        open={editId != null}
        roleId={editId}
      />

      <AddRoleModal
        onClose={() => setAddOpen(false)}
        onSaved={() => void loadRoles()}
        open={addOpen}
      />
    </>
  );
}
