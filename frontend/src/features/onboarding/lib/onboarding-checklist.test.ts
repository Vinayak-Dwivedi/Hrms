import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OnboardingStatus } from "../api/onboarding.client";
import {
  buildOnboardingSubmitChecklist,
  isOnboardingSubmitReady,
} from "./onboarding-checklist";

const defaultAcademic = [
  {
    id: 1,
    qualification: "Class 10",
    institution: "School",
    boardUniversity: "CBSE",
    fieldOfStudy: null,
    yearFrom: null,
    yearTo: 2018,
    gradeOrPercentage: "90%",
  },
  {
    id: 2,
    qualification: "Class 12",
    institution: "School",
    boardUniversity: "CBSE",
    fieldOfStudy: null,
    yearFrom: null,
    yearTo: 2020,
    gradeOrPercentage: "88%",
  },
];

const baseStatus: OnboardingStatus = {
  completed: false,
  completedAt: null,
  profileComplete: true,
  bankComplete: true,
  bank: [],
  academic: defaultAcademic,
  requiredDocuments: [
    "Aadhaar Card",
    "PAN Card",
    "Class 10 Certificate",
    "Class 12 Certificate",
  ],
  pendingDocuments: [],
  documents: [
    { id: "1", documentType: "PAN Card", status: "Uploaded", createdAt: "" },
    {
      id: "2",
      documentType: "Aadhaar Card",
      status: "Uploaded",
      createdAt: "",
    },
    {
      id: "3",
      documentType: "Class 10 Certificate",
      status: "Uploaded",
      createdAt: "",
    },
    {
      id: "4",
      documentType: "Class 12 Certificate",
      status: "Uploaded",
      createdAt: "",
    },
  ],
};

describe("onboarding-checklist", () => {
  it("builds checklist items for profile, required docs, and bank", () => {
    const items = buildOnboardingSubmitChecklist(baseStatus);
    assert.equal(items.length, 6);
    assert.equal(isOnboardingSubmitReady(items), true);
  });

  it("flags incomplete bank", () => {
    const items = buildOnboardingSubmitChecklist({
      ...baseStatus,
      bankComplete: false,
    });
    assert.equal(isOnboardingSubmitReady(items), false);
    assert.equal(items.find((i) => i.id === "bank")?.done, false);
  });

  it("flags missing required document", () => {
    const items = buildOnboardingSubmitChecklist({
      ...baseStatus,
      pendingDocuments: ["Class 12 Certificate"],
      documents: baseStatus.documents.filter(
        (d) => d.documentType !== "Class 12 Certificate",
      ),
    });
    assert.equal(isOnboardingSubmitReady(items), false);
  });
});
