"use client";

import type { ReactNode } from "react";
import {
  onboardingReviewCardBodyClass,
  onboardingReviewCardClass,
  onboardingReviewCardDescClass,
  onboardingReviewCardHeaderClass,
  onboardingReviewCardTitleClass,
  onboardingReviewStepBadgeClass,
} from "../onboarding-admin-theme";

interface Props {
  step: number;
  title: string;
  description?: string;
  status?: "default" | "active" | "complete";
  children: ReactNode;
}

const BADGE_CLASS: Record<NonNullable<Props["status"]>, string> = {
  default: "bg-slate-200 text-slate-700",
  active: "bg-[lab(36.9089%_35.0961_-85.6872)] text-white",
  complete: "bg-emerald-100 text-emerald-800",
};

export default function OnboardingReviewSection({
  step,
  title,
  description,
  status = "default",
  children,
}: Props) {
  return (
    <section className={onboardingReviewCardClass}>
      <header className={onboardingReviewCardHeaderClass}>
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`${onboardingReviewStepBadgeClass} ${BADGE_CLASS[status]}`}
          >
            {step}
          </span>
          <div className="min-w-0">
            <h2 className={onboardingReviewCardTitleClass}>{title}</h2>
            {description ? (
              <p className={onboardingReviewCardDescClass}>{description}</p>
            ) : null}
          </div>
        </div>
      </header>
      <div className={onboardingReviewCardBodyClass}>{children}</div>
    </section>
  );
}
