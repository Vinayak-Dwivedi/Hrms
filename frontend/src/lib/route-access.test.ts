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

  it("admin bypasses all permission checks", () => {
    assert.equal(
      canAccessRoute("/user-roles", { role: "admin", permissions: [] }),
      true,
    );
    assert.equal(hasPermission([], "admin.roles", "admin"), true);
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

  it("restricts hr zone to hr role or onboarding.view", () => {
    assert.equal(canAccessRoute("/hr/dashboard", hrSession), true);
    assert.equal(canAccessRoute("/hr/dashboard", employeeSession), false);
    assert.equal(
      canAccessRoute("/hr/org-setup/location", hrSession),
      true,
    );
    assert.equal(
      canAccessRoute("/hr/org-setup/location", {
        role: "hr",
        permissions: ["onboarding.view"],
      }),
      false,
    );
  });

  it("resolves edit route permissions", () => {
    assert.deepEqual(requiredPermissionsForRoute("/employees/42/edit"), [
      "employees.edit",
    ]);
    assert.deepEqual(requiredPermissionsForRoute("/employees/42"), [
      "employees.view",
    ]);
  });

  it("picks role-appropriate default home", () => {
    assert.equal(defaultHomeForUser("hr", hrSession.permissions), "/hr/dashboard");
    assert.equal(
      defaultHomeForUser("manager", managerSession.permissions),
      "/manager/dashboard",
    );
    assert.equal(
      defaultHomeForUser("user", employeeSession.permissions),
      "/dashboard",
    );
  });
});
