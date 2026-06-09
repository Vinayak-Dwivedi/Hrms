"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { validateOnboardingToken } from "@/features/onboarding/api/onboarding.client";
import OnboardingErrorState from "@/features/onboarding/components/OnboardingErrorState";
import OnboardingLoginForm from "@/features/onboarding/components/OnboardingLoginForm";

type PageState =
  | { kind: "loading" }
  | { kind: "valid"; workEmail: string; expiresAt: string | null }
  | { kind: "error"; title: string; message: string };

function OnboardingPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({
        kind: "error",
        title: "Invalid Link",
        message: "This onboarding link is invalid. Please contact HR.",
      });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading" });

    validateOnboardingToken(token)
      .then((result) => {
        if (cancelled) return;
        if (!result.workEmail) {
          setState({
            kind: "error",
            title: "Invalid Link",
            message: "This onboarding link is invalid. Please contact HR.",
          });
          return;
        }
        setState({
          kind: "valid",
          workEmail: result.workEmail,
          expiresAt: result.expiresAt,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { code?: string; message?: string };
        const code = err.code ?? "";
        let title = "Unable to Continue";
        let message =
          err.message ?? "This onboarding link is invalid. Please contact HR.";

        if (code === "ONBOARDING_EXPIRED") title = "Link Expired";
        else if (code === "ONBOARDING_USED") title = "Link Already Used";
        else if (code === "ONBOARDING_INACTIVE") title = "Account Inactive";
        else if (code === "ONBOARDING_INVALID" || code === "MISSING_TOKEN") {
          title = "Invalid Link";
        } else if (
          !code &&
          /failed to fetch|network|load failed/i.test(message)
        ) {
          title = "Server Unreachable";
          message =
            "Cannot reach the HRMS API. Ensure hrms-api is running and API_PROXY_TARGET in frontend/.env.local points to it (e.g. http://localhost:4000).";
        }

        setState({
          kind: "error",
          title,
          message,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === "loading") {
    return (
      <div className="max-w-lg mx-auto text-center text-sm text-gray-500 py-16">
        Validating your invitation…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <OnboardingErrorState title={state.title} message={state.message} />
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome — Sign In
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Use the temporary password from your invitation email to continue.
      </p>
      <OnboardingLoginForm
        token={token}
        workEmail={state.workEmail}
        expiresAt={state.expiresAt}
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto text-center text-sm text-gray-500 py-16">
          Loading…
        </div>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}
