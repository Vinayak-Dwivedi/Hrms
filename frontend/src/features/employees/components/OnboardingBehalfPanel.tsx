"use client";

import { useCallback, useEffect, useState } from "react";
import type { OnboardingProfileValues } from "@/features/onboarding/schemas/onboarding.schema";
import OnboardingDocumentUpload from "@/features/onboarding/components/OnboardingDocumentUpload";
import OnboardingProfileForm from "@/features/onboarding/components/OnboardingProfileForm";
import OnboardingReviewStep from "@/features/onboarding/components/OnboardingReviewStep";
import type { OnboardingDocumentType } from "@/features/onboarding/constants/documents";
import {
  computeOnboardingReadiness,
  deleteOnboardingDocumentOnBehalf,
  fetchEmployeeOnboardingProfile,
  fetchOnboardingDocument,
  submitOnboardingOnBehalf,
  updateEmployeeOnboardingProfileOnBehalf,
  uploadOnboardingDocumentOnBehalf,
} from "../api/hr-onboarding.client";
import { employeeErrorBannerClass } from "../employee-theme";
import { onboardingReviewCardClass } from "../onboarding-admin-theme";

type BehalfStep = "profile" | "documents" | "review";

interface Props {
  employeeId: number;
  onboardingStatus: string;
  submittedAt?: string | null;
  onUpdated?: () => void;
  layout?: "boxed" | "flat";
}

function resolveBehalfStep(
  profileComplete: boolean,
  pendingDocuments: string[],
): BehalfStep {
  if (!profileComplete) return "profile";
  if (pendingDocuments.length > 0) return "documents";
  return "review";
}

export default function OnboardingBehalfPanel({
  employeeId,
  onboardingStatus,
  submittedAt,
  onUpdated,
  layout = "boxed",
}: Props) {
  const [manualStep, setManualStep] = useState<BehalfStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [initialProfile, setInitialProfile] =
    useState<OnboardingProfileValues | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<string[]>([]);
  const [documents, setDocuments] = useState<
    Array<{
      id?: string;
      documentType: string;
      originalFilename?: string;
      status: "Pending" | "Uploaded" | "Verified" | "Rejected";
    }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchEmployeeOnboardingProfile(employeeId);
      const readiness = computeOnboardingReadiness(profile);
      setInitialProfile(readiness.formValues);
      setProfileComplete(readiness.profileComplete);
      setPendingDocuments(readiness.pendingDocuments);
      setDocuments(readiness.documents);
      return readiness;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (manualStep === "documents" && pendingDocuments.length === 0) {
      setManualStep("review");
    }
  }, [manualStep, pendingDocuments.length]);

  if (onboardingStatus === "COMPLETED" || submittedAt) {
    return null;
  }

  async function handleProfileSave(values: OnboardingProfileValues) {
    setSubmittingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const profile = await updateEmployeeOnboardingProfileOnBehalf(
        employeeId,
        values,
      );
      const readiness = computeOnboardingReadiness(profile);
      setInitialProfile(readiness.formValues);
      setProfileComplete(readiness.profileComplete);
      setPendingDocuments(readiness.pendingDocuments);
      setDocuments(readiness.documents);
      setSuccess("Profile saved on behalf of employee.");
      setManualStep(readiness.profileComplete ? "documents" : "profile");
      onUpdated?.();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSubmittingProfile(false);
    }
  }

  async function handleUpload(documentType: OnboardingDocumentType, file: File) {
    await uploadOnboardingDocumentOnBehalf(employeeId, documentType, file);
  }

  async function handleDelete(documentId: string) {
    await deleteOnboardingDocumentOnBehalf(employeeId, documentId);
  }

  async function handleSubmit() {
    setCompleting(true);
    setError(null);
    setSuccess(null);
    try {
      await submitOnboardingOnBehalf(employeeId);
      await load();
      setSuccess(
        "Submitted for HR review. Next: verify documents, approve bank details, then complete onboarding.",
      );
      onUpdated?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  const containerClass =
    layout === "flat"
      ? `${onboardingReviewCardClass} p-5 space-y-4`
      : "space-y-4 border border-slate-200 rounded-md bg-slate-50/40 p-4 mt-4";

  const step =
    manualStep ?? resolveBehalfStep(profileComplete, pendingDocuments);

  return (
    <div className={containerClass}>
      {layout === "flat" && (
        <header>
          <h2 className="text-base font-semibold text-gray-900 m-0">
            Complete employee data
          </h2>
          <p className="text-xs text-gray-600 mt-1 mb-0">
            Enter profile and documents on behalf of the employee before HR
            review.
          </p>
        </header>
      )}
      {error && (
        <div className={employeeErrorBannerClass}>{error}</div>
      )}
      {success && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 m-0">Loading onboarding data…</p>
      ) : (
        <>
          {step === "profile" && initialProfile && (
            <OnboardingProfileForm
              initialValues={initialProfile}
              onSubmit={handleProfileSave}
              submitting={submittingProfile}
            />
          )}

          {step === "documents" && (
            <OnboardingDocumentUpload
              documents={documents}
              onUploaded={() => {
                void load().then((readiness) => {
                  if (!readiness) return;
                  const noPendingDocuments = readiness.pendingDocuments.length === 0;
                  setManualStep(noPendingDocuments ? "review" : "documents");
                  if (noPendingDocuments) {
                    setSuccess(
                      "All required documents uploaded. You can now submit for HR review.",
                    );
                  }
                });
              }}
              onUpload={handleUpload}
              onDelete={(documentId) => handleDelete(documentId)}
            />
          )}

          {step === "review" && initialProfile && (
            <OnboardingReviewStep
              profile={initialProfile}
              documents={documents}
              completing={completing}
              pendingDocuments={pendingDocuments}
              submitButtonLabel="Submit for HR review"
              onComplete={() => void handleSubmit()}
              onEditProfile={() => setManualStep("profile")}
              onEditDocuments={() => setManualStep("documents")}
              fetchDocument={fetchOnboardingDocument}
            />
          )}
        </>
      )}
    </div>
  );
}
