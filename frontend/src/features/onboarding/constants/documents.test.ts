import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasRejectedOnboardingDocuments,
  isOnboardingDocumentReady,
  listPendingRequiredDocuments,
  listRequiredOnboardingDocuments,
} from "./documents";

const defaultAcademic = [
  { qualification: "Class 10" },
  { qualification: "Class 12" },
];

describe("onboarding document readiness", () => {
  it("requires class certificates when class 10 and 12 are in academic details", () => {
    const required = listRequiredOnboardingDocuments(defaultAcademic);
    assert.deepEqual(required, [
      "Aadhaar Card",
      "PAN Card",
      "Class 10 Certificate",
      "Class 12 Certificate",
    ]);
  });

  it("treats rejected required documents as pending", () => {
    const pending = listPendingRequiredDocuments(
      [
        {
          documentType: "PAN Card",
          status: "Rejected",
        },
        {
          documentType: "Aadhaar Card",
          status: "Uploaded",
        },
        {
          documentType: "Class 10 Certificate",
          status: "Uploaded",
        },
        {
          documentType: "Class 12 Certificate",
          status: "Uploaded",
        },
      ],
      defaultAcademic,
    );

    assert.deepEqual(pending, ["PAN Card"]);
  });

  it("marks missing and rejected documents as not ready", () => {
    assert.equal(isOnboardingDocumentReady(undefined), false);
    assert.equal(
      isOnboardingDocumentReady({
        documentType: "Class 10 Certificate",
        status: "Rejected",
      }),
      false,
    );
    assert.equal(
      isOnboardingDocumentReady({
        documentType: "Class 10 Certificate",
        status: "Uploaded",
      }),
      true,
    );
  });

  it("detects rejected documents in a list", () => {
    assert.equal(
      hasRejectedOnboardingDocuments([
        { documentType: "PAN Card", status: "Verified" },
      ]),
      false,
    );
    assert.equal(
      hasRejectedOnboardingDocuments([
        { documentType: "PAN Card", status: "Rejected" },
      ]),
      true,
    );
  });
});
