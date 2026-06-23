import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidReportingManagerAssignment,
  resolveReportingManagerRule,
  type EmployeeOrgContext,
} from "./reporting-manager-rules.js";

const levels = [
  { id: 1, sortOrder: 1 },
  { id: 2, sortOrder: 2 },
  { id: 3, sortOrder: 3 },
  { id: 4, sortOrder: 4 },
  { id: 5, sortOrder: 5 },
];

const designations = [
  { id: 10, name: "Executive", levelId: 1 },
  { id: 20, name: "Manager", levelId: 3 },
  { id: 30, name: "HOD", levelId: 4 },
  { id: 40, name: "Director", levelId: 5 },
  { id: 50, name: "Admin", levelId: 5 },
  { id: 60, name: "HR", levelId: 5 },
];

describe("resolveReportingManagerRule", () => {
  it("uses Admin/HR for HOD", () => {
    assert.deepEqual(resolveReportingManagerRule(30, designations, levels), {
      mode: "designation_names",
      names: ["Admin", "HR"],
    });
  });

  it("uses senior levels for Manager", () => {
    assert.deepEqual(resolveReportingManagerRule(20, designations, levels), {
      mode: "senior_levels",
      employeeSortOrder: 3,
    });
  });
});

describe("isValidReportingManagerAssignment", () => {
  it("allows any senior designation for Manager employee", () => {
    const employee: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 20,
      employeeStatus: "Active",
    };
    const manager: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 40,
      employeeStatus: "Active",
    };
    assert.equal(
      isValidReportingManagerAssignment(
        employee,
        manager,
        designations,
        levels,
      ),
      true,
    );
  });

  it("rejects same designation", () => {
    const employee: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 30,
      employeeStatus: "Active",
    };
    const manager: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 30,
      employeeStatus: "Active",
    };
    assert.equal(
      isValidReportingManagerAssignment(
        employee,
        manager,
        designations,
        levels,
      ),
      false,
    );
  });

  it("allows Admin for HOD employee", () => {
    const employee: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 30,
      employeeStatus: "Active",
    };
    const manager: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 9,
      subDepartmentId: 3,
      designationId: 50,
      employeeStatus: "Active",
    };
    assert.equal(
      isValidReportingManagerAssignment(
        employee,
        manager,
        designations,
        levels,
      ),
      true,
    );
  });

  it("rejects peer Manager for Manager employee", () => {
    const employee: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 20,
      employeeStatus: "Active",
    };
    const manager: EmployeeOrgContext = {
      locationId: 5,
      departmentId: 1,
      subDepartmentId: 2,
      designationId: 20,
      employeeStatus: "Active",
    };
    assert.equal(
      isValidReportingManagerAssignment(
        employee,
        manager,
        designations,
        levels,
      ),
      false,
    );
  });
});
