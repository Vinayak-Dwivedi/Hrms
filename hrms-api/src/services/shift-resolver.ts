// Resolve which shift configuration applies to a given employee.

import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { shiftConfigs, shiftScope } from "@/db/schema/hrms";
import {
  loadEmployeeDimensions,
  type EmployeeDimensions,
} from "./holiday-calendar-resolver";

const SPECIFICITY_ORDER: Record<string, number> = {
  Employee: 9,
  Designation: 8,
  Grade: 7,
  SubDepartment: 6,
  Department: 5,
  Branch: 4,
  Location: 3,
  EmploymentType: 2,
  Company: 1,
};

function dimensionFieldFor(
  scopeType: string,
  emp: EmployeeDimensions,
): number | null {
  switch (scopeType) {
    case "Employee":
      return emp.id;
    case "Branch":
    case "Location":
      return emp.branchId;
    case "Department":
      return emp.orgHierarchyDepartmentId ?? emp.departmentId;
    case "SubDepartment":
      return emp.orgHierarchySubDepartmentId ?? emp.subDepartmentId;
    case "Designation":
      return emp.designationId;
    case "Grade":
      return emp.gradeId;
    case "EmploymentType":
      return emp.employmentTypeId;
    case "Company":
      return null;
    default:
      return null;
  }
}

function formatTimeDisplay(t: string): string {
  const parts = t.split(":");
  return `${parts[0] ?? "00"}:${parts[1] ?? "00"}`;
}

export type ResolvedShift = {
  configId: number;
  name: string;
  startTime: string;
  endTime: string;
  shiftTiming: string;
  graceMinutes: number;
  breakMinutes: number;
};

export async function resolveShiftForEmployee(
  employeeId: number,
): Promise<ResolvedShift | null> {
  const emp = await loadEmployeeDimensions(employeeId);
  if (!emp) return null;

  const scopeRows = await db
    .select({
      configId: shiftScope.shiftConfigId,
      scopeType: shiftScope.scopeType,
      scopeId: shiftScope.scopeId,
      priority: shiftScope.priority,
      name: shiftConfigs.name,
      startTime: shiftConfigs.startTime,
      endTime: shiftConfigs.endTime,
      graceMinutes: shiftConfigs.graceMinutes,
      breakMinutes: shiftConfigs.breakMinutes,
      isDefault: shiftConfigs.isDefault,
    })
    .from(shiftScope)
    .innerJoin(shiftConfigs, eq(shiftScope.shiftConfigId, shiftConfigs.id))
    .where(eq(shiftConfigs.status, "Published"));

  let best: {
    configId: number;
    specificity: number;
    priority: number;
    isDefault: boolean;
    name: string;
    startTime: string;
    endTime: string;
    graceMinutes: number;
    breakMinutes: number;
  } | null = null;

  for (const row of scopeRows) {
    const dimValue = dimensionFieldFor(row.scopeType, emp);
    if (row.scopeType === "Company") {
      // matches everyone
    } else if (dimValue == null || row.scopeId !== dimValue) {
      continue;
    }

    const specificity = SPECIFICITY_ORDER[row.scopeType] ?? 0;
    const candidate = {
      configId: row.configId,
      specificity,
      priority: row.priority,
      isDefault: row.isDefault,
      name: row.name,
      startTime: row.startTime,
      endTime: row.endTime,
      graceMinutes: row.graceMinutes,
      breakMinutes: row.breakMinutes,
    };

    if (
      !best ||
      candidate.specificity > best.specificity ||
      (candidate.specificity === best.specificity &&
        candidate.priority > best.priority) ||
      (candidate.specificity === best.specificity &&
        candidate.priority === best.priority &&
        candidate.isDefault &&
        !best.isDefault)
    ) {
      best = candidate;
    }
  }

  if (!best) {
    const [fallback] = await db
      .select({
        configId: shiftConfigs.id,
        name: shiftConfigs.name,
        startTime: shiftConfigs.startTime,
        endTime: shiftConfigs.endTime,
        graceMinutes: shiftConfigs.graceMinutes,
        breakMinutes: shiftConfigs.breakMinutes,
      })
      .from(shiftConfigs)
      .where(
        and(
          eq(shiftConfigs.status, "Published"),
          eq(shiftConfigs.isDefault, true),
        ),
      )
      .limit(1);
    if (!fallback) return null;
    const start = formatTimeDisplay(fallback.startTime);
    const end = formatTimeDisplay(fallback.endTime);
    return {
      configId: fallback.configId,
      name: fallback.name,
      startTime: fallback.startTime,
      endTime: fallback.endTime,
      shiftTiming: `${start} – ${end}`,
      graceMinutes: fallback.graceMinutes,
      breakMinutes: fallback.breakMinutes,
    };
  }

  const start = formatTimeDisplay(best.startTime);
  const end = formatTimeDisplay(best.endTime);
  return {
    configId: best.configId,
    name: best.name,
    startTime: best.startTime,
    endTime: best.endTime,
    shiftTiming: `${start} – ${end}`,
    graceMinutes: best.graceMinutes,
    breakMinutes: best.breakMinutes,
  };
}

export async function resolveShiftsForEmployees(
  employeeIds: number[],
): Promise<Map<number, ResolvedShift | null>> {
  const unique = [...new Set(employeeIds)];
  const results = new Map<number, ResolvedShift | null>();
  await Promise.all(
    unique.map(async (id) => {
      results.set(id, await resolveShiftForEmployee(id));
    }),
  );
  return results;
}
