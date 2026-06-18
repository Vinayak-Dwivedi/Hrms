import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CreateEmployeeFormValues,
  createEmployeeFormSchema,
  detailToFormValues,
  JOINING_DATE_MAX_FUTURE_DAYS,
  JOINING_DATE_MAX_FUTURE_MESSAGE,
  joiningDateFieldSchema,
  loginPasswordFieldSchema,
  PASSWORD_MIN_MESSAGE,
  phoneFieldSchema,
  personalEmailFieldSchema,
  sanitizePhoneInput,
  toApiPayload,
  toUpdateApiPayload,
  updateEmployeeFormSchema,
} from "./employee.schema";
import type { EmployeeDetail } from "../api/employees.client";

const baseValues: CreateEmployeeFormValues = {
  empId: "IASPL00099",
  firstName: "Test",
  middleName: "",
  lastName: "User",
  personalEmail: "personal@example.com",
  workEmail: "work@example.com",
  phone: "9876543210",
  dob: "1990-01-01",
  gender: "Male",
  joiningDate: "2024-01-01",
  roleId: "1",
  orgHierarchyDepartmentId: "1",
  orgHierarchySubDepartmentId: "1",
  orgHierarchyDesignationId: "1",
  locationId: "1",
  reportingManagerId: "1",
  password: "",
  confirmPassword: "",
};

function toDateString(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

describe("joining date validation", () => {
  it("rejects joining dates more than 60 days in the future", () => {
    const tooFar = toDateString(addDays(new Date(), JOINING_DATE_MAX_FUTURE_DAYS + 1));
    const result = joiningDateFieldSchema.safeParse(tooFar);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) => issue.message === JOINING_DATE_MAX_FUTURE_MESSAGE,
        ),
      );
    }
  });

  it("accepts today, past dates, and dates within 60 days", () => {
    const today = toDateString(new Date());
    const past = toDateString(addDays(new Date(), -30));
    const withinWindow = toDateString(addDays(new Date(), 30));

    assert.equal(joiningDateFieldSchema.safeParse(today).success, true);
    assert.equal(joiningDateFieldSchema.safeParse(past).success, true);
    assert.equal(joiningDateFieldSchema.safeParse(withinWindow).success, true);
  });

  it("accepts exactly 60 days from today", () => {
    const onMax = toDateString(addDays(new Date(), JOINING_DATE_MAX_FUTURE_DAYS));
    assert.equal(joiningDateFieldSchema.safeParse(onMax).success, true);
  });

  it("rejects invalid joining date format and invalid calendar dates", () => {
    assert.equal(joiningDateFieldSchema.safeParse("").success, false);
    assert.equal(joiningDateFieldSchema.safeParse("01-01-2024").success, false);
    assert.equal(joiningDateFieldSchema.safeParse("2024-02-30").success, false);
  });

  it("validates joining date through the full create form schema", () => {
    const tooFar = toDateString(addDays(new Date(), JOINING_DATE_MAX_FUTURE_DAYS + 5));
    const result = createEmployeeFormSchema({ validRoleIds: [1] }).safeParse({
      ...baseValues,
      joiningDate: tooFar,
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) => issue.message === JOINING_DATE_MAX_FUTURE_MESSAGE,
        ),
      );
    }
  });
});

describe("create employee validation", () => {
  it("sanitizes phone input to digits only", () => {
    assert.equal(sanitizePhoneInput("+91 98765-43210"), "9876543210");
    assert.equal(sanitizePhoneInput("12abc345"), "12345");
  });

  it("rejects phone numbers that are not exactly 10 digits", () => {
    assert.equal(phoneFieldSchema.safeParse("12345").success, false);
    assert.equal(phoneFieldSchema.safeParse("12345678901").success, false);
    assert.equal(phoneFieldSchema.safeParse("9876543210").success, true);
  });

  it("rejects invalid personal email addresses", () => {
    assert.equal(personalEmailFieldSchema.safeParse("").success, false);
    assert.equal(personalEmailFieldSchema.safeParse("not-an-email").success, false);
    assert.equal(
      personalEmailFieldSchema.safeParse("user@example.com").success,
      true,
    );
  });

  it("rejects login passwords shorter than 8 characters", () => {
    const passwordResult = loginPasswordFieldSchema.safeParse("123456");
    assert.equal(passwordResult.success, false);
    if (!passwordResult.success) {
      assert.equal(passwordResult.error.issues[0]?.message, PASSWORD_MIN_MESSAGE);
    }

    const formResult = createEmployeeFormSchema({ validRoleIds: [1] }).safeParse({
      ...baseValues,
      password: "123456",
      confirmPassword: "123456",
    });
    assert.equal(formResult.success, false);
    if (!formResult.success) {
      assert.ok(
        formResult.error.issues.some((issue) => issue.message === PASSWORD_MIN_MESSAGE),
      );
    }
  });

  it("requires employee to be at least 18 years old", () => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 10);
    const y = cutoff.getFullYear();
    const m = String(cutoff.getMonth() + 1).padStart(2, "0");
    const d = String(cutoff.getDate()).padStart(2, "0");

    const result = createEmployeeFormSchema({ validRoleIds: [1] }).safeParse({
      ...baseValues,
      dob: `${y}-${m}-${d}`,
    });
    assert.equal(result.success, false);
  });
});

describe("toApiPayload", () => {
  it("does not throw when building the create payload", () => {
    assert.doesNotThrow(() => toApiPayload(baseValues, 42));
  });

  it("omits password when the field is blank", () => {
    const payload = toApiPayload(baseValues, 42);
    assert.equal("password" in payload, false);
    assert.equal(payload.orgHierarchyStructureId, 42);
    assert.equal(payload.locationId, 1);
  });

  it("includes password when provided", () => {
    const payload = toApiPayload(
      {
        ...baseValues,
        password: "Welcome@123",
        confirmPassword: "Welcome@123",
      },
      42,
    );
    assert.equal(payload.password, "Welcome@123");
  });

  it("allows an empty reporting manager and omits it from the payload", () => {
    const result = createEmployeeFormSchema({ validRoleIds: [1] }).safeParse({
      ...baseValues,
      reportingManagerId: "",
    });
    assert.equal(result.success, true);

    const payload = toApiPayload(
      { ...baseValues, reportingManagerId: "" },
      42,
    );
    assert.equal("reportingManagerId" in payload, false);
  });
});

const baseUpdateValues = {
  empId: "IASPL00099",
  firstName: "Test",
  middleName: "",
  lastName: "User",
  personalEmail: "personal@example.com",
  workEmail: "work@example.com",
  phone: "9876543210",
  dob: "1990-01-01",
  gender: "Male" as const,
  joiningDate: "2024-01-01",
  employeeStatus: "Active" as const,
  roleId: "1",
  orgHierarchyDepartmentId: "1",
  orgHierarchySubDepartmentId: "2",
  orgHierarchyDesignationId: "3",
  locationId: "1",
  reportingManagerId: "1",
  maritalStatus: "" as const,
  spouseName: "",
  password: "",
  confirmPassword: "",
};

describe("update employee validation", () => {
  it("requires org hierarchy department, sub-department, and designation", () => {
    const result = updateEmployeeFormSchema.safeParse({
      ...baseUpdateValues,
      orgHierarchyDepartmentId: "",
    });
    assert.equal(result.success, false);
  });
});

describe("toUpdateApiPayload", () => {
  it("includes orgHierarchyStructureId", () => {
    const payload = toUpdateApiPayload(baseUpdateValues, 42);
    assert.equal(payload.orgHierarchyStructureId, 42);
    assert.equal("departmentId" in payload, false);
    assert.equal("designationId" in payload, false);
    assert.equal("gradeId" in payload, false);
  });

  it("omits password when the field is blank", () => {
    const payload = toUpdateApiPayload(baseUpdateValues, 42);
    assert.equal("password" in payload, false);
  });

  it("includes roleId when provided", () => {
    const payload = toUpdateApiPayload(baseUpdateValues, 42);
    assert.equal(payload.roleId, 1);
  });

  it("maps extended marital status values", () => {
    const payload = toUpdateApiPayload(
      { ...baseUpdateValues, maritalStatus: "Divorced" },
      42,
    );
    assert.equal(payload.maritalStatus, "Divorced");
    assert.equal(payload.spouseName, null);
  });
});

describe("detailToFormValues", () => {
  it("prefills org hierarchy fields when provided", () => {
    const employee = {
      id: 1,
      empId: "IASPL00099",
      firstName: "Test",
      middleName: null,
      lastName: "User",
      workEmail: "work@example.com",
      phone: "9876543210",
      departmentId: null,
      designationId: null,
      employeeStatus: "Active",
      joiningDate: "2024-01-01",
      personalEmail: "personal@example.com",
      dob: "1990-01-01",
      gender: "Male",
      nationality: "Indian",
      maritalStatus: null,
      spouseName: null,
      gradeId: null,
      branchId: 1,
      locationId: 1,
      reportingManagerId: 1,
      orgHierarchyStructureId: 99,
      roleId: 2,
      roleName: "HR",
    } satisfies EmployeeDetail;

    const values = detailToFormValues(employee, {
      orgHierarchyDepartmentId: "10",
      orgHierarchySubDepartmentId: "20",
      orgHierarchyDesignationId: "30",
    });

    assert.equal(values.orgHierarchyDepartmentId, "10");
    assert.equal(values.orgHierarchySubDepartmentId, "20");
    assert.equal(values.orgHierarchyDesignationId, "30");
    assert.equal(values.roleId, "2");
  });
});
