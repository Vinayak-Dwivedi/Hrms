import type { OnboardingStatus } from "../api/onboarding.client";
import { isOnboardingDocumentReady } from "../constants/documents";

export type OnboardingChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export function buildOnboardingSubmitChecklist(
  status: OnboardingStatus,
): OnboardingChecklistItem[] {
  const docByType = new Map(
    status.documents.map((document) => [document.documentType, document]),
  );

  return [
    {
      id: "profile",
      label: "Personal profile information complete",
      done: status.profileComplete,
    },
    ...status.requiredDocuments.map((type) => ({
      id: type.toLowerCase().replace(/\s+/g, "-"),
      label: `${type} uploaded`,
      done: isOnboardingDocumentReady(docByType.get(type)),
    })),
    {
      id: "bank",
      label: "Primary bank account details provided",
      done: status.bankComplete,
    },
  ];
}

export function isOnboardingSubmitReady(items: OnboardingChecklistItem[]): boolean {
  return items.length > 0 && items.every((item) => item.done);
}
