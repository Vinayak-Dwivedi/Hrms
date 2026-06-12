import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CreateEmployeeFormValues,
  createEmployeeFormSchema,
  loginPasswordFieldSchema,
  PASSWORD_MIN_MESSAGE,
  phoneFieldSchema,
  personalEmailFieldSchema,
  sanitizePhoneInput,
  toApiPayload,
} from "./employee.schema";

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
  branchId: "1",
  reportingManagerId: "1",
  password: "",
  confirmPassword: "",
};

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
});
