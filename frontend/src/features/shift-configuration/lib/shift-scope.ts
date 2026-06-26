import type { HierarchyScopeRow } from "@/features/leave-policy/lib/leave-plan-scope";
import {
  buildScopePayloadFromCascade,
  hydrateCascadeFromRows,
} from "@/features/leave-policy/lib/leave-plan-scope";
import type { ShiftScopeRow } from "./shift-configs.client";

const HIERARCHY_TYPES = new Set([
  "Company",
  "Branch",
  "Department",
  "SubDepartment",
]);

export function apiScopeToHierarchy(scope: ShiftScopeRow[]): HierarchyScopeRow[] {
  return scope
    .map((row) => {
      if (row.scopeType === "Location") {
        return {
          scopeType: "Branch" as const,
          scopeId: row.scopeId,
          priority: row.priority,
        };
      }
      if (HIERARCHY_TYPES.has(row.scopeType)) {
        return {
          scopeType: row.scopeType as HierarchyScopeRow["scopeType"],
          scopeId: row.scopeId,
          priority: row.priority,
        };
      }
      return null;
    })
    .filter((row): row is HierarchyScopeRow => row != null);
}

export function hierarchyToApiScope(scope: HierarchyScopeRow[]): ShiftScopeRow[] {
  return buildScopePayloadFromCascade(hydrateCascadeFromRows(scope)).map((row) => ({
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    priority: row.priority,
  }));
}

export function scopeSummary(scope: ShiftScopeRow[]): string {
  if (scope.some((s) => s.scopeType === "Company")) {
    return "Entire organisation";
  }
  const n = scope.length;
  if (n === 0) return "Unassigned";
  return `${n} group${n === 1 ? "" : "s"}`;
}

export function formatShiftTiming(start: string, end: string): string {
  const fmt = (t: string) => {
    const [hh, mm] = t.split(":");
    return `${hh ?? "00"}:${mm ?? "00"}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function timeInputFromApi(t: string): string {
  const [hh, mm] = t.split(":");
  return `${hh ?? "00"}:${mm ?? "00"}`;
}

export function timeInputToApi(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}
