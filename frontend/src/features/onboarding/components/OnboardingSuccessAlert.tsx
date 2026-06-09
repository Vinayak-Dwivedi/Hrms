"use client";

import { onboardingSuccessAlertClass } from "../constants/onboarding-theme";

interface Props {
  message: string;
  className?: string;
}

export default function OnboardingSuccessAlert({ message, className = "" }: Props) {
  return (
    <div
      className={`${onboardingSuccessAlertClass} mb-4 ${className}`.trim()}
      role="status"
    >
      {message}
    </div>
  );
}
