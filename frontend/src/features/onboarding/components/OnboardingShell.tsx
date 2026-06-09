"use client";

import { AppLogo } from "@/components/app/AppLogo";
import { onboardingShellMaxWidthClass } from "../constants/onboarding-theme";
import OnboardingStepper from "./OnboardingStepper";

export default function OnboardingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <AppLogo width={100} />
      </header>
      <main className="px-4 py-8 md:px-8">
        <div className={`${onboardingShellMaxWidthClass} mx-auto`}>
          <OnboardingStepper />
          {children}
        </div>
      </main>
    </div>
  );
}
