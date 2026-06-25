"use client";

import { Check, ChevronDown } from "lucide-react";
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
  step?: number;
  title: string;
  description?: string;
  status?: "default" | "active" | "complete";
  collapsible?: boolean;
  defaultOpen?: boolean;
  collapsedSummary?: ReactNode;
  children: ReactNode;
}

const BADGE_CLASS: Record<NonNullable<Props["status"]>, string> = {
  default: "bg-slate-200 text-slate-700",
  active: "bg-[lab(36.9089%_35.0961_-85.6872)] text-white",
  complete: "bg-emerald-100 text-emerald-800",
};

const STATUS_RING: Record<NonNullable<Props["status"]>, string> = {
  default: "border-slate-200/80",
  active: "border-slate-300 ring-1 ring-slate-200",
  complete: "border-emerald-200",
};

export default function OnboardingReviewSection({
  step,
  title,
  description,
  status = "default",
  collapsible = false,
  defaultOpen = true,
  collapsedSummary,
  children,
}: Props) {
  const isActive = status === "active";
  const isComplete = status === "complete";
  const openByDefault = collapsible ? (isActive ? true : defaultOpen) : true;

  const headerContent = (
    <div className="flex items-start gap-3 min-w-0 flex-1">
      {step != null ? (
        <span
          className={`${onboardingReviewStepBadgeClass} ${BADGE_CLASS[status]}`}
        >
          {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
        </span>
      ) : isComplete ? (
        <span
          className={`${onboardingReviewStepBadgeClass} ${BADGE_CLASS.complete}`}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 className={onboardingReviewCardTitleClass}>{title}</h2>
        {description && (openByDefault || !collapsible) ? (
          <p className={onboardingReviewCardDescClass}>{description}</p>
        ) : null}
        {collapsible && !openByDefault && collapsedSummary ? (
          <div className="text-xs text-slate-600 mt-1">{collapsedSummary}</div>
        ) : null}
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <section
        className={`${onboardingReviewCardClass} ${STATUS_RING[status]}`}
      >
        <header className={onboardingReviewCardHeaderClass}>{headerContent}</header>
        <div className={onboardingReviewCardBodyClass}>{children}</div>
      </section>
    );
  }

  return (
    <details
      open={openByDefault}
      className={`group ${onboardingReviewCardClass} ${STATUS_RING[status]}`}
    >
      <summary
        className={`${onboardingReviewCardHeaderClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        {headerContent}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 mt-0.5" />
      </summary>
      <div className={onboardingReviewCardBodyClass}>{children}</div>
    </details>
  );
}
