"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteOrgStructure,
  fetchEmployeeReportingTree,
  fetchHierarchyTree,
  fetchOrgLevels,
  type EmployeeReportingTreeDepartment,
  type HierarchyTreeDepartment,
  type OrgLevel,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  DepartmentHierarchyTabBar,
  type DepartmentHierarchyTabId,
} from "@/features/org-hierarchy/components/HierarchyTabBar";
import EmployeeHierarchyView from "@/features/org-hierarchy/components/EmployeeHierarchyView";
import HierarchyTreeView from "@/features/org-hierarchy/components/HierarchyTreeView";
import OrgHierarchyMasters from "@/features/org-hierarchy/components/OrgHierarchyMasters";
import StructureMappingPanel from "@/features/org-hierarchy/components/StructureMappingPanel";
import {
  employeeCardClass,
  employeeIconXs,
  employeeListErrorBannerClass,
  employeeListLoadingClass,
  employeeListResetBtnClass,
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
  const [editStructureId, setEditStructureId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<DepartmentHierarchyTabId>("tree");

  const loadTree = useCallback(async () => {
    try {
      if (scope === "employee") {
        const [employeeTreeData, levelData] = await Promise.all([
          fetchEmployeeReportingTree(),
          fetchOrgLevels(),
        ]);
        setEmployeeTree(employeeTreeData);
        setLevels(levelData);
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
      <div className={`${employeeCardClass} p-5 mb-6`}>
        {scope === "department" && (
          <DepartmentHierarchyTabBar
            active={activeTab}
            onChange={setActiveTab}
          />
        )}
        <div
          className={[
            "flex items-center justify-between",
            scope === "department" ? "mt-4 pt-4 border-t border-gray-100" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {scope === "employee" && (
            <p className="text-[13px] font-semibold text-gray-900 m-0">
              Employee reporting hierarchy
            </p>
          )}
          <button
            className={[
              employeeListResetBtnClass,
              scope === "employee" ? "ml-auto" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleRefresh}
            type="button"
          >
            <RotateCcw className={employeeIconXs} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className={employeeListErrorBannerClass}>
          {errorLabel}: {error}
        </div>
      )}

      {loading ? (
        <div className={employeeListLoadingClass}>{loadingLabel}</div>
      ) : scope === "employee" ? (
        <EmployeeHierarchyView tree={employeeTree} levels={levels} />
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
