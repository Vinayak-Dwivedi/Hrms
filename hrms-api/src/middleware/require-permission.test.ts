import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authRoleToRbacCode } from "@/middleware/require-permission";

describe("require-permission role mapping", () => {
  it("maps jwt roles to rbac role codes", () => {
    assert.equal(authRoleToRbacCode("admin"), "admin");
    assert.equal(authRoleToRbacCode("manager"), "manager");
    assert.equal(authRoleToRbacCode("hr"), "hr");
    assert.equal(authRoleToRbacCode("user"), "employee");
    assert.equal(authRoleToRbacCode("employee"), "employee");
  });
});
