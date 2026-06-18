"use client";

import { useEffect, useState } from "react";
import { fetchBranches } from "@/features/employees/api/employees.client";
import {
  fetchOrgDepartments,
  fetchOrgSubDepartments,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  scopeLabelsFromLists,
  type ScopeLabelLookups,
} from "./leave-plan-scope";

const EMPTY_LOOKUPS: ScopeLabelLookups = {
  branchById: new Map(),
  departmentById: new Map(),
  subDepartmentById: new Map(),
};

export function useHierarchyScopeLookups() {
  const [lookups, setLookups] = useState<ScopeLabelLookups>(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [branches, departments, subDepartments] = await Promise.all([
          fetchBranches(),
          fetchOrgDepartments(),
          fetchOrgSubDepartments(),
        ]);
        if (cancelled) return;
        setLookups(
          scopeLabelsFromLists(branches, departments, subDepartments),
        );
      } catch {
        if (!cancelled) setLookups(EMPTY_LOOKUPS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { lookups, loading };
}
