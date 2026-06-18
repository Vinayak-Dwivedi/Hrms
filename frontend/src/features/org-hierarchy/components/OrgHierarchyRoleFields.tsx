"use client";

import { useStore } from "@tanstack/react-form";
import type { AnyFormApi } from "@tanstack/react-form";
import { useEffect, useMemo } from "react";
import { NativeSelectField } from "@/components/form/form-field";
import { Field, FieldLabel } from "@/components/ui/field";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import {
  employeeFormNativeSelectClass,
  employeeReadOnlyControlClass,
} from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";
import type {
  createEmployeeFieldValidators,
  createUpdateEmployeeFieldValidators,
} from "@/features/employees/schemas/employee.schema";
import {
  type OrgDepartment,
  type OrgDesignation,
  type OrgLevel,
  type OrgStructure,
  type OrgSubDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  filterStructuresByLocation,
  orgRecordMatchesLocation,
} from "@/features/org-hierarchy/lib/org-hierarchy-location";

export function resolveOrgStructureId(
  structures: OrgStructure[],
  departmentId: number,
  subDepartmentId: number,
  designationId: number,
): number | null {
  const match = structures.find(
    (row) =>
      row.departmentId === departmentId &&
      row.subDepartmentId === subDepartmentId &&
      row.designationId === designationId,
  );
  return match?.id ?? null;
}

export function orgStructureNotFoundMessage(): string {
  return "This role is not defined in Departments / Hierarchy. Add the structure mapping there first.";
}

export type OrgHierarchyFormFieldValues = {
  orgHierarchyDepartmentId: string;
  orgHierarchySubDepartmentId: string;
  orgHierarchyDesignationId: string;
};

const emptyOrgHierarchyFormValues: OrgHierarchyFormFieldValues = {
  orgHierarchyDepartmentId: "",
  orgHierarchySubDepartmentId: "",
  orgHierarchyDesignationId: "",
};

export function orgHierarchyFormValuesFromStructure(
  structureId: number | null | undefined,
  structures: OrgStructure[],
): OrgHierarchyFormFieldValues {
  if (structureId == null) return emptyOrgHierarchyFormValues;
  const match = structures.find((row) => row.id === structureId);
  if (!match) return emptyOrgHierarchyFormValues;
  return {
    orgHierarchyDepartmentId: String(match.departmentId),
    orgHierarchySubDepartmentId: String(match.subDepartmentId),
    orgHierarchyDesignationId: String(match.designationId),
  };
}

type OrgHierarchyFieldValidators = Pick<
  ReturnType<typeof createEmployeeFieldValidators> &
    ReturnType<typeof createUpdateEmployeeFieldValidators>,
  | "orgHierarchyDepartmentId"
  | "orgHierarchySubDepartmentId"
  | "orgHierarchyDesignationId"
>;

type Props = {
  form: AnyFormApi;
  departments: OrgDepartment[];
  subDepartments: OrgSubDepartment[];
  designations: OrgDesignation[];
  levels: OrgLevel[];
  structures: OrgStructure[];
  fieldValidators: OrgHierarchyFieldValidators;
  controlClassName?: string;
  /** When true, hierarchy options stay empty until a location is chosen. */
  requireLocation?: boolean;
};

export default function OrgHierarchyRoleFields({
  form,
  departments,
  subDepartments,
  designations,
  levels,
  structures,
  fieldValidators,
  controlClassName = employeeFormNativeSelectClass,
  requireLocation = false,
}: Props) {
  const locationId = useStore(
    form.store,
    (state) => (state.values as { locationId?: string }).locationId ?? "",
  );
  const departmentId = useStore(
    form.store,
    (state) =>
      (state.values as OrgHierarchyFormFieldValues).orgHierarchyDepartmentId,
  );
  const subDepartmentId = useStore(
    form.store,
    (state) =>
      (state.values as OrgHierarchyFormFieldValues).orgHierarchySubDepartmentId,
  );
  const designationId = useStore(
    form.store,
    (state) =>
      (state.values as OrgHierarchyFormFieldValues).orgHierarchyDesignationId,
  );

  const parsedLocationId = useMemo(() => {
    if (!locationId.trim()) return null;
    const id = Number(locationId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [locationId]);

  const locationScopedStructures = useMemo(
    () =>
      filterStructuresByLocation(
        structures,
        parsedLocationId,
        departments,
        subDepartments,
        designations,
      ),
    [
      structures,
      parsedLocationId,
      departments,
      subDepartments,
      designations,
    ],
  );

  const hierarchyBlocked = requireLocation && parsedLocationId == null;

  const departmentOptions = useMemo(() => {
    if (hierarchyBlocked) return [];
    const departmentIds = new Set(
      locationScopedStructures.map((row) => row.departmentId),
    );
    return departments
      .filter(
        (row) =>
          departmentIds.has(row.id) &&
          orgRecordMatchesLocation(row.branchIds, parsedLocationId),
      )
      .map((row) => ({
        value: String(row.id),
        label: row.name,
      }));
  }, [
    hierarchyBlocked,
    locationScopedStructures,
    departments,
    parsedLocationId,
  ]);

  const subDepartmentOptions = useMemo(() => {
    if (hierarchyBlocked || !departmentId) return [];
    const subDepartmentIds = new Set(
      locationScopedStructures
        .filter((row) => row.departmentId === Number(departmentId))
        .map((row) => row.subDepartmentId),
    );
    return subDepartments
      .filter(
        (row) =>
          subDepartmentIds.has(row.id) &&
          orgRecordMatchesLocation(row.branchIds, parsedLocationId),
      )
      .map((row) => ({
        value: String(row.id),
        label: row.name,
      }));
  }, [
    hierarchyBlocked,
    locationScopedStructures,
    subDepartments,
    departmentId,
    parsedLocationId,
  ]);

  const designationOptions = useMemo(() => {
    if (hierarchyBlocked || !departmentId || !subDepartmentId) return [];
    const designationIds = new Set(
      locationScopedStructures
        .filter(
          (row) =>
            row.departmentId === Number(departmentId) &&
            row.subDepartmentId === Number(subDepartmentId),
        )
        .map((row) => row.designationId),
    );
    return designations
      .filter(
        (row) =>
          designationIds.has(row.id) &&
          orgRecordMatchesLocation(row.branchIds, parsedLocationId),
      )
      .map((row) => ({
        value: String(row.id),
        label: row.name,
      }));
  }, [
    hierarchyBlocked,
    locationScopedStructures,
    designations,
    departmentId,
    subDepartmentId,
    parsedLocationId,
  ]);

  useEffect(() => {
    if (
      departmentId &&
      !departmentOptions.some((option) => option.value === departmentId)
    ) {
      form.setFieldValue("orgHierarchyDepartmentId", "");
      form.setFieldValue("orgHierarchySubDepartmentId", "");
      form.setFieldValue("orgHierarchyDesignationId", "");
      return;
    }
    if (
      subDepartmentId &&
      !subDepartmentOptions.some((option) => option.value === subDepartmentId)
    ) {
      form.setFieldValue("orgHierarchySubDepartmentId", "");
      form.setFieldValue("orgHierarchyDesignationId", "");
      return;
    }
    if (
      designationId &&
      !designationOptions.some((option) => option.value === designationId)
    ) {
      form.setFieldValue("orgHierarchyDesignationId", "");
    }
  }, [
    departmentId,
    subDepartmentId,
    designationId,
    departmentOptions,
    subDepartmentOptions,
    designationOptions,
    form,
  ]);

  const levelLabel = useMemo(() => {
    if (!designationId) return "";
    const designation = designations.find(
      (row) => row.id === Number(designationId),
    );
    if (!designation) return "";
    const level = levels.find((row) => row.id === designation.levelId);
    return level ? `${level.code} — ${level.name}` : "";
  }, [designationId, designations, levels]);

  return (
    <>
      <form.Field
        name="orgHierarchyDepartmentId"
        validators={fieldValidators.orgHierarchyDepartmentId}
      >
        {(field) => (
          <EmployeeFormField>
            <NativeSelectField
              controlClassName={controlClassName}
              disabled={hierarchyBlocked}
              field={field}
              label="Department"
              options={departmentOptions}
              placeholder={
                hierarchyBlocked
                  ? "Select location first"
                  : "Select department"
              }
              onValueChange={() => {
                form.setFieldValue("orgHierarchySubDepartmentId", "");
                form.setFieldValue("orgHierarchyDesignationId", "");
              }}
            />
          </EmployeeFormField>
        )}
      </form.Field>

      <form.Field
        name="orgHierarchySubDepartmentId"
        validators={fieldValidators.orgHierarchySubDepartmentId}
      >
        {(field) => (
          <EmployeeFormField key={`sub-dept-${departmentId || "none"}`}>
            <NativeSelectField
              controlClassName={controlClassName}
              disabled={hierarchyBlocked || !departmentId}
              field={field}
              label="Sub department"
              options={subDepartmentOptions}
              placeholder={
                hierarchyBlocked
                  ? "Select location first"
                  : !departmentId
                    ? "Select department first"
                    : "Select sub department"
              }
              onValueChange={() => {
                form.setFieldValue("orgHierarchyDesignationId", "");
              }}
            />
          </EmployeeFormField>
        )}
      </form.Field>

      <form.Field
        name="orgHierarchyDesignationId"
        validators={fieldValidators.orgHierarchyDesignationId}
      >
        {(field) => (
          <EmployeeFormField
            key={`desig-${departmentId || "none"}-${subDepartmentId || "none"}`}
          >
            <NativeSelectField
              controlClassName={controlClassName}
              disabled={hierarchyBlocked || !departmentId || !subDepartmentId}
              field={field}
              label="Designation"
              options={designationOptions}
              placeholder={
                hierarchyBlocked
                  ? "Select location first"
                  : !departmentId
                    ? "Select department first"
                    : !subDepartmentId
                      ? "Select sub department first"
                      : "Select designation"
              }
            />
          </EmployeeFormField>
        )}
      </form.Field>

      <EmployeeFormField>
        <Field>
          <FieldLabel htmlFor="orgHierarchyLevel">Level / grade</FieldLabel>
          <input
            readOnly
            aria-readonly
            id="orgHierarchyLevel"
            tabIndex={-1}
            className={cn(
              employeeReadOnlyControlClass,
              !levelLabel && "text-gray-400",
            )}
            value={levelLabel || "Auto-filled from designation"}
          />
        </Field>
      </EmployeeFormField>
    </>
  );
}

export {
  fetchOrgHierarchyRoleLookups,
  resolveOrgHierarchyRoleDisplay,
  type OrgHierarchyRoleDisplay,
  type OrgHierarchyRoleLookups,
} from "../lib/org-hierarchy-role";
