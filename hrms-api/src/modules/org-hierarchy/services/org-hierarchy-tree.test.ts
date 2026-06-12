import assert from "node:assert/strict";

import { describe, it } from "node:test";

import type { StructureJoinRow } from "@/modules/org-hierarchy/repositories/org-hierarchy.repository";

import { buildHierarchyTree } from "@/modules/org-hierarchy/services/org-hierarchy-tree";



function row(

  overrides: Partial<StructureJoinRow> & Pick<StructureJoinRow, "structureId">,

): StructureJoinRow {

  return {

    departmentId: 1,

    departmentName: "Operations",

    departmentCode: "OPS",

    subDepartmentId: 10,

    subDepartmentName: "Beetal",

    designationId: 100,

    designationName: "HOD",

    levelId: 4,

    levelCode: "L4",

    ...overrides,

  };

}



describe("buildHierarchyTree", () => {

  it("builds nested department → sub-department → roles", () => {

    const tree = buildHierarchyTree([

      row({ structureId: 1, designationName: "HOD", levelCode: "L4" }),

      row({

        structureId: 2,

        designationId: 101,

        designationName: "Manager",

        levelId: 3,

        levelCode: "L3",

      }),

      row({

        structureId: 3,

        designationId: 102,

        designationName: "Executive",

        levelId: 1,

        levelCode: "L1",

      }),

    ]);



    assert.equal(tree.length, 1);

    assert.equal(tree[0]!.name, "Operations");

    assert.equal(tree[0]!.subDepartments.length, 1);

    assert.equal(tree[0]!.subDepartments[0]!.name, "Beetal");

    assert.equal(tree[0]!.subDepartments[0]!.roles.length, 3);

    assert.deepEqual(

      tree[0]!.subDepartments[0]!.roles.map((r) => r.designation),

      ["HOD", "Manager", "Executive"],

    );

  });



  it("groups multiple sub-departments under one department", () => {

    const tree = buildHierarchyTree([

      row({ structureId: 1, subDepartmentId: 10, subDepartmentName: "Beetal" }),

      row({

        structureId: 2,

        subDepartmentId: 11,

        subDepartmentName: "Alpha",

        designationId: 200,

        designationName: "Manager",

      }),

    ]);



    assert.equal(tree[0]!.subDepartments.length, 2);

    const names = tree[0]!.subDepartments.map((s) => s.name).sort();

    assert.deepEqual(names, ["Alpha", "Beetal"]);

  });



  it("returns empty array when no structure rows", () => {

    assert.deepEqual(buildHierarchyTree([]), []);

  });



  it("sorts departments by name", () => {

    const tree = buildHierarchyTree([

      row({

        structureId: 1,

        departmentId: 2,

        departmentName: "Sales",

        departmentCode: "SLS",

      }),

      row({ structureId: 2, departmentId: 1, departmentName: "Operations", departmentCode: "OPS" }),

    ]);

    assert.deepEqual(tree.map((d) => d.name), ["Operations", "Sales"]);

  });

});

