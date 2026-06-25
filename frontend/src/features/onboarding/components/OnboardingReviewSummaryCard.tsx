"use client";

import type { ReactNode } from "react";
import {
  onboardingReviewCardClass,
  onboardingReviewCardBodyClass,
  onboardingReviewCardHeaderClass,
  onboardingReviewCardTitleClass,
  onboardingReviewStepBadgeClass,
} from "@/features/employees/onboarding-admin-theme";
import { onboardingBtnOutlineClass } from "../constants/onboarding-theme";

interface Props {
  number: number;
  title: string;
  statusLabel: string;
  statusTone?: "complete" | "pending" | "warning";
  onEdit?: () => void;
  editLabel?: string;
  children: ReactNode;
}

const STATUS_TONE_CLASS = {
  complete: "bg-emerald-50 text-emerald-800 border-emerald-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
} as const;

export default function OnboardingReviewSummaryCard({
  number,
  title,
  statusLabel,
  statusTone = "complete",
  onEdit,
  editLabel = "Edit",
  children,
}: Props) {
  return (
    <section className={onboardingReviewCardClass}>
      <header className={onboardingReviewCardHeaderClass}>
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`${onboardingReviewStepBadgeClass} bg-[lab(36.9089%_35.0961_-85.6872)] text-white`}
            aria-hidden
          >
            {number}
          </span>
          <div className="min-w-0">
            <h3 className={onboardingReviewCardTitleClass}>{title}</h3>
            <span
              className={`inline-flex mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_TONE_CLASS[statusTone]}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        {onEdit ? (
          <button type="button" onClick={onEdit} className={onboardingBtnOutlineClass}>
            {editLabel}
          </button>
        ) : null}
      </header>
      <div className={onboardingReviewCardBodyClass}>{children}</div>
    </section>
  );
}
