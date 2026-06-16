"use client";

import { useStore } from "@tanstack/react-form";
import type { AnyFormApi } from "@tanstack/react-form";
import { useMemo } from "react";
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
  fetchOrgDepartments,
  fetchOrgDesignations,
  fetchOrgLevels,
  fetchOrgStructure,
  fetchOrgSubDepartments,
  type OrgDepartment,
  type OrgDesignation,
  type OrgLevel,
  type OrgStructure,
  type OrgSubDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";

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
}: Props) {
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

  const departmentOptions = useMemo(() => {
    const departmentIds = new Set(structures.map((row) => row.departmentId));
    return departments
      .filter((row) => departmentIds.has(row.id))
      .map((row) => ({
        value: String(row.id),
        label: row.name,
      }));
  }, [structures, departments]);

  const subDepartmentOptions = useMemo(() => {
    if (!departmentId) return [];
    const subDepartmentIds = new Set(
      structures
        .filter((row) => row.departmentId === Number(departmentId))
        .map((row) => row.subDepartmentId),
    );
    return subDepartments
      .filter((row) => subDepartmentIds.has(row.id))
      .map((row) => ({
        value: String(row.id),
        label: row.name,
      }));
  }, [structures, subDepartments, departmentId]);

  const designationOptions = useMemo(() => {
    if (!departmentId || !subDepartmentId) return [];
    const designationIds = new Set(
      structures
        .filter(
          (row) =>
            row.departmentId === Number(departmentId) &&
            row.subDepartmentId === Number(subDepartmentId),
        )
        .map((row) => row.designationId),
    );
    return designations
      .filter((row) => designationIds.has(row.id))
      .map((row) => ({
        value: String(row.id),
        label: row.name,
      }));
  }, [structures, designations, departmentId, subDepartmentId]);

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
              field={field}
              label="Department"
              options={departmentOptions}
              placeholder="Select department"
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
              disabled={!departmentId}
              field={field}
              label="Sub department"
              options={subDepartmentOptions}
              placeholder="Select sub department"
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
              disabled={!departmentId || !subDepartmentId}
              field={field}
              label="Designation"
              options={designationOptions}
              placeholder="Select designation"
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

export type OrgHierarchyRoleLookups = {
  departments: OrgDepartment[];
  subDepartments: OrgSubDepartment[];
  designations: OrgDesignation[];
  levels: OrgLevel[];
  structures: OrgStructure[];
};

export type OrgHierarchyRoleDisplay = {
  department: string;
  subDepartment: string;
  designation: string;
  levelGrade: string;
};

const emptyOrgHierarchyRoleDisplay: OrgHierarchyRoleDisplay = {
  department: "—",
  subDepartment: "—",
  designation: "—",
  levelGrade: "—",
};

export function resolveOrgHierarchyRoleDisplay(
  structureId: number | null | undefined,
  lookups: OrgHierarchyRoleLookups,
): OrgHierarchyRoleDisplay {
  if (structureId == null) return emptyOrgHierarchyRoleDisplay;

  const structure = lookups.structures.find((row) => row.id === structureId);
  if (!structure) return emptyOrgHierarchyRoleDisplay;

  const department =
    lookups.departments.find((row) => row.id === structure.departmentId)
      ?.name ?? "—";
  const subDepartment =
    lookups.subDepartments.find((row) => row.id === structure.subDepartmentId)
      ?.name ?? "—";
  const designationRow = lookups.designations.find(
    (row) => row.id === structure.designationId,
  );
  const designation = designationRow?.name ?? "—";
  const level = designationRow
    ? lookups.levels.find((row) => row.id === designationRow.levelId)
    : undefined;
  const levelGrade = level ? `${level.code} — ${level.name}` : "—";

  return { department, subDepartment, designation, levelGrade };
}

export async function fetchOrgHierarchyRoleLookups(): Promise<OrgHierarchyRoleLookups> {
  const [departments, subDepartments, designations, levels, structures] =
    await Promise.all([
      fetchOrgDepartments(),
      fetchOrgSubDepartments(),
      fetchOrgDesignations(),
      fetchOrgLevels(),
      fetchOrgStructure(),
    ]);
  return { departments, subDepartments, designations, levels, structures };
}
