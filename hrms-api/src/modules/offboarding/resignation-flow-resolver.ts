// Resolve which resignation flow applies to an employee. Mirrors
// leave-policy-resolver.ts: match the flow's scope rows against the employee's
// org facets and pick the most specific (then lowest priority, then default).

import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  resignationFlowScope,
  resignationFlows,
} from "@/db/schema/hrms";

type ScopeType =
  | "Company"
  | "Branch"
  | "Department"
  | "SubDepartment"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Employee";

const SPECIFICITY: Record<ScopeType, number> = {
  Employee: 7,
  Designation: 6,
  SubDepartment: 5,
  Grade: 4,
  Department: 3,
  Branch: 2,
  EmploymentType: 1,
  Company: 0,
};

export interface ResolvedFlow {
  id: number;
  name: string;
  noticePeriodDays: number;
  buyoutAllowed: boolean;
  isDefault: boolean;
  matchedReason: string;
}

export async function resolveResignationFlowForEmployee(
  employeeId: number,
): Promise<ResolvedFlow | null> {
  const [emp] = await db
    .select({
      id: employees.id,
      designationId: employees.designationId,
      subDepartmentId: employees.subDepartmentId,
      gradeId: employees.gradeId,
      departmentId: employees.departmentId,
      branchId: employees.branchId,
      employmentTypeId: employees.employmentTypeId,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) return null;

  const facets: Record<ScopeType, number | null> = {
    Employee: emp.id,
    Designation: emp.designationId,
    SubDepartment: emp.subDepartmentId,
    Grade: emp.gradeId,
    Department: emp.departmentId,
    Branch: emp.branchId,
    EmploymentType: emp.employmentTypeId,
    Company: null,
  };

  const flows = await db
    .select()
    .from(resignationFlows)
    .where(eq(resignationFlows.isActive, true));
  if (flows.length === 0) return null;

  type Match = {
    flow: (typeof flows)[number];
    scopeType: ScopeType;
    scopeId: number | null;
    specificity: number;
    priority: number;
  };
  const matches: Match[] = [];

  for (const f of flows) {
    const scopeRows = await db
      .select()
      .from(resignationFlowScope)
      .where(eq(resignationFlowScope.flowId, f.id));
    for (const s of scopeRows) {
      const st = s.scopeType as ScopeType;
      if (st === "Company") {
        matches.push({
          flow: f,
          scopeType: st,
          scopeId: null,
          specificity: SPECIFICITY.Company,
          priority: s.priority,
        });
      } else {
        const v = facets[st];
        if (v !== null && v === s.scopeId) {
          matches.push({
            flow: f,
            scopeType: st,
            scopeId: s.scopeId,
            specificity: SPECIFICITY[st] ?? 0,
            priority: s.priority,
          });
        }
      }
    }
  }

  if (matches.length === 0) {
    const def = flows.find((f) => f.isDefault);
    if (!def) return null;
    return {
      id: def.id,
      name: def.name,
      noticePeriodDays: def.noticePeriodDays,
      buyoutAllowed: def.buyoutAllowed,
      isDefault: def.isDefault,
      matchedReason: "Default resignation flow.",
    };
  }

  matches.sort(
    (a, b) =>
      b.specificity - a.specificity ||
      a.priority - b.priority ||
      (b.flow.isDefault ? 1 : 0) - (a.flow.isDefault ? 1 : 0) ||
      a.flow.id - b.flow.id,
  );

  const w = matches[0]!;
  return {
    id: w.flow.id,
    name: w.flow.name,
    noticePeriodDays: w.flow.noticePeriodDays,
    buyoutAllowed: w.flow.buyoutAllowed,
    isDefault: w.flow.isDefault,
    matchedReason:
      w.scopeType === "Company"
        ? "Company-wide flow."
        : `Matched ${w.scopeType} #${w.scopeId}.`,
  };
}

export { SPECIFICITY as RESIGNATION_FLOW_SPECIFICITY };
