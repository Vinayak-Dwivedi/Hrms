import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveUiRole } from "./resolve-ui-role";

function has(codes: string[]) {
  return (code: string) => codes.includes(code);
}

describe("resolveUiRole", () => {
  it("returns admin for master and admin auth roles", () => {
    assert.equal(resolveUiRole(has([]), "master"), "admin");
    assert.equal(resolveUiRole(has([]), "admin"), "admin");
  });

  it("returns hr for hr auth role before manager permission", () => {
    assert.equal(resolveUiRole(has(["leave.approve"]), "hr"), "hr");
  });

  it("returns manager when user can approve leave", () => {
    assert.equal(resolveUiRole(has(["leave.approve"]), "user"), "manager");
  });

  it("returns employee by default", () => {
    assert.equal(resolveUiRole(has([]), "user"), "employee");
  });
});
