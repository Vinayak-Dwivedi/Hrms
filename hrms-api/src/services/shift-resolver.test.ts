import assert from "node:assert/strict";
import { describe, it } from "node:test";

const SPECIFICITY_ORDER: Record<string, number> = {
  Employee: 9,
  Designation: 8,
  Grade: 7,
  SubDepartment: 6,
  Department: 5,
  Branch: 4,
  Location: 3,
  EmploymentType: 2,
  Company: 1,
};

function pickBest(
  matches: { scopeType: string; priority: number; isDefault: boolean }[],
) {
  let best: (typeof matches)[number] | null = null;
  let bestScore = -1;
  for (const row of matches) {
    const specificity = SPECIFICITY_ORDER[row.scopeType] ?? 0;
    const score = specificity * 1000 + row.priority + (row.isDefault ? 1 : 0);
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best;
}

describe("shift-resolver specificity", () => {
  it("prefers employee scope over company", () => {
    const best = pickBest([
      { scopeType: "Company", priority: 100, isDefault: false },
      { scopeType: "Employee", priority: 100, isDefault: false },
    ]);
    assert.equal(best?.scopeType, "Employee");
  });

  it("prefers higher priority at same specificity", () => {
    const best = pickBest([
      { scopeType: "Department", priority: 50, isDefault: false },
      { scopeType: "Department", priority: 120, isDefault: false },
    ]);
    assert.equal(best?.priority, 120);
  });
});
