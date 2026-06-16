// Given an employee + leave_type, find which policy applies.
//
// Algorithm:
//   1. Pull every Active policy for the leave_type.
//   2. For each policy, find scope rows that match the employee's facets
//      (employee_id, designation_id, grade_id, department_id, branch_id,
//      employment_type_id, process_id, or a Company-wide wildcard).
//   3. Rank by specificity:
//        Employee=7 > Designation=6 > Grade=5 > Process=4
//        > Department=3 > Branch=2 > EmploymentType=1 > Company=0
//      Tie-break by priority (lower wins), then by isDefault, then by id.
//   4. Return the winning policy with a `matchedReason` string so the UI
//      can show *why* this policy applies.

import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  leavePolicies,
  leavePolicyScope,
  leaveTypes,
} from "@/db/schema/hrms";

type ScopeType =
  | "Company"
  | "Branch"
  | "Department"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Process"
  | "Employee";

const SPECIFICITY: Record<ScopeType, number> = {
  Employee: 7,
  Designation: 6,
  Grade: 5,
  Process: 4,
  Department: 3,
  Branch: 2,
  EmploymentType: 1,
  Company: 0,
};

// Build a lookup of "what facets does this employee have" so we can match
// policy scope rows in one pass.
function employeeFacets(emp: typeof employees.$inferSelect): Record<ScopeType, number | null> {
  return {
    Employee: emp.id,
    Designation: emp.designationId,
    Grade: emp.gradeId,
    // `processId` doesn't exist on employees yet — treat as no-match for now.
    Process: null,
    Department: emp.departmentId,
    Branch: emp.branchId,
    EmploymentType: emp.employmentTypeId,
    // Company is the wildcard; always matches.
    Company: null,
  };
}

export interface ResolvedPolicyResult {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  policy: {
    id: number;
    name: string;
    description: string | null;
    settings: Record<string, unknown>;
    isDefault: boolean;
    matchedScope: { scopeType: ScopeType; scopeId: number | null } | null;
    matchedReason: string;
  } | null;
}

export async function resolvePolicyForEmployee(
  employeeId: number,
  leaveTypeIdOrCode: { id?: number; code?: string },
): Promise<ResolvedPolicyResult | null> {
  // Resolve leave_type
  const [type] = await db
    .select()
    .from(leaveTypes)
    .where(
      leaveTypeIdOrCode.id
        ? eq(leaveTypes.id, leaveTypeIdOrCode.id)
        : eq(leaveTypes.code, leaveTypeIdOrCode.code ?? ""),
    )
    .limit(1);
  if (!type) return null;

  const [emp] = await db
    .select({
      id: employees.id,
      designationId: employees.designationId,
      gradeId: employees.gradeId,
      departmentId: employees.departmentId,
      branchId: employees.branchId,
      employmentTypeId: employees.employmentTypeId,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) return null;

  const facets = employeeFacets(emp);

  // Pull all Active policies for this leave_type plus their scope rows.
  const policiesForType = await db
    .select()
    .from(leavePolicies)
    .where(
      and(
        eq(leavePolicies.leaveTypeId, type.id),
        eq(leavePolicies.status, "Active"),
      ),
    );

  if (policiesForType.length === 0) {
    return {
      leaveTypeId: type.id,
      leaveTypeCode: type.code,
      leaveTypeName: type.name,
      policy: null,
    };
  }

  type Match = {
    policy: (typeof policiesForType)[number];
    scope: { scopeType: ScopeType; scopeId: number | null } | null;
    specificity: number;
    priority: number;
  };
  const matches: Match[] = [];

  for (const p of policiesForType) {
    const scopeRows = await db
      .select()
      .from(leavePolicyScope)
      .where(eq(leavePolicyScope.policyId, p.id));

    for (const s of scopeRows) {
      const type = s.scopeType as ScopeType;
      if (type === "Company") {
        matches.push({
          policy: p,
          scope: { scopeType: type, scopeId: null },
          specificity: SPECIFICITY.Company,
          priority: s.priority,
        });
      } else {
        const empValue = facets[type];
        if (empValue !== null && empValue === s.scopeId) {
          matches.push({
            policy: p,
            scope: { scopeType: type, scopeId: s.scopeId },
            specificity: SPECIFICITY[type],
            priority: s.priority,
          });
        }
      }
    }
  }

  if (matches.length === 0) {
    // Fallback: if a default policy exists, use it even without a scope match.
    const def = policiesForType.find((p) => p.isDefault);
    return {
      leaveTypeId: type.id,
      leaveTypeCode: type.code,
      leaveTypeName: type.name,
      policy: def
        ? {
            id: def.id,
            name: def.name,
            description: def.description,
            settings: def.settings as Record<string, unknown>,
            isDefault: def.isDefault,
            matchedScope: null,
            matchedReason: "Default policy for this leave type.",
          }
        : null,
    };
  }

  matches.sort(
    (a, b) =>
      b.specificity - a.specificity ||
      a.priority - b.priority ||
      (b.policy.isDefault ? 1 : 0) - (a.policy.isDefault ? 1 : 0) ||
      a.policy.id - b.policy.id,
  );

  const winner = matches[0]!;
  const reasonParts: string[] = [];
  if (winner.scope) {
    reasonParts.push(
      winner.scope.scopeType === "Company"
        ? "Company-wide policy."
        : `Matched ${winner.scope.scopeType} #${winner.scope.scopeId}.`,
    );
  }
  if (winner.policy.isDefault) reasonParts.push("Marked as default.");

  return {
    leaveTypeId: type.id,
    leaveTypeCode: type.code,
    leaveTypeName: type.name,
    policy: {
      id: winner.policy.id,
      name: winner.policy.name,
      description: winner.policy.description,
      settings: winner.policy.settings as Record<string, unknown>,
      isDefault: winner.policy.isDefault,
      matchedScope: winner.scope,
      matchedReason: reasonParts.join(" ") || "Best match.",
    },
  };
}
