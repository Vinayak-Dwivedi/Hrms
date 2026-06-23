"use client";

import { type ReactNode, forwardRef, useImperativeHandle, useState } from "react";
import EmployeeFormField from "@/features/employees/components/EmployeeFormField";
import EmployeeFormSection from "@/features/employees/components/EmployeeFormSection";
import { employeeBtnClass } from "@/features/employees/employee-theme";
import { onboardingBtnPrimaryClass } from "../constants/onboarding-theme";
import {
  collectOnboardingBankErrors,
  onboardingBankFormSchema,
  type BankDetailValues,
  type OnboardingBankFormValues,
} from "../schemas/onboarding.schema";

interface Props {
  initialValues?: OnboardingBankFormValues;
  onSubmit?: (values: OnboardingBankFormValues) => Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  readOnly?: boolean;
  embedded?: boolean;
}

export type OnboardingBankFormHandle = {
  validate: () => OnboardingBankFormValues | null;
  isEmpty: () => boolean;
};

const DEFAULT_BANK_ROW: BankDetailValues = {
  accountNumber: "",
  accountName: "",
  bankName: "",
  branchName: "",
  ifscCode: "",
  isPrimary: true,
};

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1 m-0">{message}</p>;
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500 mt-1 m-0">{children}</p>;
}

function digitsOnly(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

function isBankEmpty(values: OnboardingBankFormValues): boolean {
  return values.bank.every(
    (row) =>
      !row.accountNumber.trim() &&
      !row.accountName.trim() &&
      !row.bankName.trim() &&
      !row.branchName.trim() &&
      !row.ifscCode.trim(),
  );
}

const OnboardingBankForm = forwardRef<OnboardingBankFormHandle, Props>(
  function OnboardingBankForm(
    {
      initialValues,
      onSubmit,
      submitting = false,
      submitLabel = "Save bank details",
      readOnly = false,
      embedded = false,
    },
    ref,
  ) {
  const [values, setValues] = useState<OnboardingBankFormValues>({
    bank:
      initialValues?.bank?.length && initialValues.bank.length > 0
        ? initialValues.bank
        : [DEFAULT_BANK_ROW],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function updateBank(index: number, patch: Partial<BankDetailValues>) {
    setValues((prev) => ({
      bank: prev.bank.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) {
        delete next[`bank.${index}.${key}`];
      }
      return next;
    });
  }

  function blurBankField(fieldKey: string, nextValues: OnboardingBankFormValues) {
    const fieldErrors = collectOnboardingBankErrors(nextValues);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[fieldKey]) next[fieldKey] = fieldErrors[fieldKey];
      else delete next[fieldKey];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = onboardingBankFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectOnboardingBankErrors(values));
      return;
    }
    setErrors({});
    try {
      await onSubmit?.(parsed.data);
    } catch (err) {
      setFormError((err as Error).message ?? "Failed to save bank details.");
    }
  }

  useImperativeHandle(ref, () => ({
    validate: () => {
      if (isBankEmpty(values)) return null;
      const parsed = onboardingBankFormSchema.safeParse(values);
      if (!parsed.success) {
        setErrors(collectOnboardingBankErrors(values));
        return null;
      }
      setErrors({});
      return parsed.data;
    },
    isEmpty: () => isBankEmpty(values),
  }));

  if (readOnly) {
    return (
      <EmployeeFormSection title="Bank account details">
        {values.bank.map((row, index) => (
          <div key={index} className="contents">
            <EmployeeFormField>
              <FieldLabel>Account Number</FieldLabel>
              <p className="text-sm text-gray-900 m-0">{row.accountNumber || "—"}</p>
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel>Account Name</FieldLabel>
              <p className="text-sm text-gray-900 m-0">{row.accountName || "—"}</p>
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel>Bank Name</FieldLabel>
              <p className="text-sm text-gray-900 m-0">{row.bankName || "—"}</p>
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel>Branch</FieldLabel>
              <p className="text-sm text-gray-900 m-0">{row.branchName || "—"}</p>
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel>IFSC Code</FieldLabel>
              <p className="text-sm text-gray-900 m-0">{row.ifscCode || "—"}</p>
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel>Primary account</FieldLabel>
              <p className="text-sm text-gray-900 m-0">
                {row.isPrimary ? "Yes" : "No"}
              </p>
            </EmployeeFormField>
          </div>
        ))}
      </EmployeeFormSection>
    );
  }

  const formBody = (
    <>
      <EmployeeFormSection title="Bank account details">
        {values.bank.map((row, index) => (
          <div key={index} className="contents">
            <EmployeeFormField>
              <FieldLabel required>Account Number</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.accountNumber}
                onBlur={() =>
                  blurBankField(`bank.${index}.accountNumber`, values)
                }
                onChange={(e) =>
                  updateBank(index, {
                    accountNumber: digitsOnly(e.target.value, 18),
                  })
                }
                placeholder="9–18 digits"
                inputMode="numeric"
                maxLength={18}
              />
              <FieldError message={errors[`bank.${index}.accountNumber`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>Account Name</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.accountName}
                onBlur={() =>
                  blurBankField(`bank.${index}.accountName`, values)
                }
                onChange={(e) =>
                  updateBank(index, { accountName: e.target.value })
                }
              />
              <FieldError message={errors[`bank.${index}.accountName`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>Bank Name</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.bankName}
                onBlur={() => blurBankField(`bank.${index}.bankName`, values)}
                onChange={(e) =>
                  updateBank(index, { bankName: e.target.value })
                }
              />
              <FieldError message={errors[`bank.${index}.bankName`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>Branch</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={row.branchName}
                onBlur={() =>
                  blurBankField(`bank.${index}.branchName`, values)
                }
                onChange={(e) =>
                  updateBank(index, { branchName: e.target.value })
                }
              />
              <FieldError message={errors[`bank.${index}.branchName`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <FieldLabel required>IFSC Code</FieldLabel>
              <input
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm uppercase"
                value={row.ifscCode}
                onBlur={() => blurBankField(`bank.${index}.ifscCode`, values)}
                onChange={(e) =>
                  updateBank(index, {
                    ifscCode: e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 11),
                  })
                }
                placeholder="SBIN0001234"
                maxLength={11}
              />
              <FieldHint>11 characters: 4 letters + 0 + 6 alphanumeric</FieldHint>
              <FieldError message={errors[`bank.${index}.ifscCode`]} />
            </EmployeeFormField>
            <EmployeeFormField>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-6">
                <input
                  type="checkbox"
                  checked={row.isPrimary ?? false}
                  onChange={(e) =>
                    updateBank(index, { isPrimary: e.target.checked })
                  }
                />
                Primary account
              </label>
            </EmployeeFormField>
          </div>
        ))}
        <FieldError message={errors.bank} />
      </EmployeeFormSection>

      {formError && !embedded ? (
        <p className="text-sm text-red-600 m-0">{formError}</p>
      ) : null}

      {!embedded ? (
        <button
          type="submit"
          disabled={submitting}
          className={
            submitLabel === "Save bank details"
              ? employeeBtnClass
              : onboardingBtnPrimaryClass
          }
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="contents">{formBody}</div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formBody}
    </form>
  );
},
);

export default OnboardingBankForm;
