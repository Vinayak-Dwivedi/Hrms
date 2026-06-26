import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessRouteWithPermissions,
  requiredPermissionsForRoute,
} from "./nav-permissions";

describe("nav-permissions", () => {
  it("gates leave policy and holiday policy by dedicated permissions", () => {
    assert.deepEqual(requiredPermissionsForRoute("/leave-policy"), [
      "leave.policy.manage",
      "admin.roles",
    ]);
    assert.deepEqual(requiredPermissionsForRoute("/holiday-calendars"), [
      "holiday.policy.manage",
      "admin.roles",
    ]);

    assert.equal(
      canAccessRouteWithPermissions("/leave-policy", ["leave.policy.manage"]),
      true,
    );
    assert.equal(
      canAccessRouteWithPermissions("/leave-policy", ["holiday.policy.manage"]),
      false,
    );
    assert.equal(
      canAccessRouteWithPermissions("/holiday-calendars", [
        "holiday.policy.manage",
      ]),
      true,
    );
    assert.equal(
      canAccessRouteWithPermissions("/holiday-calendars", ["leave.policy.manage"]),
      false,
    );
  });

  it("gates my clearances consistently", () => {
    assert.deepEqual(requiredPermissionsForRoute("/my-clearances"), [
      "leave.approve",
      "offboarding.clearance.it",
      "offboarding.clearance.admin",
      "offboarding.clearance.finance",
      "offboarding.clearance.hr",
      "offboarding.clearance.operations",
      "admin.roles",
    ]);
  });

  it("allows custom-role users only on permitted routes", () => {
    const attendanceClerk = ["attendance.view", "attendance.upload"];

    assert.equal(
      canAccessRouteWithPermissions("/attendance/upload", attendanceClerk),
      true,
    );
    assert.equal(
      canAccessRouteWithPermissions("/employees", attendanceClerk),
      false,
    );
    assert.equal(
      canAccessRouteWithPermissions("/admin/holidays", attendanceClerk),
      false,
    );
  });

  it("allows clearance-only users on my clearances", () => {
    const itClearance = ["offboarding.clearance.it"];
    assert.equal(
      canAccessRouteWithPermissions("/my-clearances", itClearance),
      true,
    );
    assert.equal(
      canAccessRouteWithPermissions("/manager/approvals", itClearance),
      false,
    );
  });

  it("gates attendance report by leave.approve", () => {
    assert.deepEqual(requiredPermissionsForRoute("/attendance/report"), [
      "leave.approve",
    ]);
    assert.equal(
      canAccessRouteWithPermissions("/attendance/report", ["leave.approve"]),
      true,
    );
    assert.equal(
      canAccessRouteWithPermissions("/attendance/report", ["attendance.view"]),
      false,
    );
  });

  it("gates shift configuration by shift.policy.manage", () => {
    assert.deepEqual(requiredPermissionsForRoute("/shift-configuration"), [
      "shift.policy.manage",
      "admin.roles",
    ]);
    assert.equal(
      canAccessRouteWithPermissions("/shift-configuration", [
        "shift.policy.manage",
      ]),
      true,
    );
    assert.equal(
      canAccessRouteWithPermissions("/shift-configuration", [
        "holiday.policy.manage",
      ]),
      false,
    );
  });
});
