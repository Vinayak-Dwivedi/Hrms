"use client";

import { Mail, Pencil } from "lucide-react";
import Link from "next/link";
import {
  formatEmployeeDisplayName,
  getOnboardingInvitationStatus,
  lookupName,
  type EmployeeDetail,
  type EmployeeStatus,
  type LookupItem,
} from "../api/employees.client";
import { employeeCardClass, employeeEditIconBtnClass, employeeFieldLabelClass, employeeIconPen } from "../employee-theme";

interface Props {
  employee: EmployeeDetail;
  departments: LookupItem[];
  designations: LookupItem[];
  branches: LookupItem[];
  grades: LookupItem[];
  managerLabel: string;
  variant?: "page" | "modal";
  onboardingHref?: string;
  onEdit?: () => void;
  onResendInvitation?: () => void;
  resendingInvitation?: boolean;
}

const STATUS_CLASS: Record<EmployeeStatus, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-red-100 text-red-700",
  Probation: "bg-blue-100 text-blue-700",
  Notice: "bg-yellow-100 text-yellow-700",
  Exited: "bg-gray-100 text-gray-600",
};

const INVITATION_TONE_CLASS = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-700",
} as const;

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <p className={`${employeeFieldLabelClass} mb-1.5 m-0`}>
        {label}
      </p>
      <p className="text-sm text-gray-800 m-0">{value || "—"}</p>
    </div>
  );
}

export default function EmployeeDetailView({
  employee,
  departments,
  designations,
  branches,
  grades,
  managerLabel,
  variant = "page",
  onboardingHref,
  onEdit,
  onResendInvitation,
  resendingInvitation = false,
}: Props) {
  const isModal = variant === "modal";
  const wrapperClass = isModal ? "p-6" : `${employeeCardClass} p-6`;
  const invitation = getOnboardingInvitationStatus(employee);

  return (
    <div className={wrapperClass}>
      <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          {!isModal && (
            <h2 className="text-xl font-semibold text-gray-800 m-0">
              {formatEmployeeDisplayName(employee)}
            </h2>
          )}
          <p className={`text-sm text-gray-500 ${isModal ? "mt-0 mb-2" : "mt-1 mb-2"} m-0`}>
            {employee.empId}
          </p>
          <span
            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${STATUS_CLASS[employee.employeeStatus]}`}
          >
            {employee.employeeStatus}
          </span>
          <span
            className={`inline-block ml-2 px-3 py-1 text-xs font-medium rounded-full ${INVITATION_TONE_CLASS[invitation.tone]}`}
          >
            {invitation.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onboardingHref && (
            <Link
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100 no-underline transition-colors"
              href={onboardingHref}
            >
              Onboarding
            </Link>
          )}
          {onResendInvitation && employee.employeeStatus === "Active" && (
            <button
              type="button"
              onClick={onResendInvitation}
              disabled={resendingInvitation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Mail size={14} />
              {resendingInvitation ? "Sending…" : "Resend invitation"}
            </button>
          )}
          {isModal && onEdit ? (
            <button
              aria-label="Edit employee"
              className={employeeEditIconBtnClass}
              onClick={onEdit}
              title="Edit"
              type="button"
            >
              <Pencil className={employeeIconPen} />
            </button>
          ) : !isModal ? (
            <Link
              aria-label="Edit employee"
              className={employeeEditIconBtnClass}
              href={`/employees/${employee.id}/edit`}
              title="Edit"
            >
              <Pencil className={employeeIconPen} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <DetailRow label="First name" value={employee.firstName} />
        <DetailRow label="Middle name" value={employee.middleName ?? "—"} />
        <DetailRow label="Last name" value={employee.lastName} />
        <DetailRow label="Personal email" value={employee.personalEmail} />
        <DetailRow label="Work email" value={employee.workEmail ?? "—"} />
        <DetailRow label="Phone" value={employee.phone} />
        <DetailRow label="Date of birth" value={fmtDate(employee.dob)} />
        <DetailRow label="Gender" value={employee.gender} />
        <DetailRow label="Nationality" value={employee.nationality} />
        <DetailRow label="Joining date" value={fmtDate(employee.joiningDate)} />
        <DetailRow
          label="Department"
          value={lookupName(employee.departmentId, departments)}
        />
        <DetailRow
          label="Designation"
          value={lookupName(employee.designationId, designations)}
        />
        <DetailRow label="Grade" value={lookupName(employee.gradeId, grades)} />
        <DetailRow label="Branch" value={lookupName(employee.branchId, branches)} />
        <DetailRow label="Reporting manager" value={managerLabel} />
        <DetailRow label="Marital status" value={employee.maritalStatus ?? "—"} />
        <DetailRow label="Spouse name" value={employee.spouseName ?? "—"} />
      </div>
    </div>
  );
}
