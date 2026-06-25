"use client";

import { useState } from "react";
import type { EmployeeProfile } from "../api/onboarding.client";
import {
  bankFormValuesFromProfile,
  updateOnboardingBank,
} from "../api/onboarding.client";
import type { OnboardingBankFormValues } from "../schemas/onboarding.schema";
import OnboardingBankForm from "./OnboardingBankForm";

interface Props {
  bank: EmployeeProfile["bank"];
  onSaved: () => void | Promise<void>;
  onSubmitBank?: (values: OnboardingBankFormValues) => Promise<void>;
}

export default function OnboardingBankStep({ bank, onSaved, onSubmitBank }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialValues = bankFormValuesFromProfile({ bank });

  async function handleSubmit(values: OnboardingBankFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await (onSubmitBank ?? updateOnboardingBank)(values);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-semibold text-gray-900 m-0">
          Bank account details
        </h2>
        <p className="text-sm text-gray-600 mt-1 mb-0">
          Add your primary salary account. This information is used for payroll
          after HR approval.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 m-0">
          {error}
        </p>
      ) : null}

      <OnboardingBankForm
        key={JSON.stringify(initialValues)}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save & Continue to Review"
      />
    </div>
  );
}
