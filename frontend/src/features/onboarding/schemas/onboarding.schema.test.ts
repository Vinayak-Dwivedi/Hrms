import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QUAL_CLASS_10 } from "../constants/academic";
import { MARITAL_STATUS_OPTIONS } from "../constants/personal";
import {
  collectOnboardingProfileErrors,
  onboardingProfileSchema,
  type OnboardingProfileValues,
} from "./onboarding.schema";

const baseProfile: OnboardingProfileValues = {
  currentAddress: "123 Main Street",
  permanentAddress: "123 Main Street",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "9876543210",
  maritalStatus: "Single",
  spouseName: "",
  fatherName: "",
  motherName: "",
  bloodGroup: "",
  nationality: "Indian",
  panNo: "ABCPD1234E",
  aadhaarNo: "123456789012",
  uanNo: "",
  esicNo: "",
  academic: [
    {
      qualification: QUAL_CLASS_10,
      institution: "Delhi Public School",
      boardUniversity: "CBSE",
      gradeOrPercentage: "85%",
    },
  ],
  professional: [],
};

describe("onboarding marital status", () => {
  for (const status of MARITAL_STATUS_OPTIONS) {
    it(`accepts marital status ${status}`, () => {
      const values: OnboardingProfileValues = {
        ...baseProfile,
        maritalStatus: status,
        spouseName: status === "Married" ? "Alex Doe" : "",
      };
      const result = onboardingProfileSchema.safeParse(values);
      assert.equal(result.success, true, `Expected ${status} to be valid`);
    });
  }

  it("requires spouse name when marital status is Married", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      maritalStatus: "Married",
      spouseName: "",
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, false);
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors.spouseName,
      "Spouse name is required when marital status is Married.",
    );
  });
});

describe("onboarding academic validation", () => {
  it("accepts alphabetic institution and board values", () => {
    const result = onboardingProfileSchema.safeParse(baseProfile);
    assert.equal(result.success, true);
  });

  it("rejects institution values with digits or symbols", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      academic: [
        {
          ...baseProfile.academic[0],
          institution: "School 42",
        },
      ],
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, false);
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors["academic.0.institution"],
      "School name must contain letters only.",
    );
  });

  it("rejects board values with digits", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      academic: [
        {
          ...baseProfile.academic[0],
          boardUniversity: "CBSE 12",
        },
      ],
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, false);
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors["academic.0.boardUniversity"],
      "Board / University must contain letters only.",
    );
  });

  it("accepts valid grade formats", () => {
    for (const grade of ["85%", "A Grade", "Distinction", "9 CGPA"]) {
      const values: OnboardingProfileValues = {
        ...baseProfile,
        academic: [
          {
            ...baseProfile.academic[0],
            gradeOrPercentage: grade,
          },
        ],
      };
      const result = onboardingProfileSchema.safeParse(values);
      assert.equal(result.success, true, `Expected grade "${grade}" to be valid`);
    }
  });

  it("rejects invalid grade formats", () => {
    for (const grade of ["A+", "9.2 CGPA", "80%%"]) {
      const values: OnboardingProfileValues = {
        ...baseProfile,
        academic: [
          {
            ...baseProfile.academic[0],
            gradeOrPercentage: grade,
          },
        ],
      };
      const result = onboardingProfileSchema.safeParse(values);
      assert.equal(result.success, false, `Expected grade "${grade}" to be invalid`);
      const errors = collectOnboardingProfileErrors(values);
      assert.equal(
        errors["academic.0.gradeOrPercentage"],
        "Grade / % may contain letters, numbers, spaces, and at most one % sign.",
      );
    }
  });

  it("applies the same validation to newly added qualification rows", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      academic: [
        ...baseProfile.academic,
        {
          qualification: "Graduation",
          institution: "College@1",
          fieldOfStudy: "Commerce",
          gradeOrPercentage: "A+",
        },
      ],
    };
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors["academic.1.institution"],
      "School name must contain letters only.",
    );
    assert.equal(
      errors["academic.1.gradeOrPercentage"],
      "Grade / % may contain letters, numbers, spaces, and at most one % sign.",
    );
  });
});
