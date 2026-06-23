"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteOrgStructure,
  fetchEmployeeReportingTree,
  fetchHierarchyTree,
  fetchOrgDepartments,
  fetchOrgLevels,
  type EmployeeReportingTreeDepartment,
  type HierarchyTreeDepartment,
  type OrgDepartment,
  type OrgLevel,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import { fetchBranches } from "@/features/employees/api/employees.client";
import {
  DepartmentHierarchyTabBar,
  type DepartmentHierarchyTabId,
} from "@/features/org-hierarchy/components/HierarchyTabBar";
import EmployeeHierarchyView from "@/features/org-hierarchy/components/EmployeeHierarchyView";
import HierarchyTreeView from "@/features/org-hierarchy/components/HierarchyTreeView";
import OrgHierarchyMasters from "@/features/org-hierarchy/components/OrgHierarchyMasters";
import StructureMappingPanel from "@/features/org-hierarchy/components/StructureMappingPanel";
import {
  employeeListErrorBannerClass,
  employeeListLoadingClass,
} from "@/features/employees/employee-theme";

export type OrgHierarchyScope = "employee" | "department";

type Props = {
  scope: OrgHierarchyScope;
  variant?: "admin" | "hr";
};

export default function OrgHierarchyPage({
  scope,
  variant: _variant = "admin",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<HierarchyTreeDepartment[]>([]);
  const [employeeTree, setEmployeeTree] = useState<
    EmployeeReportingTreeDepartment[]
  >([]);
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [orgDepts, setOrgDepts] = useState<OrgDepartment[]>([]);
  const [editStructureId, setEditStructureId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<DepartmentHierarchyTabId>("masters");

  const loadTree = useCallback(async () => {
    try {
      if (scope === "employee") {
        const [employeeTreeData, levelData, branchData, orgDeptData] = await Promise.all([
          fetchEmployeeReportingTree(),
          fetchOrgLevels(),
          fetchBranches(),
          fetchOrgDepartments(),
        ]);
        setEmployeeTree(employeeTreeData);
        setLevels(levelData);
        setBranches(branchData);
        setOrgDepts(orgDeptData);
      } else {
        const [treeData, levelData] = await Promise.all([
          fetchHierarchyTree(),
          fetchOrgLevels(),
        ]);
        setTree(treeData);
        setLevels(levelData);
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadTree();
  }, [loadTree, refreshKey]);

  function handleChanged() {
    setRefreshKey((k) => k + 1);
  }

  function handleRefresh() {
    setLoading(true);
    handleChanged();
  }

  async function handleDeleteStructure(structureId: number) {
    if (!window.confirm("Delete this hierarchy mapping?")) return;
    try {
      await deleteOrgStructure(structureId);
      toast.success("Mapping deleted.");
      handleChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const loadingLabel =
    scope === "employee"
      ? "Loading hierarchy…"
      : "Loading department hierarchy…";
  const errorLabel =
    scope === "employee"
      ? "Failed to load hierarchy"
      : "Failed to load department hierarchy";

  return (
    <>
      {scope === "department" && (
        <div className="mb-6">
          <DepartmentHierarchyTabBar
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
      )}

      {error && (
        <div className={employeeListErrorBannerClass}>
          {errorLabel}: {error}
        </div>
      )}

      {loading ? (
        <div className={employeeListLoadingClass}>{loadingLabel}</div>
      ) : scope === "employee" ? (
        <EmployeeHierarchyView tree={employeeTree} branches={branches} orgDepts={orgDepts} />
      ) : (
        <>
          {activeTab === "tree" && (
            <HierarchyTreeView
              tree={tree}
              onEditStructure={(id) => {
                setEditStructureId(id);
                setActiveTab("mapping");
              }}
              onDeleteStructure={(id) => void handleDeleteStructure(id)}
            />
          )}

          {activeTab === "masters" && (
            <OrgHierarchyMasters onChanged={handleChanged} />
          )}

          {activeTab === "mapping" && (
            <StructureMappingPanel
              levels={levels}
              onChanged={handleChanged}
              editStructureId={editStructureId}
              onEditClose={() => setEditStructureId(null)}
            />
          )}
        </>
      )}
    </>
  );
}
