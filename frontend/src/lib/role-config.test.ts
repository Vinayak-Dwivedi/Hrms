import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dashboardModulesFor,
  navSectionsForRole,
  quickLinksFor,
} from "./role-config";

function has(codes: string[]) {
  return (code: string) => codes.includes(code);
}

const SAMPLE_SECTIONS = [
  { title: "PERSONAL" },
  { title: "MY TEAM" },
  { title: "USER MANAGEMENT" },
];

describe("role-config", () => {
  it("exposes dashboard modules per role", () => {
    const manager = dashboardModulesFor("manager", has([]));
    assert.equal(manager.bottomTableKind, "team");

    const admin = dashboardModulesFor("admin", has([]));
    assert.equal(admin.bottomTableKind, "admin");

    const hr = dashboardModulesFor(
      "hr",
      has(["onboarding.view", "employees.view"]),
    );
    assert.equal(hr.hrSection, true);
    assert.equal(hr.bottomTableKind, "hr");

    const employee = dashboardModulesFor("employee", has([]));
    assert.equal(employee.personalWidgets, true);
    assert.equal(employee.bottomTableKind, "own");
  });

  it("omits manager quick link to team dashboard", () => {
    const links = quickLinksFor("manager", has(["leave.approve"]));
    const hrefs = links.map((l) => l.href);
    assert.ok(!hrefs.includes("/manager/team-dashboard"));
    assert.ok(hrefs.includes("/manager/approvals"));
  });

  it("shows MY TEAM nav only for manager role", () => {
    const managerTitles = navSectionsForRole("manager", SAMPLE_SECTIONS).map(
      (s) => s.title,
    );
    assert.ok(managerTitles.includes("MY TEAM"));

    const hrTitles = navSectionsForRole("hr", SAMPLE_SECTIONS).map(
      (s) => s.title,
    );
    assert.ok(!hrTitles.includes("MY TEAM"));

    const adminTitles = navSectionsForRole("admin", SAMPLE_SECTIONS).map(
      (s) => s.title,
    );
    assert.ok(!adminTitles.includes("MY TEAM"));
  });
});
