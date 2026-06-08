"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { signOut } from "@/lib/hrms-client";

const ONBOARDING_SUBMIT_SUCCESS_MESSAGE =
  "Onboarding submitted successfully. HR will review your documents and approve your account.";
const CLOSE_AFTER_SUCCESS_MS = 3000;

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [initialProfile, setInitialProfile] =
    useState<OnboardingProfileValues | null>(null);
  const [step, setStep] = useState<"profile" | "documents">("profile");
  const [profileSaved, setProfileSaved] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setStep("documents");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadStatus()
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

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
      if (result.profileComplete) {
        setStep("documents");
      }
      await loadStatus();
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
      <div className="max-w-3xl mx-auto text-center text-sm text-gray-500 py-16">
        Loading onboarding…
      </div>
    );
  }

  if (onboardingSubmitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {ONBOARDING_SUBMIT_SUCCESS_MESSAGE}
        </div>
        <p className="text-sm text-gray-500 m-0">
          This page will close shortly. You can also close this tab now.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Complete Your Profile
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Fill in your details and upload required documents to finish onboarding.
      </p>

      <div className="flex gap-2 mb-8">
        <button
          type="button"
          onClick={() => setStep("profile")}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${
            step === "profile"
              ? "bg-pink-600 text-white border-pink-600"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          1. Profile
        </button>
        <button
          type="button"
          onClick={() => profileSaved && setStep("documents")}
          disabled={!profileSaved && !status?.profileComplete}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${
            step === "documents"
              ? "bg-pink-600 text-white border-pink-600"
              : "bg-white text-gray-700 border-gray-200"
          } ${!profileSaved && !status?.profileComplete ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          2. Documents
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

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
              void loadStatus();
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
            disabled={completing || status.pendingDocuments.length > 0}
            onClick={() => void handleComplete()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{
              background: completing ? "#f471a8" : "#e91e63",
              border: "none",
              cursor:
                completing || status.pendingDocuments.length > 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {completing ? "Submitting…" : "Complete Onboarding"}
          </button>
        </div>
      )}
    </div>
  );
}
