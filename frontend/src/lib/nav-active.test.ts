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
    { label: "Hierarchy", href: "/hierarchy" },
    { label: "Department Hierarchy", href: "/departments/hierarchy" },
  ],
};

describe("nav-active", () => {
  it("highlights Hierarchy on /hierarchy", () => {
    const pathname = "/hierarchy";
    assert.equal(isNavActive(userMgmtSection.entries[1], pathname), true);
    assert.equal(
      resolveActiveEntryId([userMgmtSection], pathname),
      formatEntryId("USER MANAGEMENT", "Hierarchy"),
    );
  });

  it("highlights Department Hierarchy on /departments/hierarchy", () => {
    const pathname = "/departments/hierarchy";
    assert.equal(isNavActive(userMgmtSection.entries[2], pathname), true);
    assert.equal(
      navMatchSpecificity(userMgmtSection.entries[2], pathname),
      "/departments/hierarchy".length,
    );
    assert.equal(
      resolveActiveEntryId([userMgmtSection], pathname),
      formatEntryId("USER MANAGEMENT", "Department Hierarchy"),
    );
  });
});
