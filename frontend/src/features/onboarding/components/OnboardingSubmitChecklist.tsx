"use client";

import { Check } from "lucide-react";
import {
  onboardingChecklistDoneClass,
  onboardingChecklistItemClass,
  onboardingChecklistMarkDoneClass,
  onboardingChecklistMarkPendingClass,
  onboardingReviewCardClass,
  onboardingReviewCardBodyClass,
  onboardingReviewCardHeaderClass,
  onboardingReviewCardTitleClass,
} from "@/features/employees/onboarding-admin-theme";
import type { OnboardingChecklistItem } from "../lib/onboarding-checklist";

interface Props {
  items: OnboardingChecklistItem[];
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={`${onboardingChecklistItemClass} ${done ? onboardingChecklistDoneClass : ""}`}
    >
      {done ? (
        <span className={onboardingChecklistMarkDoneClass} aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <span className={onboardingChecklistMarkPendingClass} aria-hidden />
      )}
      {label}
    </li>
  );
}

export default function OnboardingSubmitChecklist({ items }: Props) {
  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className={onboardingReviewCardClass}>
      <header className={onboardingReviewCardHeaderClass}>
        <div>
          <h3 className={onboardingReviewCardTitleClass}>
            Complete onboarding
          </h3>
          <p className="text-xs text-gray-600 mt-1 mb-0">
            {doneCount} of {items.length} requirements met
          </p>
        </div>
      </header>
      <div className={onboardingReviewCardBodyClass}>
        <ul className="space-y-3 m-0 p-0 list-none">
          {items.map((item) => (
            <ChecklistRow key={item.id} done={item.done} label={item.label} />
          ))}
        </ul>
      </div>
    </section>
  );
}
