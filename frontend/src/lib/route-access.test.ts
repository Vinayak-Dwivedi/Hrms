import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessRoute,
  defaultHomeForUser,
  hasPermission,
  requiredPermissionsForRoute,
} from "./route-access";

describe("route-access", () => {
  const employeeSession = {
    role: "user",
    permissions: ["leave.view", "attendance.view", "payroll.view"],
  };

  const managerSession = {
    role: "manager",
    permissions: [
      "leave.view",
      "leave.approve",
      "attendance.view",
      "employees.view",
    ],
  };

  const hrSession = {
    role: "hr",
    permissions: ["onboarding.view", "onboarding.manage", "attendance.view"],
  };

  const adminSession = {
    role: "admin",
    permissions: ["admin.roles", "admin.permissions", "employees.view"],
  };

  it("gates admin routes by permissions from DB", () => {
    assert.equal(canAccessRoute("/user-roles", adminSession), true);
    assert.equal(
      canAccessRoute("/user-roles", { role: "admin", permissions: [] }),
      false,
    );
    assert.equal(hasPermission(adminSession.permissions, "admin.roles"), true);
  });

  it("blocks employees from admin routes", () => {
    assert.equal(canAccessRoute("/user-roles", employeeSession), false);
    assert.equal(canAccessRoute("/add-permission", employeeSession), false);
  });

  it("allows employees on open personal routes", () => {
    assert.equal(canAccessRoute("/dashboard", employeeSession), true);
    assert.equal(canAccessRoute("/policies", employeeSession), true);
  });

  it("gates attendance and payslips by permission", () => {
    assert.equal(canAccessRoute("/attendance", employeeSession), true);
    assert.equal(canAccessRoute("/payslips", employeeSession), true);
    assert.equal(
      canAccessRoute("/attendance", {
        role: "user",
        permissions: ["leave.view"],
      }),
      false,
    );
  });

  it("requires leave.approve for manager zone", () => {
    assert.equal(canAccessRoute("/manager/dashboard", managerSession), true);
    assert.equal(canAccessRoute("/manager/approvals", managerSession), true);
    assert.equal(canAccessRoute("/manager/dashboard", employeeSession), false);
  });

  it("restricts hr zone by onboarding permissions", () => {
    assert.equal(canAccessRoute("/hr/dashboard", hrSession), true);
    assert.equal(canAccessRoute("/hr/dashboard", employeeSession), false);
  });

  it("resolves edit route permissions", () => {
    assert.deepEqual(requiredPermissionsForRoute("/employees/42/edit"), [
      "employees.edit",
    ]);
    assert.deepEqual(requiredPermissionsForRoute("/employees/42"), [
      "employees.view",
    ]);
    assert.deepEqual(requiredPermissionsForRoute("/employees/42/onboarding"), [
      "onboarding.view",
      "onboarding.manage",
      "onboarding.verify_documents",
      "onboarding.resend_invitation",
      "onboarding.manage_bank",
    ]);
    assert.equal(
      canAccessRoute("/employees/42/onboarding", hrSession),
      true,
    );
    assert.equal(
      canAccessRoute("/employees/42/onboarding", employeeSession),
      false,
    );
  });

  it("gates leave policy and holiday policy by permission", () => {
    assert.equal(
      canAccessRoute("/leave-policy", {
        role: "hr",
        permissions: ["leave.policy.manage"],
      }),
      true,
    );
    assert.equal(
      canAccessRoute("/holiday-calendars", {
        role: "hr",
        permissions: ["holiday.policy.manage"],
      }),
      true,
    );
    assert.equal(
      canAccessRoute("/leave-policy", {
        role: "hr",
        permissions: ["holiday.policy.manage"],
      }),
      false,
    );
    assert.equal(canAccessRoute("/leave-policy", adminSession), true);
    assert.equal(canAccessRoute("/leave-policy", employeeSession), false);
    assert.equal(
      canAccessRoute("/my-clearances", {
        role: "user",
        permissions: ["offboarding.clearance.it"],
      }),
      true,
    );
    assert.equal(canAccessRoute("/my-clearances", employeeSession), false);
  });

  it("picks canonical default home for all roles", () => {
    assert.equal(defaultHomeForUser("hr", hrSession.permissions), "/dashboard");
    assert.equal(
      defaultHomeForUser("manager", managerSession.permissions),
      "/dashboard",
    );
    assert.equal(
      defaultHomeForUser("user", employeeSession.permissions),
      "/dashboard",
    );
  });
});
