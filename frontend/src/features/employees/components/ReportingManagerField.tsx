"use client";

import { useStore } from "@tanstack/react-form";
import type { AnyFormApi } from "@tanstack/react-form";
import { useEffect, useMemo, useRef } from "react";
import { NativeSelectField, SelectField } from "@/components/form/form-field";
import type {
  OrgDesignation,
  OrgLevel,
  OrgStructure,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import EmployeeFormField from "./EmployeeFormField";
import {
  toManagerSelectOptions,
  type EmployeeListItem,
  type ManagerOption,
} from "../api/employees.client";
import type { createEmployeeFieldValidators } from "../schemas/employee.schema";
import type { createUpdateEmployeeFieldValidators } from "../schemas/employee.schema";
import {
  defaultReportingManagerId,
  filterReportingManagerOptions,
  isReportingManagerFilterReady,
  reportingManagerRuleDescription,
  resolveReportingManagerRule,
  scopeFromFormValues,
} from "../lib/reporting-manager-options";

type FieldValidators = Pick<
  ReturnType<typeof createEmployeeFieldValidators> &
    ReturnType<typeof createUpdateEmployeeFieldValidators>,
  "reportingManagerId"
>;

interface Props {
  form: AnyFormApi;
  fieldValidators: FieldValidators;
  employees: EmployeeListItem[];
  structures: OrgStructure[];
  designations: OrgDesignation[];
  levels: OrgLevel[];
  excludeEmployeeId?: number;
  /** Keep the employee's current manager selectable even when outside scope. */
  pinnedReportingManagerId?: number | null;
  controlClassName?: string;
  useNativeSelect?: boolean;
}

function managerLabel(employee: EmployeeListItem): string {
  return `${employee.firstName} ${employee.lastName} (${employee.empId})`;
}

function resolvePinnedManager(
  employees: EmployeeListItem[],
  pinnedReportingManagerId?: number | null,
): ManagerOption | null {
  if (pinnedReportingManagerId == null || pinnedReportingManagerId <= 0) {
    return null;
  }
  const match = employees.find(
    (employee) => employee.id === pinnedReportingManagerId,
  );
  if (match) {
    return { id: match.id, label: managerLabel(match) };
  }
  return {
    id: pinnedReportingManagerId,
    label: `Employee #${pinnedReportingManagerId}`,
  };
}

export default function ReportingManagerField({
  form,
  fieldValidators,
  employees,
  structures,
  designations,
  levels,
  excludeEmployeeId,
  pinnedReportingManagerId,
  controlClassName,
  useNativeSelect = false,
}: Props) {
  const locationId = useStore(
    form.store,
    (state) => (state.values as { locationId?: string }).locationId ?? "",
  );
  const departmentId = useStore(
    form.store,
    (state) =>
      (state.values as { orgHierarchyDepartmentId?: string })
        .orgHierarchyDepartmentId ?? "",
  );
  const subDepartmentId = useStore(
    form.store,
    (state) =>
      (state.values as { orgHierarchySubDepartmentId?: string })
        .orgHierarchySubDepartmentId ?? "",
  );
  const designationId = useStore(
    form.store,
    (state) =>
      (state.values as { orgHierarchyDesignationId?: string })
        .orgHierarchyDesignationId ?? "",
  );
  const reportingManagerId = useStore(
    form.store,
    (state) =>
      (state.values as { reportingManagerId?: string }).reportingManagerId ??
      "",
  );

  const scope = scopeFromFormValues({
    locationId,
    orgHierarchyDepartmentId: departmentId,
    orgHierarchySubDepartmentId: subDepartmentId,
  });

  const employeeDesignationId = useMemo(() => {
    if (!designationId.trim()) return null;
    const id = Number(designationId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [designationId]);

  const filterReady = isReportingManagerFilterReady(scope, employeeDesignationId);

  const pinnedManager = useMemo(
    () => resolvePinnedManager(employees, pinnedReportingManagerId),
    [employees, pinnedReportingManagerId],
  );

  const managers = useMemo(() => {
    const filtered = filterReportingManagerOptions(
      employees,
      structures,
      scope,
      employeeDesignationId,
      designations,
      levels,
      excludeEmployeeId,
    );
    if (
      pinnedManager &&
      !filtered.some((manager) => manager.id === pinnedManager.id)
    ) {
      return [...filtered, pinnedManager];
    }
    return filtered;
  }, [
    employees,
    structures,
    scope,
    employeeDesignationId,
    designations,
    levels,
    excludeEmployeeId,
    pinnedManager,
  ]);

  const managerIdSet = useMemo(
    () => new Set(managers.map((manager) => String(manager.id))),
    [managers],
  );

  const rule = useMemo(
    () =>
      resolveReportingManagerRule(
        employeeDesignationId,
        designations,
        levels,
      ),
    [employeeDesignationId, designations, levels],
  );

  const prevDesignationId = useRef<string | null>(null);
  const designationJustChanged = useRef(false);

  useEffect(() => {
    if (prevDesignationId.current === null) {
      prevDesignationId.current = designationId;
      return;
    }
    if (prevDesignationId.current !== designationId) {
      prevDesignationId.current = designationId;
      designationJustChanged.current = true;
      form.setFieldValue("reportingManagerId", "");
    }
  }, [designationId, form]);

  useEffect(() => {
    if (!filterReady) return;

    const autoId = defaultReportingManagerId(managers, {
      rule,
      employees,
      structures,
      designations,
    });
    if (!autoId) return;

    const shouldAutoSelect =
      !reportingManagerId ||
      designationJustChanged.current ||
      (pinnedReportingManagerId != null &&
        reportingManagerId === String(pinnedReportingManagerId) &&
        !managerIdSet.has(reportingManagerId));

    if (shouldAutoSelect && managerIdSet.has(autoId)) {
      form.setFieldValue("reportingManagerId", autoId);
      designationJustChanged.current = false;
    }
  }, [
    designations,
    employees,
    filterReady,
    form,
    managerIdSet,
    managers,
    pinnedReportingManagerId,
    reportingManagerId,
    rule,
    structures,
  ]);

  useEffect(() => {
    if (!reportingManagerId) return;
    if (
      pinnedReportingManagerId != null &&
      reportingManagerId === String(pinnedReportingManagerId) &&
      !designationJustChanged.current
    ) {
      return;
    }
    if (!filterReady || !managerIdSet.has(reportingManagerId)) {
      form.setFieldValue("reportingManagerId", "");
    }
  }, [
    departmentId,
    designationId,
    excludeEmployeeId,
    filterReady,
    form,
    locationId,
    managerIdSet,
    pinnedReportingManagerId,
    reportingManagerId,
    subDepartmentId,
  ]);

  const description = !filterReady
    ? "Select location, department, sub-department, and designation to see reporting managers."
    : managers.length === 0
      ? "No senior reporting managers found for this designation at this location."
      : reportingManagerRuleDescription(rule);

  const SelectComponent = useNativeSelect ? NativeSelectField : SelectField;

  return (
    <EmployeeFormField>
      <form.Field
        name="reportingManagerId"
        validators={fieldValidators.reportingManagerId}
      >
        {(field) => (
          <SelectComponent
            controlClassName={controlClassName}
            description={description}
            disabled={!filterReady}
            emptyOptionLabel="None"
            field={field}
            label="Reporting manager"
            options={toManagerSelectOptions(managers)}
            placeholder="Select manager"
          />
        )}
      </form.Field>
    </EmployeeFormField>
  );
}
