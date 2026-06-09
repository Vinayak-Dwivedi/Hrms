import OnboardingShell from "@/features/onboarding/components/OnboardingShell";
import { OnboardingProgressProvider } from "@/features/onboarding/context/onboarding-progress-context";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProgressProvider>
      <OnboardingShell>{children}</OnboardingShell>
    </OnboardingProgressProvider>
  );
}
