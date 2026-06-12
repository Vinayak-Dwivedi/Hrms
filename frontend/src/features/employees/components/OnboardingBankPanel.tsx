"use client";

import { useCallback, useEffect, useState } from "react";
import OnboardingBankForm from "@/features/onboarding/components/OnboardingBankForm";
import type { OnboardingBankFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import {
  approveOnboardingBank,
  fetchOnboardingBank,
  updateOnboardingBank,
  type OnboardingBankState,
} from "../api/hr-onboarding.client";
import { employeeErrorBannerClass } from "../employee-theme";
import { onboardingPrimaryBtnClass } from "../onboarding-admin-theme";
import OnboardingReviewSection from "./OnboardingReviewSection";

interface Props {
  employeeId: number;
  canManageBank: boolean;
  isSubmitted: boolean;
  stepStatus?: "default" | "active" | "complete";
  onUpdated?: () => void;
}

export default function OnboardingBankPanel({
  employeeId,
  canManageBank,
  isSubmitted,
  stepStatus = "default",
  onUpdated,
}: Props) {
  const [state, setState] = useState<OnboardingBankState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOnboardingBank(employeeId);
      setState(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!isSubmitted) return;
    void load();
  }, [isSubmitted, load]);

  if (!isSubmitted) return null;

  async function handleSave(values: OnboardingBankFormValues) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateOnboardingBank(employeeId, values);
      setState(data);
      setSuccess("Bank details saved. Approve when ready for payroll setup.");
      onUpdated?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await approveOnboardingBank(employeeId);
      setState((prev) =>
        prev
          ? {
              ...prev,
              bankApprovedAt: data.bankApprovedAt,
              bankApprovedBy: data.bankApprovedBy,
            }
          : prev,
      );
      setSuccess("Bank account details approved.");
      onUpdated?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApproving(false);
    }
  }

  const initialValues: OnboardingBankFormValues = {
    bank:
      state?.bank?.length
        ? state.bank.map((row) => ({
            id: row.id,
            accountNumber: row.accountNumber,
            accountName: row.accountName,
            bankName: row.bankName,
            branchName: row.branchName,
            ifscCode: row.ifscCode,
            isPrimary: row.isPrimary,
          }))
        : [
            {
              accountNumber: "",
              accountName: "",
              bankName: "",
              branchName: "",
              ifscCode: "",
              isPrimary: true,
            },
          ],
  };

  return (
    <OnboardingReviewSection
      step={3}
      title="Bank account details"
      description=""
      status={state?.bankApprovedAt ? "complete" : stepStatus}
    >
      <div className="space-y-4">
        {state?.bankApprovedAt && (
          <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            Approved {new Date(state.bankApprovedAt).toLocaleString("en-IN")}
          </div>
        )}

        {error && <div className={employeeErrorBannerClass}>{error}</div>}
        {success && (
          <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 m-0">Loading bank details…</p>
        ) : canManageBank && !state?.bankApprovedAt ? (
          <>
            <OnboardingBankForm
              key={state?.bank?.map((b) => b.id).join("-") ?? "new"}
              initialValues={initialValues}
              onSubmit={handleSave}
              submitting={saving}
            />
            {state?.bankValid && (
              <button
                type="button"
                disabled={approving || saving}
                onClick={() => void handleApprove()}
                className={onboardingPrimaryBtnClass}
              >
                {approving ? "Approving…" : "Approve bank details"}
              </button>
            )}
          </>
        ) : (
          <OnboardingBankForm
            initialValues={initialValues}
            readOnly
            onSubmit={async () => {}}
          />
        )}

        {!canManageBank && (
          <p className="text-xs text-amber-700 m-0">
            You do not have permission to manage bank details. Ask an
            administrator to assign &quot;Manage Bank Details&quot; under the
            onboarding module, or use an account with Manage Onboarding access.
          </p>
        )}
      </div>
    </OnboardingReviewSection>
  );
}
