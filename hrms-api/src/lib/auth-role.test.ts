import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authRoleToRbacCode, rbacCodeToAuthRole } from "@/lib/auth-role";
import { USER_TYPE_IDS, userTypeIdFromAuthRole } from "@/lib/user-type";

describe("auth-role mapping", () => {
  it("maps rbac role codes to jwt auth roles", () => {
    assert.equal(rbacCodeToAuthRole("admin"), "admin");
    assert.equal(rbacCodeToAuthRole("manager"), "manager");
    assert.equal(rbacCodeToAuthRole("hr"), "hr");
    assert.equal(rbacCodeToAuthRole("employee"), "user");
    assert.equal(rbacCodeToAuthRole("unknown"), "user");
  });

  it("maps jwt auth roles to rbac role codes", () => {
    assert.equal(authRoleToRbacCode("admin"), "admin");
    assert.equal(authRoleToRbacCode("manager"), "manager");
    assert.equal(authRoleToRbacCode("hr"), "hr");
    assert.equal(authRoleToRbacCode("user"), "employee");
    assert.equal(authRoleToRbacCode("employee"), "employee");
  });

  it("round-trips rbac codes through auth role to rbac code", () => {
    for (const code of ["admin", "manager", "hr", "employee"] as const) {
      assert.equal(authRoleToRbacCode(rbacCodeToAuthRole(code)), code);
    }
  });

  it("assigns expected user_type_id from rbac-derived auth roles", () => {
    assert.equal(
      userTypeIdFromAuthRole(rbacCodeToAuthRole("admin")),
      USER_TYPE_IDS.admin,
    );
    assert.equal(
      userTypeIdFromAuthRole(rbacCodeToAuthRole("hr")),
      USER_TYPE_IDS.hr,
    );
    assert.equal(
      userTypeIdFromAuthRole(rbacCodeToAuthRole("manager")),
      USER_TYPE_IDS.manager,
    );
    assert.equal(
      userTypeIdFromAuthRole(rbacCodeToAuthRole("employee")),
      USER_TYPE_IDS.employee,
    );
  });
});
