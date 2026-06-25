import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QUAL_CLASS_10, QUAL_CLASS_12 } from "../constants/academic";
import { MARITAL_STATUS_OPTIONS } from "../constants/personal";
import {
  collectOnboardingProfileErrors,
  onboardingProfileSchema,
  type OnboardingProfileValues,
} from "./onboarding.schema";
import { GRADE_FORMAT_MESSAGE } from "@/lib/academic-field-validation";

const validClass10Row = {
  qualification: QUAL_CLASS_10,
  institution: "Delhi Public School",
  boardUniversity: "CBSE",
  yearTo: 2018,
  gradeOrPercentage: "85",
};

const validClass12Row = {
  qualification: QUAL_CLASS_12,
  institution: "Delhi Public School",
  boardUniversity: "CBSE",
  yearTo: 2020,
  gradeOrPercentage: "88",
};

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
  academic: [validClass10Row, validClass12Row],
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
          ...validClass10Row,
          institution: "School 42",
        },
        validClass12Row,
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
          ...validClass10Row,
          boardUniversity: "CBSE 12",
        },
        validClass12Row,
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

  it("accepts valid numeric grade formats", () => {
    for (const grade of ["85", "9.5", "100", "10"]) {
      const values: OnboardingProfileValues = {
        ...baseProfile,
        academic: [
          { ...validClass10Row, gradeOrPercentage: grade },
          validClass12Row,
        ],
      };
      const result = onboardingProfileSchema.safeParse(values);
      assert.equal(result.success, true, `Expected grade "${grade}" to be valid`);
    }
  });

  it("rejects invalid grade formats", () => {
    for (const grade of ["A+", "85%", "abc", "0"]) {
      const values: OnboardingProfileValues = {
        ...baseProfile,
        academic: [
          { ...validClass10Row, gradeOrPercentage: grade },
          validClass12Row,
        ],
      };
      const result = onboardingProfileSchema.safeParse(values);
      assert.equal(result.success, false, `Expected grade "${grade}" to be invalid`);
      const errors = collectOnboardingProfileErrors(values);
      assert.equal(errors["academic.0.gradeOrPercentage"], GRADE_FORMAT_MESSAGE);
    }
  });

  it("accepts Class 10 and Class 12 with a 2-year gap", () => {
    const result = onboardingProfileSchema.safeParse(baseProfile);
    assert.equal(result.success, true);
  });

  it("accepts Class 12 passing year more than 2 years after Class 10", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      academic: [
        { ...validClass10Row, yearTo: 1953 },
        { ...validClass12Row, yearTo: 1968 },
      ],
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, true);
  });

  it("rejects Class 12 passing year before Class 10", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      academic: [
        { ...validClass10Row, yearTo: 2020 },
        { ...validClass12Row, yearTo: 2018 },
      ],
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, false);
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors["academic.1.yearTo"],
      "Class 12 passing year cannot be before Class 10.",
    );
  });

  it("rejects Class 12 passing year when gap is less than 2 years", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      academic: [validClass10Row, { ...validClass12Row, yearTo: 2019 }],
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, false);
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors["academic.1.yearTo"],
      "Class 12 passing year must be at least 2 years after Class 10.",
    );
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
          yearTo: 2024,
          gradeOrPercentage: "A+",
        },
      ],
    };
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(
      errors["academic.2.institution"],
      "School name must contain letters only.",
    );
    assert.equal(errors["academic.2.gradeOrPercentage"], GRADE_FORMAT_MESSAGE);
  });
});

describe("onboarding professional validation", () => {
  it("accepts fresher profile with no previous company", () => {
    const result = onboardingProfileSchema.safeParse(baseProfile);
    assert.equal(result.success, true);
  });

  it("accepts one complete previous company record", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      professional: [
        {
          companyName: "Acme Corp",
          designation: "Software Engineer",
          fromDate: "2020-01-01",
          toDate: "2023-06-30",
          isCurrent: false,
          responsibilities: "Backend development",
        },
      ],
    };
    const result = onboardingProfileSchema.safeParse(values);
    assert.equal(result.success, true);
  });

  it("requires previous company fields when a record is provided", () => {
    const values: OnboardingProfileValues = {
      ...baseProfile,
      professional: [
        {
          companyName: "",
          designation: "",
          fromDate: "",
          toDate: "",
          isCurrent: false,
          responsibilities: "",
        },
      ],
    };
    const errors = collectOnboardingProfileErrors(values);
    assert.equal(errors["professional.0.companyName"], "Company name is required.");
    assert.equal(errors["professional.0.designation"], "Designation is required.");
    assert.equal(errors["professional.0.fromDate"], "Use YYYY-MM-DD.");
    assert.equal(errors["professional.0.toDate"], "End date is required.");
  });
});
