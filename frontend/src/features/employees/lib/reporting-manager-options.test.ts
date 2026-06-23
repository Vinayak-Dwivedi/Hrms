import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  OrgDesignation,
  OrgLevel,
  OrgStructure,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import type { EmployeeListItem } from "../api/employees.client";
import {
  defaultReportingManagerId,
  filterReportingManagerOptions,
  isReportingManagerFilterReady,
  resolveReportingManagerRule,
} from "./reporting-manager-options";

const levels: OrgLevel[] = [
  { id: 1, code: "L1", name: "Executive", sortOrder: 1, createdAt: "" },
  { id: 2, code: "L2", name: "Sr Executive", sortOrder: 2, createdAt: "" },
  { id: 3, code: "L3", name: "Manager", sortOrder: 3, createdAt: "" },
  { id: 4, code: "L4", name: "HOD", sortOrder: 4, createdAt: "" },
  { id: 5, code: "L5", name: "Director", sortOrder: 5, createdAt: "" },
];

const designations: OrgDesignation[] = [
  {
    id: 10,
    name: "Executive",
    code: "EXEC",
    levelId: 1,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 11,
    name: "Sr Executive",
    code: "SREXEC",
    levelId: 2,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 20,
    name: "Manager",
    code: "MGR",
    levelId: 3,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 30,
    name: "HOD",
    code: "HOD",
    levelId: 4,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 40,
    name: "Director",
    code: "DIR",
    levelId: 5,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 50,
    name: "Admin",
    code: "ADM",
    levelId: 5,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 60,
    name: "HR",
    code: "HR",
    levelId: 5,
    status: "Active",
    createdAt: "",
    updatedAt: "",
  },
];

const structures: OrgStructure[] = [];

const scope = {
  locationId: 5,
  departmentId: 1,
  subDepartmentId: 2,
};

const employees: EmployeeListItem[] = [
  {
    id: 1,
    empId: "E001",
    firstName: "Alice",
    middleName: null,
    lastName: "SrExec",
    workEmail: "alice@example.com",
    phone: "9999900001",
    departmentId: 1,
    subDepartmentId: 2,
    designationId: 11,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
  {
    id: 2,
    empId: "E002",
    firstName: "Bob",
    middleName: null,
    lastName: "Manager",
    workEmail: "bob@example.com",
    phone: "9999900002",
    departmentId: 1,
    subDepartmentId: 2,
    designationId: 20,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
  {
    id: 3,
    empId: "E003",
    firstName: "Cara",
    middleName: null,
    lastName: "HOD",
    workEmail: "cara@example.com",
    phone: "9999900003",
    departmentId: 1,
    subDepartmentId: 2,
    designationId: 30,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
  {
    id: 4,
    empId: "E004",
    firstName: "Dana",
    middleName: null,
    lastName: "Director",
    workEmail: "dana@example.com",
    phone: "9999900004",
    departmentId: 1,
    subDepartmentId: 2,
    designationId: 40,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
  {
    id: 5,
    empId: "E005",
    firstName: "Eve",
    middleName: null,
    lastName: "Admin",
    workEmail: "eve@example.com",
    phone: "9999900005",
    departmentId: 9,
    subDepartmentId: 3,
    designationId: 50,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
  {
    id: 6,
    empId: "E006",
    firstName: "Finn",
    middleName: null,
    lastName: "HR",
    workEmail: "finn@example.com",
    phone: "9999900006",
    departmentId: 9,
    subDepartmentId: 3,
    designationId: 60,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
  {
    id: 7,
    empId: "E007",
    firstName: "Gina",
    middleName: null,
    lastName: "Executive",
    workEmail: "gina@example.com",
    phone: "9999900007",
    departmentId: 1,
    subDepartmentId: 2,
    designationId: 10,
    locationId: 5,
    branchId: 5,
    employeeStatus: "Active",
    joiningDate: "2024-01-01",
  },
];

describe("resolveReportingManagerRule", () => {
  it("returns Admin/HR for HOD", () => {
    assert.deepEqual(resolveReportingManagerRule(30, designations, levels), {
      mode: "designation_names",
      names: ["Admin", "HR"],
    });
  });

  it("returns senior_levels for Executive", () => {
    assert.deepEqual(resolveReportingManagerRule(10, designations, levels), {
      mode: "senior_levels",
      employeeSortOrder: 1,
    });
  });

  it("returns senior_levels for Manager", () => {
    assert.deepEqual(resolveReportingManagerRule(20, designations, levels), {
      mode: "senior_levels",
      employeeSortOrder: 3,
    });
  });
});

describe("filterReportingManagerOptions", () => {
  it("requires full org scope and designation", () => {
    assert.equal(
      isReportingManagerFilterReady(
        { locationId: 5, departmentId: 1, subDepartmentId: null },
        10,
      ),
      false,
    );
  });

  it("lists all senior designations for Executive", () => {
    const result = filterReportingManagerOptions(
      employees,
      structures,
      scope,
      10,
      designations,
      levels,
      99,
    );
    assert.deepEqual(
      result.map((row) => row.id).sort(),
      [1, 2, 3, 4, 5, 6].sort(),
    );
  });

  it("lists HOD and above for Manager", () => {
    const result = filterReportingManagerOptions(
      employees,
      structures,
      scope,
      20,
      designations,
      levels,
    );
    assert.deepEqual(
      result.map((row) => row.id).sort(),
      [3, 4, 5, 6].sort(),
    );
  });

  it("lists only Admin and HR for HOD", () => {
    const result = filterReportingManagerOptions(
      employees,
      structures,
      scope,
      30,
      designations,
      levels,
    );
    assert.deepEqual(result, [
      { id: 5, label: "Eve Admin (E005)" },
      { id: 6, label: "Finn HR (E006)" },
    ]);
  });

  it("defaults to Admin for HOD when both Admin and HR exist", () => {
    const managers = [
      { id: 5, label: "Eve Admin (E005)" },
      { id: 6, label: "Finn HR (E006)" },
    ];
    assert.equal(
      defaultReportingManagerId(managers, {
        rule: { mode: "designation_names", names: ["Admin", "HR"] },
        employees,
        structures,
        designations,
      }),
      "5",
    );
  });

  it("defaults to HR for HOD when only HR exists", () => {
    assert.equal(
      defaultReportingManagerId(
        [{ id: 6, label: "Finn HR (E006)" }],
        {
          rule: { mode: "designation_names", names: ["Admin", "HR"] },
          employees,
          structures,
          designations,
        },
      ),
      "6",
    );
  });

  it("auto-selects when only one manager is available", () => {
    assert.equal(
      defaultReportingManagerId([
        { id: 5, label: "Eve Admin (E005)" },
      ]),
      "5",
    );
    assert.equal(
      defaultReportingManagerId([
        { id: 5, label: "Eve Admin (E005)" },
        { id: 6, label: "Finn HR (E006)" },
      ]),
      null,
    );
  });
});
