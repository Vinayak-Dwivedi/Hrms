export type HierarchyScopeType =
  | "Company"
  | "Branch"
  | "Department"
  | "SubDepartment";

export type HierarchyScopeRow = {
  scopeType: HierarchyScopeType;
  scopeId: number | null;
  priority: number;
};

export type HierarchyScopeState = {
  allLocations: boolean;
  locationIds: Set<number>;
  allDepartments: boolean;
  departmentIds: Set<number>;
  allSubDepartments: boolean;
  subDepartmentIds: Set<number>;
};

/** UI-facing cascade state (single location → department → sub-department). */
export type CascadeScopeState = {
  companyWide: boolean;
  locationId: number | null;
  allDepartments: boolean;
  departmentId: number | null;
  allSubDepartments: boolean;
  subDepartmentId: number | null;
};

export const emptyHierarchyScopeState = (): HierarchyScopeState => ({
  allLocations: true,
  locationIds: new Set(),
  allDepartments: true,
  departmentIds: new Set(),
  allSubDepartments: true,
  subDepartmentIds: new Set(),
});

export const emptyCascadeScopeState = (): CascadeScopeState => ({
  companyWide: true,
  locationId: null,
  allDepartments: true,
  departmentId: null,
  allSubDepartments: true,
  subDepartmentId: null,
});

export function cascadeToHierarchyState(
  cascade: CascadeScopeState,
): HierarchyScopeState {
  if (cascade.companyWide) return emptyHierarchyScopeState();
  return {
    allLocations: false,
    locationIds: cascade.locationId ? new Set([cascade.locationId]) : new Set(),
    allDepartments: cascade.allDepartments,
    departmentIds:
      !cascade.allDepartments && cascade.departmentId
        ? new Set([cascade.departmentId])
        : new Set(),
    allSubDepartments: cascade.allSubDepartments,
    subDepartmentIds:
      !cascade.allSubDepartments && cascade.subDepartmentId
        ? new Set([cascade.subDepartmentId])
        : new Set(),
  };
}

export function hierarchyToCascade(
  hierarchy: HierarchyScopeState,
): CascadeScopeState {
  if (hierarchy.allLocations && hierarchy.allDepartments) {
    return emptyCascadeScopeState();
  }
  return {
    companyWide: false,
    locationId: hierarchy.allLocations
      ? null
      : ([...hierarchy.locationIds][0] ?? null),
    allDepartments: hierarchy.allDepartments,
    departmentId: hierarchy.allDepartments
      ? null
      : ([...hierarchy.departmentIds][0] ?? null),
    allSubDepartments: hierarchy.allSubDepartments,
    subDepartmentId: hierarchy.allSubDepartments
      ? null
      : ([...hierarchy.subDepartmentIds][0] ?? null),
  };
}

export function hydrateScopeFromRows(scope: HierarchyScopeRow[]): HierarchyScopeState {
  const hasCompany = scope.some((s) => s.scopeType === "Company");
  if (hasCompany) {
    return emptyHierarchyScopeState();
  }

  const branchIds = scope
    .filter((s) => s.scopeType === "Branch" && s.scopeId != null)
    .map((s) => s.scopeId!);
  const deptIds = scope
    .filter((s) => s.scopeType === "Department" && s.scopeId != null)
    .map((s) => s.scopeId!);
  const subIds = scope
    .filter((s) => s.scopeType === "SubDepartment" && s.scopeId != null)
    .map((s) => s.scopeId!);

  const allLocations = branchIds.length === 0;
  const allDepartments = deptIds.length === 0;
  const allSubDepartments = !allDepartments && subIds.length === 0;

  return {
    allLocations,
    locationIds: new Set(branchIds),
    allDepartments,
    departmentIds: new Set(deptIds),
    allSubDepartments,
    subDepartmentIds: new Set(subIds),
  };
}

export function hydrateCascadeFromRows(scope: HierarchyScopeRow[]): CascadeScopeState {
  if (scope.some((s) => s.scopeType === "Company")) {
    return emptyCascadeScopeState();
  }
  if (scope.length === 0) {
    return {
      companyWide: false,
      locationId: null,
      allDepartments: true,
      departmentId: null,
      allSubDepartments: true,
      subDepartmentId: null,
    };
  }
  return hierarchyToCascade(hydrateScopeFromRows(scope));
}

export function buildScopePayload(
  allLocations: boolean,
  locationIds: Set<number>,
  allDepartments: boolean,
  departmentIds: Set<number>,
  allSubDepartments: boolean,
  subDepartmentIds: Set<number>,
): HierarchyScopeRow[] {
  if (allLocations && allDepartments) {
    return [{ scopeType: "Company", scopeId: null, priority: 100 }];
  }

  return [
    ...(!allLocations
      ? [...locationIds].map((id) => ({
          scopeType: "Branch" as const,
          scopeId: id,
          priority: 110,
        }))
      : []),
    ...(!allDepartments
      ? [...departmentIds].map((id) => ({
          scopeType: "Department" as const,
          scopeId: id,
          priority: 100,
        }))
      : []),
    ...(!allDepartments && !allSubDepartments
      ? [...subDepartmentIds].map((id) => ({
          scopeType: "SubDepartment" as const,
          scopeId: id,
          priority: 90,
        }))
      : []),
  ];
}

export function buildScopePayloadFromCascade(
  cascade: CascadeScopeState,
): HierarchyScopeRow[] {
  const hierarchy = cascadeToHierarchyState(cascade);
  return buildScopePayload(
    hierarchy.allLocations,
    hierarchy.locationIds,
    hierarchy.allDepartments,
    hierarchy.departmentIds,
    hierarchy.allSubDepartments,
    hierarchy.subDepartmentIds,
  );
}

export function isHierarchyScopeValid(state: HierarchyScopeState): boolean {
  return (
    (state.allLocations || state.locationIds.size > 0) &&
    (state.allDepartments || state.departmentIds.size > 0)
  );
}

export function isCascadeScopeValid(cascade: CascadeScopeState): boolean {
  if (cascade.companyWide) return true;
  return cascade.locationId != null;
}

export function formatScopeSummary(
  scope: HierarchyScopeRow[],
  labels?: {
    locationName?: string;
    departmentName?: string;
    subDepartmentName?: string;
  },
): string {
  if (scope.some((s) => s.scopeType === "Company")) {
    return "Entire organization";
  }

  if (scope.length === 0) {
    return "Select organizational unit";
  }

  const cascade = hydrateCascadeFromRows(scope);
  if (cascade.companyWide) return "Entire organization";

  const parts: string[] = [];
  if (labels?.locationName) parts.push(labels.locationName);
  else if (cascade.locationId) parts.push(`Location #${cascade.locationId}`);

  if (!cascade.allDepartments) {
    if (labels?.departmentName) parts.push(labels.departmentName);
    else if (cascade.departmentId) parts.push(`Dept #${cascade.departmentId}`);
  } else if (parts.length > 0) {
    parts.push("All departments");
  }

  if (!cascade.allDepartments && !cascade.allSubDepartments) {
    if (labels?.subDepartmentName) parts.push(labels.subDepartmentName);
    else if (cascade.subDepartmentId) {
      parts.push(`Sub-dept #${cascade.subDepartmentId}`);
    }
  } else if (!cascade.allDepartments && cascade.departmentId) {
    parts.push("All sub-departments");
  }

  return parts.length > 0 ? parts.join(" → ") : "Not configured";
}

export type ScopeLabelLookups = {
  branchById: Map<number, string>;
  departmentById: Map<number, string>;
  subDepartmentById: Map<number, string>;
};

export function resolveScopeLabels(
  scope: HierarchyScopeRow[],
  lookups: ScopeLabelLookups,
): {
  locationName?: string;
  departmentName?: string;
  subDepartmentName?: string;
  allDepartments: boolean;
  allSubDepartments: boolean;
  companyWide: boolean;
} {
  if (scope.some((s) => s.scopeType === "Company")) {
    return {
      companyWide: true,
      allDepartments: true,
      allSubDepartments: true,
    };
  }

  const cascade = hydrateCascadeFromRows(scope);
  if (cascade.companyWide) {
    return {
      companyWide: true,
      allDepartments: true,
      allSubDepartments: true,
    };
  }

  return {
    companyWide: false,
    locationName:
      cascade.locationId != null
        ? lookups.branchById.get(cascade.locationId)
        : undefined,
    departmentName:
      !cascade.allDepartments && cascade.departmentId != null
        ? lookups.departmentById.get(cascade.departmentId)
        : undefined,
    subDepartmentName:
      !cascade.allSubDepartments && cascade.subDepartmentId != null
        ? lookups.subDepartmentById.get(cascade.subDepartmentId)
        : undefined,
    allDepartments: cascade.allDepartments,
    allSubDepartments: cascade.allSubDepartments,
  };
}

export function scopeLabelsFromLists(
  branches: { id: number; name: string }[],
  departments: { id: number; name: string }[],
  subDepartments: { id: number; name: string }[],
): ScopeLabelLookups {
  return {
    branchById: new Map(branches.map((b) => [b.id, b.name])),
    departmentById: new Map(departments.map((d) => [d.id, d.name])),
    subDepartmentById: new Map(subDepartments.map((s) => [s.id, s.name])),
  };
}
