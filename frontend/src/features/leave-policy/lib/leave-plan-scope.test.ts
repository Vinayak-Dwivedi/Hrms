import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildScopePayload,
  buildScopePayloadFromCascade,
  hydrateCascadeFromRows,
  isCascadeScopeValid,
  isHierarchyScopeValid,
} from "./leave-plan-scope.ts";

describe("leave-plan-scope", () => {
  it("builds Company scope when all locations and departments", () => {
    const rows = buildScopePayload(
      true,
      new Set(),
      true,
      new Set(),
      true,
      new Set(),
    );
    assert.deepEqual(rows, [
      { scopeType: "Company", scopeId: null, priority: 100 },
    ]);
  });

  it("builds cascade scope for location with all departments", () => {
    const rows = buildScopePayloadFromCascade({
      companyWide: false,
      locationId: 3,
      allDepartments: true,
      departmentId: null,
      allSubDepartments: true,
      subDepartmentId: null,
    });
    assert.deepEqual(rows, [
      { scopeType: "Branch", scopeId: 3, priority: 110 },
    ]);
  });

  it("builds full cascade path scope rows", () => {
    const rows = buildScopePayloadFromCascade({
      companyWide: false,
      locationId: 1,
      allDepartments: false,
      departmentId: 10,
      allSubDepartments: false,
      subDepartmentId: 100,
    });
    assert.deepEqual(rows, [
      { scopeType: "Branch", scopeId: 1, priority: 110 },
      { scopeType: "Department", scopeId: 10, priority: 100 },
      { scopeType: "SubDepartment", scopeId: 100, priority: 90 },
    ]);
  });

  it("hydrates empty scope as incomplete specific unit", () => {
    const cascade = hydrateCascadeFromRows([]);
    assert.equal(cascade.companyWide, false);
    assert.equal(cascade.locationId, null);
  });

  it("hydrates cascade state from saved rows", () => {
    const cascade = hydrateCascadeFromRows([
      { scopeType: "Branch", scopeId: 3, priority: 110 },
      { scopeType: "Department", scopeId: 7, priority: 100 },
    ]);
    assert.equal(cascade.companyWide, false);
    assert.equal(cascade.locationId, 3);
    assert.equal(cascade.departmentId, 7);
    assert.equal(cascade.allSubDepartments, true);
  });

  it("validates cascade selections", () => {
    assert.equal(
      isCascadeScopeValid({
        companyWide: true,
        locationId: null,
        allDepartments: true,
        departmentId: null,
        allSubDepartments: true,
        subDepartmentId: null,
      }),
      true,
    );
    assert.equal(
      isCascadeScopeValid({
        companyWide: false,
        locationId: null,
        allDepartments: true,
        departmentId: null,
        allSubDepartments: true,
        subDepartmentId: null,
      }),
      false,
    );
    assert.equal(
      isHierarchyScopeValid({
        allLocations: false,
        locationIds: new Set([1]),
        allDepartments: true,
        departmentIds: new Set(),
        allSubDepartments: true,
        subDepartmentIds: new Set(),
      }),
      true,
    );
  });
});
