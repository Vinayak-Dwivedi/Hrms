"use client";

import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import type { ProfessionalDetailValues } from "@/features/onboarding/schemas/onboarding.schema";
import { cn } from "@/lib/utils";
import {
  employeeFieldLabelClass,
  employeeFormControlClass,
} from "../employee-theme";
import EmployeeFormField from "./EmployeeFormField";
import EmployeeFormSection from "./EmployeeFormSection";

export function createEmptyProfessionalRow(): ProfessionalDetailValues {
  return {
    companyName: "",
    designation: "",
    fromDate: "",
    toDate: "",
    isCurrent: false,
    responsibilities: "",
  };
}

export function isNoPreviousEmployment(
  professional: ProfessionalDetailValues[] | undefined,
): boolean {
  return (professional ?? []).length === 0;
}

export function professionalFromEmployeeProfile(
  profile?: EmployeeProfile | null,
): ProfessionalDetailValues[] {
  if (!profile?.professional?.length) return [];
  const row = profile.professional[0];
  return [
    {
      id: row.id,
      companyName: row.companyName,
      designation: row.designation,
      fromDate: row.fromDate,
      toDate: row.toDate ?? "",
      isCurrent: row.isCurrent,
      responsibilities: row.responsibilities ?? "",
    },
  ];
}

export function normalizeProfessionalForValidation(
  professional: ProfessionalDetailValues[] | undefined,
  noPreviousEmployment: boolean,
): ProfessionalDetailValues[] {
  if (noPreviousEmployment) return [];
  return [professional?.[0] ?? createEmptyProfessionalRow()];
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className={`${employeeFieldLabelClass} mb-1.5 m-0`}>{label}</p>
      <p className="text-sm text-gray-800 m-0 whitespace-pre-wrap">
        {value || "—"}
      </p>
    </div>
  );
}

type WorkInformationViewProps = {
  professional?: EmployeeProfile["professional"];
  compact?: boolean;
  className?: string;
};

export function WorkInformationView({
  professional = [],
  compact = false,
  className,
}: WorkInformationViewProps) {
  const row = professional[0];

  return (
    <EmployeeFormSection compact={compact} title="Work Information" className={className}>
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8">
        {row ? (
          <>
            <DetailRow label="Previous Company" value={row.companyName} />
            <DetailRow label="Designation" value={row.designation} />
            <DetailRow label="From Date" value={fmtDate(row.fromDate)} />
            <DetailRow
              label="To Date"
              value={
                row.isCurrent
                  ? "Present"
                  : row.toDate
                    ? fmtDate(row.toDate)
                    : "—"
              }
            />
            {row.responsibilities ? (
              <div className="md:col-span-2">
                <DetailRow
                  label="Responsibilities"
                  value={row.responsibilities}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="md:col-span-2">
            <DetailRow
              label="Previous employment"
              value="No previous employment (Fresher)"
            />
          </div>
        )}
      </div>
    </EmployeeFormSection>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1 m-0">{message}</p>;
}

function fieldControlClass(error?: string) {
  return cn(
    employeeFormControlClass,
    "w-full shadow-none",
    error && "!border-red-500",
  );
}

function fieldTextareaClass() {
  return "h-20 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm";
}

export type WorkInformationFieldsProps = {
  professional: ProfessionalDetailValues[];
  noPreviousEmployment: boolean;
  onProfessionalChange: (professional: ProfessionalDetailValues[]) => void;
  onNoPreviousEmploymentChange: (checked: boolean) => void;
  errors?: Record<string, string>;
  onBlurField?: (field: keyof ProfessionalDetailValues) => void;
  /** When false, render fields only (parent supplies EmployeeFormSection). */
  wrapInSection?: boolean;
  compact?: boolean;
  className?: string;
};

export function WorkInformationFields({
  professional,
  noPreviousEmployment,
  onProfessionalChange,
  onNoPreviousEmploymentChange,
  errors = {},
  onBlurField,
  wrapInSection = true,
  compact = false,
  className,
}: WorkInformationFieldsProps) {
  const professionalRow = professional[0] ?? createEmptyProfessionalRow();

  function updateProfessional(patch: Partial<ProfessionalDetailValues>) {
    const current = professional[0] ?? createEmptyProfessionalRow();
    onProfessionalChange([{ ...current, ...patch }]);
  }

  function handleNoPreviousEmploymentChange(checked: boolean) {
    onNoPreviousEmploymentChange(checked);
    if (checked) {
      onProfessionalChange([]);
    } else {
      onProfessionalChange(
        professional.length > 0 ? [professional[0]!] : [createEmptyProfessionalRow()],
      );
    }
  }

  const fresherToggle = (
    <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium text-gray-600">
      <input
        type="checkbox"
        className="rounded border-gray-300"
        checked={noPreviousEmployment}
        onChange={(e) => handleNoPreviousEmploymentChange(e.target.checked)}
      />
      No previous employment (Fresher)
    </label>
  );

  const fields = (
    <>
      {!noPreviousEmployment ? (
        <>
          <EmployeeFormField>
            <FieldLabel required>Previous Company</FieldLabel>
            <input
              className={fieldControlClass(errors["professional.0.companyName"])}
              value={professionalRow.companyName ?? ""}
              onBlur={() => onBlurField?.("companyName")}
              onChange={(e) => updateProfessional({ companyName: e.target.value })}
              placeholder="Company name"
            />
            <FieldError message={errors["professional.0.companyName"]} />
          </EmployeeFormField>
          <EmployeeFormField>
            <FieldLabel required>Designation</FieldLabel>
            <input
              className={fieldControlClass(errors["professional.0.designation"])}
              value={professionalRow.designation ?? ""}
              onBlur={() => onBlurField?.("designation")}
              onChange={(e) => updateProfessional({ designation: e.target.value })}
              placeholder="Your role / title"
            />
            <FieldError message={errors["professional.0.designation"]} />
          </EmployeeFormField>
          <EmployeeFormField>
            <FieldLabel required>From Date</FieldLabel>
            <input
              type="date"
              className={fieldControlClass(errors["professional.0.fromDate"])}
              value={professionalRow.fromDate ?? ""}
              onBlur={() => onBlurField?.("fromDate")}
              onChange={(e) => updateProfessional({ fromDate: e.target.value })}
            />
            <FieldError message={errors["professional.0.fromDate"]} />
          </EmployeeFormField>
          <EmployeeFormField>
            <FieldLabel required>To Date</FieldLabel>
            <input
              type="date"
              className={fieldControlClass(errors["professional.0.toDate"])}
              value={professionalRow.toDate ?? ""}
              onBlur={() => onBlurField?.("toDate")}
              onChange={(e) => updateProfessional({ toDate: e.target.value })}
            />
            <FieldError message={errors["professional.0.toDate"]} />
          </EmployeeFormField>
          <EmployeeFormField span={2}>
            <FieldLabel>Responsibilities (optional)</FieldLabel>
            <textarea
              className={fieldTextareaClass()}
              value={professionalRow.responsibilities ?? ""}
              onChange={(e) =>
                updateProfessional({ responsibilities: e.target.value })
              }
              placeholder="Brief summary of key responsibilities"
              rows={3}
            />
          </EmployeeFormField>
        </>
      ) : null}
      <FieldError message={errors.professional} />
    </>
  );

  if (!wrapInSection) {
    return (
      <div className={className}>
        <div className="mb-4 flex justify-end">{fresherToggle}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {fields}
        </div>
      </div>
    );
  }

  return (
    <EmployeeFormSection
      compact={compact}
      title="Work Information"
      headerAction={fresherToggle}
      className={className}
    >
      {fields}
    </EmployeeFormSection>
  );
}
