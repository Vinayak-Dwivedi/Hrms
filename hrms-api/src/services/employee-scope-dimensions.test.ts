import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  employeeMatchesHierarchyScope,
  type EmployeeScopeDimensions,
} from "./employee-scope-dimensions.ts";

const baseEmp: EmployeeScopeDimensions = {
  id: 1,
  joiningDate: "2024-01-01",
  branchId: 5,
  locationId: 10,
  departmentId: 99,
  subDepartmentId: 88,
  orgHierarchyDepartmentId: 20,
  orgHierarchySubDepartmentId: 30,
};

describe("employeeMatchesHierarchyScope", () => {
  it("matches Company scope", () => {
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Company", scopeId: null },
      ]),
      true,
    );
  });

  it("uses locationId for Branch matching", () => {
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Branch", scopeId: 10 },
      ]),
      true,
    );
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Branch", scopeId: 5 },
      ]),
      false,
    );
  });

  it("prefers org hierarchy department and sub-department ids", () => {
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Department", scopeId: 20 },
        { scopeType: "SubDepartment", scopeId: 30 },
      ]),
      true,
    );
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Department", scopeId: 99 },
      ]),
      false,
    );
  });

  it("requires AND match across Branch, Department, and SubDepartment", () => {
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Branch", scopeId: 10 },
        { scopeType: "Department", scopeId: 20 },
      ]),
      true,
    );
    assert.equal(
      employeeMatchesHierarchyScope(baseEmp, [
        { scopeType: "Branch", scopeId: 10 },
        { scopeType: "Department", scopeId: 99 },
      ]),
      false,
    );
  });
});
