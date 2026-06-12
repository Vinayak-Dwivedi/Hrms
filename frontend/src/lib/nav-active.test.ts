import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatEntryId,
  isNavActive,
  navMatchSpecificity,
  resolveActiveEntryId,
} from "./nav-active";

const userMgmtSection = {
  title: "USER MANAGEMENT",
  sectionKey: "user-management",
  entries: [
    { label: "Employees", href: "/employees" },
    { label: "Hierarchy", href: "/departments/hierarchy" },
  ],
};

describe("nav-active", () => {
  it("highlights the hierarchy nav entry on hierarchy routes", () => {
    const pathname = "/departments/hierarchy";
    assert.equal(isNavActive(userMgmtSection.entries[1], pathname), true);
    assert.equal(
      navMatchSpecificity(userMgmtSection.entries[1], pathname),
      "/departments/hierarchy".length,
    );
    assert.equal(
      resolveActiveEntryId([userMgmtSection], pathname),
      formatEntryId("USER MANAGEMENT", "Hierarchy"),
    );
  });
});
