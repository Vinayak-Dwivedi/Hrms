"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  EmployeeProfile,
  OnboardingStatus,
} from "@/features/onboarding/api/onboarding.client";
import OnboardingBankStep from "@/features/onboarding/components/OnboardingBankStep";
import OnboardingDocumentUpload from "@/features/onboarding/components/OnboardingDocumentUpload";
import OnboardingProfileForm from "@/features/onboarding/components/OnboardingProfileForm";
import OnboardingReviewStep from "@/features/onboarding/components/OnboardingReviewStep";
import type { OnboardingDocumentType } from "@/features/onboarding/constants/documents";
import type { OnboardingProfileValues } from "@/features/onboarding/schemas/onboarding.schema";
import {
  computeOnboardingReadiness,
  deleteOnboardingDocumentOnBehalf,
  fetchEmployeeOnboardingProfile,
  fetchOnboardingDocument,
  submitOnboardingOnBehalf,
  updateEmployeeOnboardingProfileOnBehalf,
  updateOnboardingBank,
  uploadOnboardingDocumentOnBehalf,
} from "../api/hr-onboarding.client";
import { employeeErrorBannerClass } from "../employee-theme";

type BehalfStep = "profile" | "documents" | "bank" | "review";

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
  bankComplete: boolean,
): BehalfStep {
  if (!profileComplete) return "profile";
  if (pendingDocuments.length > 0) return "documents";
  if (!bankComplete) return "bank";
  return "review";
}

function toReviewStatus(
  profile: EmployeeProfile,
  readiness: ReturnType<typeof computeOnboardingReadiness>,
): OnboardingStatus {
  return {
    completed: profile.onboardingStatus === "COMPLETED",
    completedAt: profile.completedAt ?? null,
    profileComplete: readiness.profileComplete,
    bankComplete: readiness.bankComplete,
    bank: profile.bank,
    academic: profile.academic,
    requiredDocuments: readiness.requiredDocuments,
    pendingDocuments: readiness.pendingDocuments,
    documents: readiness.documents,
    onboardingStatus: profile.onboardingStatus,
  };
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
  const [bankComplete, setBankComplete] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<string[]>([]);
  const [bank, setBank] = useState<EmployeeProfile["bank"]>([]);
  const [reviewStatus, setReviewStatus] = useState<OnboardingStatus | null>(
    null,
  );
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
      setBankComplete(readiness.bankComplete);
      setPendingDocuments(readiness.pendingDocuments);
      setDocuments(readiness.documents);
      setBank(profile.bank);
      setReviewStatus(toReviewStatus(profile, readiness));
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
      setManualStep("bank");
    }
  }, [manualStep, pendingDocuments.length]);

  useEffect(() => {
    if (manualStep === "bank" && bankComplete) {
      setManualStep("review");
    }
  }, [manualStep, bankComplete]);

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
      setBankComplete(readiness.bankComplete);
      setPendingDocuments(readiness.pendingDocuments);
      setDocuments(readiness.documents);
      setBank(profile.bank);
      setReviewStatus(toReviewStatus(profile, readiness));
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
      ? "space-y-4"
      : "space-y-4 border border-slate-200 rounded-md bg-slate-50/40 p-4 mt-4";

  const step =
    manualStep ??
    resolveBehalfStep(profileComplete, pendingDocuments, bankComplete);

  return (
    <div className={containerClass}>
      {layout === "flat" && (
        <header>
          <h2 className="text-base font-semibold text-gray-900 m-0">
            Complete employee data
          </h2>
          <p className="text-xs text-gray-600 mt-1 mb-0">
            Enter profile, documents, and bank details on behalf of the employee
            before HR review.
          </p>
        </header>
      )}
      {error && <div className={employeeErrorBannerClass}>{error}</div>}
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
              sectionsLayout={layout === "flat" ? "grid" : "stack"}
              formOptionsSource="hr"
            />
          )}

          {step === "documents" && (
            <OnboardingDocumentUpload
              documents={documents}
              academic={reviewStatus?.academic ?? []}
              onUploaded={() => {
                void load().then((readiness) => {
                  if (!readiness) return;
                  const noPendingDocuments = readiness.pendingDocuments.length === 0;
                  setManualStep(noPendingDocuments ? "bank" : "documents");
                  if (noPendingDocuments) {
                    setSuccess(
                      "All required documents uploaded. Continue with bank details.",
                    );
                  }
                });
              }}
              onUpload={handleUpload}
              onDelete={(documentId) => handleDelete(documentId)}
            />
          )}

          {step === "bank" && (
            <OnboardingBankStep
              bank={bank}
              onSubmitBank={(values) => updateOnboardingBank(employeeId, values)}
              onSaved={async () => {
                await load();
                setManualStep("review");
                setSuccess("Bank details saved on behalf of employee.");
              }}
            />
          )}

          {step === "review" && initialProfile && reviewStatus && (
            <OnboardingReviewStep
              profile={initialProfile}
              bank={bank}
              status={reviewStatus}
              completing={completing}
              submitButtonLabel="Submit for HR review"
              onComplete={() => void handleSubmit()}
              onEditProfile={() => setManualStep("profile")}
              onEditDocuments={() => setManualStep("documents")}
              onEditBank={() => setManualStep("bank")}
              fetchDocument={fetchOnboardingDocument}
            />
          )}
        </>
      )}
    </div>
  );
}
