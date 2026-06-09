"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { OnboardingWizardStep } from "../context/onboarding-progress-context";
import { useOnboardingProgress } from "../context/onboarding-progress-context";

const STEPS: { id: OnboardingWizardStep; label: string }[] = [
  { id: "sign-in", label: "Sign In" },
  { id: "profile", label: "Profile" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
];

function stepIndex(id: OnboardingWizardStep) {
  return STEPS.findIndex((s) => s.id === id);
}

function resolveActiveStep(
  pathname: string,
  profileSubStep: "profile" | "documents" | "review",
): OnboardingWizardStep {
  if (pathname.startsWith("/employee/onboarding/profile")) {
    if (profileSubStep === "documents") return "documents";
    if (profileSubStep === "review") return "review";
    return "profile";
  }
  return "sign-in";
}

function canNavigateTo(
  step: OnboardingWizardStep,
  profileComplete: boolean,
  documentsReady: boolean,
): boolean {
  switch (step) {
    case "sign-in":
      return false;
    case "profile":
      return true;
    case "documents":
      return profileComplete;
    case "review":
      return profileComplete && documentsReady;
    default:
      return false;
  }
}

export default function OnboardingStepper() {
  const router = useRouter();
  const pathname = usePathname();
  const { profileComplete, documentsReady, profileSubStep } =
    useOnboardingProgress();

  const activeStep = resolveActiveStep(pathname, profileSubStep);
  const activeIndex = stepIndex(activeStep);
  const onProfileRoute = pathname.startsWith("/employee/onboarding/profile");

  function isCompleted(index: number): boolean {
    return index < activeIndex;
  }

  function handleStepClick(step: OnboardingWizardStep) {
    if (!onProfileRoute) return;
    if (!canNavigateTo(step, profileComplete, documentsReady)) return;

    const subStep =
      step === "profile"
        ? "profile"
        : step === "documents"
          ? "documents"
          : step === "review"
            ? "review"
            : null;

    if (!subStep) return;
    router.replace(`/employee/onboarding/profile?step=${subStep}`);
  }

  return (
    <nav aria-label="Onboarding progress" className="w-full mb-8">
      <ol className="flex w-full items-start">
        {STEPS.map((step, index) => {
          const isActive = step.id === activeStep;
          const completed = isCompleted(index);
          const clickable =
            onProfileRoute &&
            step.id !== "sign-in" &&
            canNavigateTo(step.id, profileComplete, documentsReady);
          const isLast = index === STEPS.length - 1;

          const circleClass = isActive
            ? "bg-[#e91e63] text-white border-[#e91e63]"
            : completed
              ? "bg-[#e91e63] text-white border-[#e91e63]"
              : "bg-white text-gray-500 border-gray-300";

          const labelClass = isActive
            ? "text-[#e91e63] font-semibold"
            : completed
              ? "text-gray-700 font-medium"
              : "text-gray-400";

          return (
            <li key={step.id} className="flex flex-1 items-start min-w-0">
              <div className="flex flex-col items-center w-full min-w-0">
                <div className="flex items-center w-full">
                  {index > 0 ? (
                    <div
                      className={`h-0.5 flex-1 ${index <= activeIndex ? "bg-[#e91e63]" : "bg-gray-200"}`}
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    disabled={!clickable}
                    aria-current={isActive ? "step" : undefined}
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${circleClass} ${
                      clickable
                        ? "cursor-pointer hover:opacity-90"
                        : "cursor-default"
                    } ${!clickable && !isActive && !completed ? "opacity-60" : ""}`}
                  >
                    {completed && !isActive ? (
                      <Check size={16} strokeWidth={3} aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </button>
                  {!isLast ? (
                    <div
                      className={`h-0.5 flex-1 ${index < activeIndex ? "bg-[#e91e63]" : "bg-gray-200"}`}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <span
                  className={`mt-2.5 text-sm text-center leading-tight px-2 ${labelClass}`}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
