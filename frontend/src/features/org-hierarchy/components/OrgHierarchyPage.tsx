"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteOrgStructure,
  fetchHierarchyTree,
  fetchOrgLevels,
  type HierarchyTreeDepartment,
  type OrgLevel,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import HierarchyTabBar, {
  type HierarchyTabId,
} from "@/features/org-hierarchy/components/HierarchyTabBar";
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

type Props = {
  variant?: "admin" | "hr";
};

export default function OrgHierarchyPage({ variant: _variant = "admin" }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<HierarchyTreeDepartment[]>([]);
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [editStructureId, setEditStructureId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<HierarchyTabId>("tree");

  const loadTree = useCallback(async () => {
    try {
      const [treeData, levelData] = await Promise.all([
        fetchHierarchyTree(),
        fetchOrgLevels(),
      ]);
      setTree(treeData);
      setLevels(levelData);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <HierarchyTabBar active={activeTab} onChange={setActiveTab} />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <button
            className={employeeListResetBtnClass}
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
          Failed to load department hierarchy: {error}
        </div>
      )}

      {loading ? (
        <div className={employeeListLoadingClass}>
          Loading department hierarchy…
        </div>
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
