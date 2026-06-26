import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import type { MyProfile } from "@/lib/hrms-client";
import {
  editableToOnboardingPayload,
  profilePageToEditable,
  shouldPersistProfessionalProfile,
} from "./profile.client";

const emptyExtended: EmployeeProfile = {
  personal: {
    currentAddress: "123 Main St",
    permanentAddress: "123 Main St",
    emergencyContactName: "Jane",
    emergencyContactPhone: "9876543210",
    fatherName: null,
    motherName: null,
    bloodGroup: null,
    nationality: "Indian",
    maritalStatus: "Single",
    spouseName: null,
  },
  identity: {
    panNumber: null,
    aadhaarNumber: null,
    passportNumber: null,
    passportExpiry: null,
    uanNumber: null,
    esicNumber: null,
  },
  academic: [],
  professional: [
    {
      id: 7,
      companyName: "Acme Corp",
      designation: "Developer",
      fromDate: "2020-01-01",
      toDate: "2022-06-30",
      isCurrent: false,
      responsibilities: "Built APIs",
    },
  ],
  bank: [],
  documents: [],
};

const me: MyProfile = {
  id: 1,
  empId: "E001",
  firstName: "Test",
  middleName: null,
  lastName: "User",
  fullName: "Test User",
  initials: "TU",
  avatarUrl: null,
  email: "test@company.com",
  workEmail: "test@company.com",
  phone: "9876543210",
  personalEmail: "personal@example.com",
  personalEmailVerified: false,
  personalEmailVerifiedAt: null,
  phoneVerified: false,
  phoneVerifiedAt: null,
  gender: "Male",
  dob: "1990-01-01",
  designation: null,
  authRole: "employee",
  authRoleLabel: "Employee",
  userType: "employee",
  userTypeLabel: "Employee",
  department: null,
  grade: null,
  branch: null,
  employmentType: null,
  reportingManager: null,
  joiningDate: "2024-01-01",
  currentAddress: "123 Main St",
  permanentAddress: "123 Main St",
  emergencyContactName: "Jane",
  emergencyContactPhone: "9876543210",
};

describe("profilePageToEditable professional mapping", () => {
  it("maps professional row and fresher flag from extended profile", () => {
    const form = profilePageToEditable(me, emptyExtended);
    assert.equal(form.noPreviousEmployment, false);
    assert.equal(form.professional.length, 1);
    assert.equal(form.professional[0]?.companyName, "Acme Corp");
    assert.equal(form.professional[0]?.designation, "Developer");
  });

  it("round-trips professional through editableToOnboardingPayload", () => {
    const form = profilePageToEditable(me, emptyExtended);
    const payload = editableToOnboardingPayload(form, emptyExtended);
    assert.equal(payload.professional.length, 1);
    assert.equal(payload.professional[0]?.companyName, "Acme Corp");
    assert.equal(payload.professional[0]?.responsibilities, "Built APIs");
  });

  it("defaults to unchecked with an empty work row when no saved professional", () => {
    const form = profilePageToEditable(me, {
      ...emptyExtended,
      professional: [],
    });
    assert.equal(form.noPreviousEmployment, false);
    assert.equal(form.professional.length, 1);
    assert.equal(form.professional[0]?.companyName, "");
  });

  it("clears professional when fresher is selected", () => {
    const form = profilePageToEditable(me, emptyExtended);
    const fresher = { ...form, noPreviousEmployment: true, professional: [] };
    const payload = editableToOnboardingPayload(fresher, emptyExtended);
    assert.deepEqual(payload.professional, []);
  });

  it("detects work-only changes without triggering extended profile save", () => {
    const form = profilePageToEditable(me, emptyExtended);
    assert.equal(shouldPersistProfessionalProfile(form, emptyExtended), false);

    const updated = {
      ...form,
      noPreviousEmployment: false,
      professional: [
        {
          companyName: "New Co",
          designation: "Engineer",
          fromDate: "2019-01-01",
          toDate: "2021-12-31",
          isCurrent: false,
          responsibilities: "",
        },
      ],
    };
    assert.equal(
      shouldPersistProfessionalProfile(updated, emptyExtended),
      true,
    );
  });
});
