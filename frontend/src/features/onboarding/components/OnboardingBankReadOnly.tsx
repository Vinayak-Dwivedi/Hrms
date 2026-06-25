"use client";

import type { EmployeeProfile } from "../api/onboarding.client";
import {
  onboardingReadOnlyLabelClass,
  onboardingReadOnlyValueClass,
} from "../constants/onboarding-theme";

function maskAccountNumber(accountNumber: string): string {
  const trimmed = accountNumber.trim();
  if (!trimmed) return "—";
  if (trimmed.length <= 4) return "••••";
  return `•••• ${trimmed.slice(-4)}`;
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={onboardingReadOnlyLabelClass}>{label}</dt>
      <dd className={onboardingReadOnlyValueClass}>{value}</dd>
    </div>
  );
}

interface Props {
  bank: EmployeeProfile["bank"];
}

export default function OnboardingBankReadOnly({ bank }: Props) {
  const primary = bank.find((row) => row.isPrimary) ?? bank[0];

  if (!primary) {
    return (
      <p className="text-sm text-gray-500 m-0">No bank account details saved yet.</p>
    );
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ReadOnlyRow label="Account holder name" value={primary.accountName || "—"} />
      <ReadOnlyRow label="Bank name" value={primary.bankName || "—"} />
      <ReadOnlyRow
        label="Account number"
        value={maskAccountNumber(primary.accountNumber)}
      />
      <ReadOnlyRow label="IFSC code" value={primary.ifscCode || "—"} />
      <ReadOnlyRow label="Branch" value={primary.branchName || "—"} />
    </dl>
  );
}
