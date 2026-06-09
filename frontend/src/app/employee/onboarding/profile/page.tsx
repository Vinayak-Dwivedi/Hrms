"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEmployeeProfile,
  fetchOnboardingStatus,
  profileToFormValues,
  submitOnboarding,
  updateOnboardingProfile,
  type OnboardingStatus,
} from "@/features/onboarding/api/onboarding.client";
import type { OnboardingProfileValues } from "@/features/onboarding/schemas/onboarding.schema";
import OnboardingDocumentUpload from "@/features/onboarding/components/OnboardingDocumentUpload";
import OnboardingProfileForm from "@/features/onboarding/components/OnboardingProfileForm";
import OnboardingReviewStep from "@/features/onboarding/components/OnboardingReviewStep";
import OnboardingSuccessAlert from "@/features/onboarding/components/OnboardingSuccessAlert";
import { onboardingBtnPrimaryClass, onboardingErrorAlertClass } from "@/features/onboarding/constants/onboarding-theme";
import { useOnboardingProgress } from "@/features/onboarding/context/onboarding-progress-context";
import { signOut } from "@/lib/hrms-client";

const ONBOARDING_SUBMIT_SUCCESS_MESSAGE =
  "Onboarding submitted successfully. HR will review your documents and approve your account.";
const CLOSE_AFTER_SUCCESS_MS = 3000;

type ProfileSubStep = "profile" | "documents" | "review";

function parseSubStep(raw: string | null): ProfileSubStep {
  if (raw === "documents" || raw === "review") return raw;
  return "profile";
}

function OnboardingProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setProgress } = useOnboardingProgress();

  const step = parseSubStep(searchParams.get("step"));

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [initialProfile, setInitialProfile] =
    useState<OnboardingProfileValues | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncProgress = useCallback(
    (data: OnboardingStatus, subStep: ProfileSubStep) => {
      setProgress({
        profileComplete: data.profileComplete,
        documentsReady: data.pendingDocuments.length === 0,
        profileSubStep: subStep,
      });
    },
    [setProgress],
  );

  const navigateToStep = useCallback(
    (next: ProfileSubStep) => {
      router.replace(`/employee/onboarding/profile?step=${next}`);
      setProgress({ profileSubStep: next });
    },
    [router, setProgress],
  );

  const loadStatus = useCallback(async () => {
    const [data, profile] = await Promise.all([
      fetchOnboardingStatus(),
      fetchEmployeeProfile(),
    ]);
    setStatus(data);
    setInitialProfile(profileToFormValues(profile));
    if (data.completed) {
      router.replace("/dashboard");
      return;
    }
    if (data.profileComplete) {
      setProfileSaved(true);
    }
    return data;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadStatus()
      .then((data) => {
        if (!cancelled && data) {
          syncProgress(data, step);
          if (data.profileComplete && step === "profile") {
            const requested = searchParams.get("step");
            if (!requested) {
              navigateToStep("documents");
            }
          }
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus]);

  useEffect(() => {
    if (status) {
      syncProgress(status, step);
    }
  }, [step, status, syncProgress]);

  useEffect(() => {
    if (!status || loading) return;

    if (step === "documents" && !status.profileComplete) {
      navigateToStep("profile");
      return;
    }
    if (step === "review") {
      if (!status.profileComplete) {
        navigateToStep("profile");
      } else if (status.pendingDocuments.length > 0) {
        navigateToStep("documents");
      }
    }
  }, [step, status, loading, navigateToStep]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  async function exitAfterOnboardingSubmit() {
    window.close();
    await signOut();
    router.replace("/login");
  }

  async function handleProfileSave(values: OnboardingProfileValues) {
    setSubmittingProfile(true);
    setError(null);
    try {
      const result = await updateOnboardingProfile(values);
      setProfileSaved(true);
      setSuccess("Profile saved successfully.");
      const data = await loadStatus();
      if (data) {
        syncProgress(data, "documents");
      }
      if (result.profileComplete) {
        navigateToStep("documents");
      }
    } finally {
      setSubmittingProfile(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    setError(null);
    setSuccess(null);
    try {
      await submitOnboarding();
      setOnboardingSubmitted(true);
      setSuccess(ONBOARDING_SUBMIT_SUCCESS_MESSAGE);
      closeTimerRef.current = setTimeout(() => {
        void exitAfterOnboardingSubmit();
      }, CLOSE_AFTER_SUCCESS_MS);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Could not complete onboarding.");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center text-sm text-gray-500 py-16">
        Loading onboarding…
      </div>
    );
  }

  if (onboardingSubmitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <OnboardingSuccessAlert message={ONBOARDING_SUBMIT_SUCCESS_MESSAGE} />
        <p className="text-sm text-gray-500 m-0">
          This page will close shortly. You can also close this tab now.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Complete Your Profile
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Fill in your details and upload required documents to finish onboarding.
      </p>

      {error && (
        <div className={`mb-4 ${onboardingErrorAlertClass}`} role="alert">
          {error}
        </div>
      )}
      {success && <OnboardingSuccessAlert message={success} />}

      {step === "profile" && initialProfile && (
        <OnboardingProfileForm
          key={JSON.stringify(initialProfile)}
          initialValues={initialProfile}
          onSubmit={handleProfileSave}
          submitting={submittingProfile}
        />
      )}

      {step === "documents" && status && (
        <div className="space-y-6">
          <OnboardingDocumentUpload
            documents={status.documents}
            onUploaded={() => {
              void loadStatus().then((data) => {
                if (data) syncProgress(data, "documents");
              });
              setSuccess("Document uploaded.");
            }}
          />

          {status.pendingDocuments.length > 0 && (
            <p className="text-sm text-amber-700 m-0">
              Remaining: {status.pendingDocuments.join(", ")}
            </p>
          )}

          <button
            type="button"
            disabled={status.pendingDocuments.length > 0}
            onClick={() => navigateToStep("review")}
            className={onboardingBtnPrimaryClass}
          >
            Continue to Review
          </button>
        </div>
      )}

      {step === "review" && status && initialProfile && (
        <OnboardingReviewStep
          profile={initialProfile}
          documents={status.documents}
          pendingDocuments={status.pendingDocuments}
          completing={completing}
          onComplete={() => void handleComplete()}
        />
      )}
    </div>
  );
}

export default function OnboardingProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-gray-500 py-16">
          Loading onboarding…
        </div>
      }
    >
      <OnboardingProfilePageInner />
    </Suspense>
  );
}
