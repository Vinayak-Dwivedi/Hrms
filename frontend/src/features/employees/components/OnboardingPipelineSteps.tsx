"use client";

import { Check } from "lucide-react";
import {
  ONBOARDING_BANK_ACCESS_PERMISSIONS,
  ONBOARDING_PERMISSIONS,
} from "@/features/onboarding/constants/permissions";
import type { OnboardingPipelineStep } from "../api/hr-onboarding.client";

interface Props {
  steps: OnboardingPipelineStep[];
  hasPermission: (code: string) => boolean;
  hasAnyPermission?: (codes: string[]) => boolean;
  layout?: "vertical" | "horizontal";
}

function stepAllowed(
  step: OnboardingPipelineStep,
  hasPermission: (code: string) => boolean,
  hasAnyPermission?: (codes: string[]) => boolean,
): boolean {
  if (
    step.permission === ONBOARDING_PERMISSIONS.MANAGE_BANK &&
    hasAnyPermission
  ) {
    return hasAnyPermission([...ONBOARDING_BANK_ACCESS_PERMISSIONS]);
  }
  return hasPermission(step.permission);
}

export default function OnboardingPipelineSteps({
  steps,
  hasPermission,
  hasAnyPermission,
  layout = "vertical",
}: Props) {
  const isHorizontal = layout === "horizontal";
  const activeIndex = steps.findIndex((s) => s.status === "active");
  const rawProgress =
    steps.length <= 1
      ? 0
      : Math.round(
          ((steps.filter((s) => s.status === "done").length +
            (activeIndex >= 0 ? 0.5 : 0)) /
            (steps.length - 1)) *
            100,
        );
  const progress = Math.max(0, Math.min(rawProgress, 100));

  if (isHorizontal) {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 m-0">
            Onboarding progress
          </p>
          <p className="text-xs text-gray-500 m-0">
            Step {activeIndex >= 0 ? activeIndex + 1 : steps.length} of{" "}
            {steps.length}
          </p>
        </div>

        <div className="relative mb-6 hidden sm:block">
          <div className="h-1 rounded-full bg-gray-100" />
          <div
            className="absolute inset-y-0 left-0 h-1 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 list-none p-0">
          {steps.map((step) => {
            const allowed = stepAllowed(step, hasPermission, hasAnyPermission);
            const isDone = step.status === "done";
            const isActive = step.status === "active";

            return (
              <li
                key={step.number}
                className={[
                  "relative rounded-lg border px-3 py-3 min-w-0",
                  isActive
                    ? "border-slate-300 bg-slate-50 ring-1 ring-slate-200"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-gray-100 bg-gray-50/50",
                ].join(" ")}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isActive
                          ? "bg-[lab(36.9089%_35.0961_-85.6872)] text-white"
                          : "bg-gray-200 text-gray-600",
                    ].join(" ")}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : step.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 m-0 leading-snug">
                      {step.label}
                      {isActive && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[lab(36.9089%_35.0961_-85.6872)]">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 mb-0 line-clamp-2">
                      {step.description}
                    </p>
                    {!allowed && isActive && (
                      <p className="text-[11px] text-amber-700 mt-1.5 mb-0">
                        Requires {step.permission.replace("onboarding.", "")}{" "}
                        permission
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <ol className="m-0 space-y-2 list-none p-0">
      {steps.map((step) => {
        const allowed = stepAllowed(step, hasPermission, hasAnyPermission);
        const isDone = step.status === "done";
        const isActive = step.status === "active";

        return (
          <li
            key={step.number}
            className={[
              "flex gap-3 rounded-lg border px-3 py-2.5",
              isActive
                ? "border-slate-300 bg-slate-50"
                : isDone
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-gray-100 bg-white",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                isDone
                  ? "bg-emerald-600 text-white"
                  : isActive
                    ? "bg-[lab(36.9089%_35.0961_-85.6872)] text-white"
                    : "bg-gray-200 text-gray-600",
              ].join(" ")}
            >
              {isDone ? <Check className="h-3 w-3" /> : step.number}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 m-0">
                {step.label}
              </p>
              <p className="text-xs text-gray-600 mt-0.5 mb-0">
                {step.description}
              </p>
              {!allowed && isActive && (
                <p className="text-xs text-amber-700 mt-1 mb-0">
                  Requires {step.permission} permission
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
