import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authRoleToRbacCode,
  defaultPermissionCodesForJwtRole,
} from "@/middleware/require-permission";

describe("require-permission role mapping", () => {
  it("maps jwt roles to rbac codes", () => {
    assert.equal(authRoleToRbacCode("admin"), "admin");
    assert.equal(authRoleToRbacCode("manager"), "manager");
    assert.equal(authRoleToRbacCode("hr"), "hr");
    assert.equal(authRoleToRbacCode("user"), "employee");
    assert.equal(authRoleToRbacCode("unknown"), "employee");
  });

  it("provides hr default permissions for onboarding and org setup", () => {
    const codes = defaultPermissionCodesForJwtRole("hr");
    assert.ok(codes.includes("onboarding.view"));
    assert.ok(codes.includes("onboarding.manage"));
    assert.ok(codes.includes("employees.view"));
    assert.ok(!codes.includes("admin.roles"));
  });

  it("provides employee defaults without admin permissions", () => {
    const codes = defaultPermissionCodesForJwtRole("user");
    assert.ok(codes.includes("leave.view"));
    assert.ok(!codes.includes("leave.approve"));
    assert.ok(!codes.includes("admin.permissions"));
  });
});
