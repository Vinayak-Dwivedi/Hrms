"use client";

import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import EmployeeFormField from "./EmployeeFormField";
import EmployeeFormSection from "./EmployeeFormSection";
import { employeeFieldLabelClass } from "../employee-theme";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className={`${employeeFieldLabelClass} mb-1.5 m-0`}>{label}</p>
      <p className="text-sm text-gray-800 m-0">{value || "—"}</p>
    </div>
  );
}

type Props = {
  bank: EmployeeProfile["bank"];
  compact?: boolean;
  /** When false, render fields only (parent supplies EmployeeFormSection). */
  wrapInSection?: boolean;
};

export default function OnboardingBankDetailsView({
  bank,
  compact = false,
  wrapInSection = true,
}: Props) {
  const primary = bank.find((row) => row.isPrimary) ?? bank[0];

  const fields = primary ? (
    <>
      <EmployeeFormField>
        <DetailRow label="Account Number" value={primary.accountNumber} />
      </EmployeeFormField>
      <EmployeeFormField>
        <DetailRow label="Account Name" value={primary.accountName} />
      </EmployeeFormField>
      <EmployeeFormField>
        <DetailRow label="Bank Name" value={primary.bankName} />
      </EmployeeFormField>
      <EmployeeFormField>
        <DetailRow label="Branch Name" value={primary.branchName} />
      </EmployeeFormField>
      <EmployeeFormField>
        <DetailRow label="IFSC Code" value={primary.ifscCode} />
      </EmployeeFormField>
      <EmployeeFormField>
        <DetailRow
          label="Primary account"
          value={primary.isPrimary ? "Yes" : "No"}
        />
      </EmployeeFormField>
    </>
  ) : (
    <p className="text-sm text-gray-500 m-0 col-span-full">—</p>
  );

  if (!wrapInSection) {
    return <>{fields}</>;
  }

  return (
    <EmployeeFormSection compact={compact} title="Bank account details">
      {fields}
    </EmployeeFormSection>
  );
}
