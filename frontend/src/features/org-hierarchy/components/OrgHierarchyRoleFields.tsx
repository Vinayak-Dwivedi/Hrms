"use client";

import { useStore } from "@tanstack/react-form";
import type { AnyFormApi } from "@tanstack/react-form";
import { useMemo } from "react";
import { SelectField } from "@/components/form/form-field";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import { employeeListFormControlClass } from "@/features/employees/employee-theme";
import type {
  CreateEmployeeFormValues,
  createEmployeeFieldValidators,
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

type OrgHierarchyFieldValidators = Pick<
  ReturnType<typeof createEmployeeFieldValidators>,
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
  controlClassName = employeeListFormControlClass,
}: Props) {
  const departmentId = useStore(
    form.store,
    (state) =>
      (state.values as CreateEmployeeFormValues).orgHierarchyDepartmentId,
  );
  const subDepartmentId = useStore(
    form.store,
    (state) =>
      (state.values as CreateEmployeeFormValues).orgHierarchySubDepartmentId,
  );
  const designationId = useStore(
    form.store,
    (state) =>
      (state.values as CreateEmployeeFormValues).orgHierarchyDesignationId,
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
            <SelectField
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
            <SelectField
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
            <SelectField
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
          <Input
            id="orgHierarchyLevel"
            className={controlClassName}
            readOnly
            value={levelLabel}
            placeholder="Select a designation"
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
