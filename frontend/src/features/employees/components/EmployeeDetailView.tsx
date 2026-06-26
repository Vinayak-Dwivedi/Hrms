"use client";

import { Briefcase, Contact, KeyRound, Mail, Pencil, User } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  resolveOrgHierarchyRoleDisplay,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/components/OrgHierarchyRoleFields";
import {
  formatEmployeeDisplayName,
  getOnboardingInvitationStatus,
  isOnboardingCompleted,
  lookupName,
  type EmployeeDetail,
  type EmployeeStatus,
  type LookupItem,
} from "../api/employees.client";
import {
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeFieldLabelClass,
  employeeFormSectionsGridClass,
  employeeIconPen,
} from "../employee-theme";
import EmployeeFormSection from "./EmployeeFormSection";
import EmployeeOnboardingProfileView from "./EmployeeOnboardingProfileView";
import { WorkInformationView } from "./WorkInformationSection";

interface Props {
  employee: EmployeeDetail;
  orgLookups: OrgHierarchyRoleLookups;
  branches: LookupItem[];
  managerLabel: string;
  shiftLabel?: string;
  systemAccessRoleLabel?: string;
  variant?: "page" | "modal";
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
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className={`${employeeFieldLabelClass} mb-1.5 m-0`}>{label}</p>
      <p className="text-sm text-gray-800 m-0">{value || "—"}</p>
    </div>
  );
}

function DetailSectionBody({ children }: { children: ReactNode }) {
  return (
    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8">
      {children}
    </div>
  );
}

export default function EmployeeDetailView({
  employee,
  orgLookups,
  branches,
  managerLabel,
  shiftLabel,
  systemAccessRoleLabel,
  variant = "page",
  onEdit,
  onResendInvitation,
  resendingInvitation = false,
}: Props) {
  const isModal = variant === "modal";
  const headerClass = isModal ? "p-6" : `${employeeCardClass} p-6`;
  const invitation = getOnboardingInvitationStatus(employee);
  const onboardingComplete = isOnboardingCompleted(employee);
  const orgRole = useMemo(
    () =>
      resolveOrgHierarchyRoleDisplay(
        employee.orgHierarchyStructureId,
        orgLookups,
      ),
    [employee.orgHierarchyStructureId, orgLookups],
  );

  return (
    <div className="space-y-4">
      <div className={headerClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            {!isModal && (
              <h2 className="text-xl font-semibold text-slate-800 m-0">
                {formatEmployeeDisplayName(employee)}
              </h2>
            )}
            <p
              className={`text-sm text-slate-500 ${isModal ? "mt-0 mb-2" : "mt-1 mb-2"} m-0`}
            >
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
            {onResendInvitation &&
              !onboardingComplete &&
              employee.employeeStatus === "Active" && (
              <button
                type="button"
                onClick={onResendInvitation}
                disabled={resendingInvitation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
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
      </div>

      <div
        className={
          isModal
            ? `px-6 pb-6 ${employeeFormSectionsGridClass}`
            : employeeFormSectionsGridClass
        }
      >
        <EmployeeFormSection compact icon={User} title="Basic Information">
          <DetailSectionBody>
            <DetailRow label="First name" value={employee.firstName} />
            <DetailRow label="Middle name" value={employee.middleName ?? "—"} />
            <DetailRow label="Last name" value={employee.lastName} />
          </DetailSectionBody>
        </EmployeeFormSection>

        <EmployeeFormSection compact icon={Contact} title="Personal Details">
          <DetailSectionBody>
            <DetailRow label="Personal email" value={employee.personalEmail} />
            <DetailRow label="Work email" value={employee.workEmail ?? "—"} />
            <DetailRow label="Phone" value={employee.phone} />
            <DetailRow label="Date of birth" value={fmtDate(employee.dob)} />
            <DetailRow label="Gender" value={employee.gender} />
          </DetailSectionBody>
        </EmployeeFormSection>

        <EmployeeFormSection compact dense icon={Briefcase} title="Employment Details">
          <DetailSectionBody>
            <DetailRow
              label="Joining date"
              value={fmtDate(employee.joiningDate)}
            />
            <DetailRow
              label="Location"
              value={lookupName(
                employee.locationId ?? employee.branchId,
                branches,
              )}
            />
            <DetailRow label="Department" value={orgRole.department} />
            <DetailRow label="Sub department" value={orgRole.subDepartment} />
            <DetailRow label="Designation" value={orgRole.designation} />
            <DetailRow label="Level / grade" value={orgRole.levelGrade} />
            <DetailRow label="Reporting manager" value={managerLabel} />
            <DetailRow label="Shift" value={shiftLabel ?? "—"} />
            <DetailRow label="Status" value={employee.employeeStatus} />
          </DetailSectionBody>
        </EmployeeFormSection>

        <WorkInformationView
          professional={employee.profile?.professional ?? []}
          compact
        />

        <EmployeeFormSection
          bodyClassName="px-4 py-4"
          compact
          icon={KeyRound}
          title="Account & Access"
        >
          <div className="col-span-full">
            <DetailRow
              label="System access role"
              value={systemAccessRoleLabel ?? employee.roleName ?? "—"}
            />
          </div>
        </EmployeeFormSection>

        {employee.profile ? (
          <EmployeeOnboardingProfileView inGrid profile={employee.profile} />
        ) : null}
      </div>
    </div>
  );
}
