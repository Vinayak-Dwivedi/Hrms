import assert from "node:assert/strict";

import { describe, it } from "node:test";

import type { EmployeeReportingTreeRow } from "@/modules/org-hierarchy/repositories/org-hierarchy.repository";
import {
  buildEmployeeReportingTree,
  UNASSIGNED_DEPT_ID,
} from "@/modules/org-hierarchy/services/employee-reporting-tree";

function row(
  overrides: Partial<EmployeeReportingTreeRow> &
    Pick<EmployeeReportingTreeRow, "employeeId" | "empId">,
): EmployeeReportingTreeRow {
  return {
    firstName: "Test",
    middleName: null,
    lastName: "User",
    profilePhotoUrl: null,
    reportingManagerId: null,
    departmentId: 1,
    departmentName: "Operations",
    departmentCode: "OPS",
    subDepartmentId: 10,
    subDepartmentName: "Beetal",
    designationName: "Manager",
    levelCode: "L3",
    levelName: "Manager",
    levelSortOrder: 3,
    ...overrides,
  };
}

describe("buildEmployeeReportingTree", () => {
  it("builds nested reporting chain under one sub-department", () => {
    const tree = buildEmployeeReportingTree([
      row({
        employeeId: 1,
        empId: "E001",
        firstName: "Alice",
        lastName: "Director",
        designationName: "Director",
        levelCode: "L5",
        levelSortOrder: 5,
      }),
      row({
        employeeId: 2,
        empId: "E002",
        firstName: "Bob",
        lastName: "Manager",
        reportingManagerId: 1,
        designationName: "Manager",
        levelCode: "L3",
        levelSortOrder: 3,
      }),
      row({
        employeeId: 3,
        empId: "E003",
        firstName: "Carol",
        lastName: "Exec",
        reportingManagerId: 2,
        designationName: "Executive",
        levelCode: "L1",
        levelSortOrder: 1,
      }),
    ]);

    assert.equal(tree.length, 1);
    assert.equal(tree[0]!.name, "Operations");
    assert.equal(tree[0]!.subDepartments.length, 1);

    const roots = tree[0]!.subDepartments[0]!.roots;
    assert.equal(roots.length, 1);
    assert.equal(roots[0]!.name, "Alice Director");
    assert.equal(roots[0]!.directReports.length, 1);
    assert.equal(roots[0]!.directReports[0]!.name, "Bob Manager");
    assert.equal(roots[0]!.directReports[0]!.directReports[0]!.name, "Carol Exec");
  });

  it("sorts multiple roots by level high to low", () => {
    const tree = buildEmployeeReportingTree([
      row({
        employeeId: 1,
        empId: "E001",
        firstName: "Low",
        lastName: "Rank",
        designationName: "Executive",
        levelCode: "L1",
        levelSortOrder: 1,
      }),
      row({
        employeeId: 2,
        empId: "E002",
        firstName: "High",
        lastName: "Rank",
        designationName: "Director",
        levelCode: "L5",
        levelSortOrder: 5,
      }),
    ]);

    const roots = tree[0]!.subDepartments[0]!.roots;
    assert.equal(roots.length, 2);
    assert.deepEqual(
      roots.map((r) => r.name),
      ["Low Rank", "High Rank"],
    );
  });

  it("treats employee as root when manager is in another sub-department", () => {
    const tree = buildEmployeeReportingTree([
      row({
        employeeId: 1,
        empId: "E001",
        firstName: "Manager",
        lastName: "Alpha",
        subDepartmentId: 11,
        subDepartmentName: "Alpha",
      }),
      row({
        employeeId: 2,
        empId: "E002",
        firstName: "Report",
        lastName: "Beetal",
        reportingManagerId: 1,
        subDepartmentId: 10,
        subDepartmentName: "Beetal",
      }),
    ]);

    const beetal = tree[0]!.subDepartments.find((s) => s.name === "Beetal");
    assert.ok(beetal);
    assert.equal(beetal!.roots.length, 1);
    assert.equal(beetal!.roots[0]!.name, "Report Beetal");
    assert.equal(beetal!.roots[0]!.directReports.length, 0);
  });

  it("places employees without structure mapping in Unassigned", () => {
    const tree = buildEmployeeReportingTree([
      row({
        employeeId: 1,
        empId: "E001",
        firstName: "No",
        lastName: "Structure",
        departmentId: null,
        departmentName: null,
        departmentCode: null,
        subDepartmentId: null,
        subDepartmentName: null,
        designationName: null,
        levelCode: null,
        levelSortOrder: null,
      }),
    ]);

    assert.equal(tree.length, 1);
    assert.equal(tree[0]!.id, UNASSIGNED_DEPT_ID);
    assert.equal(tree[0]!.name, "Unassigned");
    assert.equal(tree[0]!.subDepartments[0]!.roots[0]!.name, "No Structure");
  });

  it("returns empty array when no employees", () => {
    assert.deepEqual(buildEmployeeReportingTree([]), []);
  });
});
