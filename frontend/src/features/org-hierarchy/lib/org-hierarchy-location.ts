import type {
  OrgDepartment,
  OrgDesignation,
  OrgStructure,
  OrgSubDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";

/** Empty branchIds means the master applies to all locations. */
export function orgRecordMatchesLocation(
  branchIds: number[] | undefined,
  locationId: number | null | undefined,
): boolean {
  if (locationId == null || Number.isNaN(locationId)) return true;
  const ids = branchIds ?? [];
  if (ids.length === 0) return true;
  return ids.includes(locationId);
}

/** True when the record applies to at least one of the selected location ids. */
export function orgRecordMatchesAnyLocation(
  branchIds: number[] | undefined,
  locationIds: number[],
): boolean {
  if (locationIds.length === 0) return false;
  const recordIds = branchIds ?? [];
  if (recordIds.length === 0) return true;
  return locationIds.some((locationId) => recordIds.includes(locationId));
}

export function filterDepartmentsByLocation(
  departments: OrgDepartment[],
  locationId: number | null | undefined,
): OrgDepartment[] {
  return departments.filter((row) =>
    orgRecordMatchesLocation(row.branchIds, locationId),
  );
}

export function filterDepartmentsByLocations(
  departments: OrgDepartment[],
  locationIds: number[],
): OrgDepartment[] {
  if (locationIds.length === 0) return [];
  return departments.filter((row) =>
    orgRecordMatchesAnyLocation(row.branchIds, locationIds),
  );
}

export function filterSubDepartmentsByDepartmentAndLocation(
  subDepartments: OrgSubDepartment[],
  departmentId: number | null | undefined,
  locationId: number | null | undefined,
): OrgSubDepartment[] {
  if (!departmentId) return [];
  return subDepartments.filter(
    (row) =>
      row.departmentId === departmentId &&
      orgRecordMatchesLocation(row.branchIds, locationId),
  );
}

export function filterDesignationsByLocation(
  designations: OrgDesignation[],
  locationId: number | null | undefined,
): OrgDesignation[] {
  return designations.filter((row) =>
    orgRecordMatchesLocation(row.branchIds, locationId),
  );
}

export function filterStructuresByLocation(
  structures: OrgStructure[],
  locationId: number | null | undefined,
  departments: OrgDepartment[],
  subDepartments: OrgSubDepartment[],
  designations: OrgDesignation[],
): OrgStructure[] {
  if (locationId == null || Number.isNaN(locationId)) return structures;

  const deptById = new Map(departments.map((row) => [row.id, row]));
  const subById = new Map(subDepartments.map((row) => [row.id, row]));
  const desigById = new Map(designations.map((row) => [row.id, row]));

  return structures.filter((row) => {
    const dept = deptById.get(row.departmentId);
    const sub = subById.get(row.subDepartmentId);
    const desig = desigById.get(row.designationId);
    if (!dept || !sub || !desig) return false;
    return (
      orgRecordMatchesLocation(dept.branchIds, locationId) &&
      orgRecordMatchesLocation(sub.branchIds, locationId) &&
      orgRecordMatchesLocation(desig.branchIds, locationId)
    );
  });
}
