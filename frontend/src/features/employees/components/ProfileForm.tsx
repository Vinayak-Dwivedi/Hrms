"use client";

import {
  Briefcase,
  Camera,
  FileText,
  GraduationCap,
  Info,
  Landmark,
  Lock,
  LogOut,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Shield,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import {
  loadEmployeeProfilePage,
  profilePageToEditable,
  saveEmployeeProfilePage,
  sendPersonalEmailVerificationOtp,
  sendPersonalPhoneVerificationOtp,
  uploadProfilePhoto,
  type ProfileEditableState,
  type ProfileQualification,
} from "../api/profile.client";
import {
  EmailUnverifiedBadge,
  EmailVerifiedBadge,
} from "./EmployeeEmailStatus";
import PersonalEmailVerificationDialog from "./PersonalEmailVerificationDialog";
import PersonalPhoneVerificationDialog from "./PersonalPhoneVerificationDialog";
import type { MyProfile } from "@/lib/hrms-client";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeCardClass,
  employeeErrorBannerClass,
  employeeFieldLabelClass,
  employeeProfileLabelClass,
  employeeIconMd,
  employeeInputClass,
  employeeLoadingClass,
  employeeSelectClass,
} from "../employee-theme";
import {
  type ExitInterviewResponse,
  getMyExitInterview,
  getMyResignations,
  listActiveExitReasons,
  submitResignation,
  type Resignation,
  type ValidationItem,
} from "@/features/offboarding/api/offboarding.client";
import ExitSurveyDialog from "@/features/offboarding/ExitSurveyDialog";

type ProfileTab =
  | "profile"
  | "contact"
  | "employment"
  | "emergency"
  | "personal"
  | "academics"
  | "bank";

type NavItem = {
  id: ProfileTab;
  label: string;
  icon: typeof User;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "",
    items: [
      { id: "profile", label: "Basic Information", icon: User },
      { id: "contact", label: "Contact Details", icon: Phone },
      { id: "emergency", label: "Emergency Contact", icon: Shield },
    ],
  },
  {
    title: "Employment & Records",
    items: [
      { id: "employment", label: "Employment", icon: Briefcase },
      { id: "personal", label: "Personal & Compliance", icon: FileText },
      { id: "academics", label: "Academic Details", icon: GraduationCap },
      { id: "bank", label: "Bank Details", icon: Landmark },
    ],
  },
];

const TAB_META: Record<
  ProfileTab,
  { title: string; description: string; hrManaged?: boolean }
> = {
  profile: {
    title: "Basic Information",
    description:
      "Your core identity details as maintained in the HRMS employee master.",
    hrManaged: true,
  },
  contact: {
    title: "Contact Details",
    description:
      "Keep your phone number, personal email, and address information up to date.",
  },
  employment: {
    title: "Employment Details",
    description:
      "Your job placement, reporting structure, and employment classification.",
    hrManaged: true,
  },
  emergency: {
    title: "Emergency Contact",
    description:
      "Person to contact in case of an emergency. This information is kept confidential.",
  },
  personal: {
    title: "Personal & Compliance",
    description:
      "Family details and statutory identifiers required for payroll and compliance.",
  },
  academics: {
    title: "Academic Details",
    description:
      "Educational qualifications on file. Add or update your academic history.",
  },
  bank: {
    title: "Bank Details",
    description:
      "Salary disbursement account information. Ensure details match your bank records.",
  },
};

function newLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const editableInputClass = `${employeeInputClass} bg-white`;
const readonlyInputClass = `${employeeInputClass} border-gray-200 text-gray-700 bg-gray-50/80 cursor-default select-none focus:ring-0`;

function ProfileBadge({
  variant,
}: {
  variant: "hr" | "editable";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
        variant === "hr"
          ? "bg-gray-100 text-gray-600"
          : "bg-[#fff1f2] text-[#be185d]"
      }`}
    >
      {variant === "hr" ? (
        <>
          <Lock className="w-2.5 h-2.5" />
          HR Managed
        </>
      ) : (
        "Editable"
      )}
    </span>
  );
}

function ProfileIdentityRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-[10.5rem_minmax(0,1fr)] items-center gap-x-4">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 leading-snug">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

function ProfileSectionHeader({ tab }: { tab: ProfileTab }) {
  const meta = TAB_META[tab];
  return (
    <div className="mb-6 pb-0 border-b border-gray-100">
      <div className="flex flex-wrap items-center gap-2.5 mb-2">
        <h2 className="text-lg font-semibold text-gray-900 m-0 tracking-tight">
          {meta.title}
        </h2>
        <ProfileBadge variant={meta.hrManaged ? "hr" : "editable"} />
      </div>
    </div>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 mb-5">
      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
      <p className="text-sm text-blue-900 m-0 leading-relaxed">{children}</p>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <label className={employeeProfileLabelClass}>
        <span className="inline-flex items-center gap-1">
          {label}
          <Lock className="w-3 h-3 text-gray-400" />
        </span>
      </label>
      <input
        className={readonlyInputClass}
        readOnly
        tabIndex={-1}
        value={value ?? "—"}
      />
    </div>
  );
}

const verifyLinkClass =
  "mt-1.5 text-[11px] font-semibold text-[#ff014f] hover:text-[#be185d] bg-transparent border-0 p-0 cursor-pointer inline-block";

function VerifiedReadOnlyField({
  label,
  value,
  isVerified,
  onVerify,
  verifyLabel,
}: {
  label: string;
  value: string | null | undefined;
  isVerified: boolean;
  onVerify?: () => void;
  verifyLabel: string;
}) {
  if (!value?.trim()) return null;

  return (
    <div>
      <label className={employeeProfileLabelClass}>
        <span className="inline-flex items-center gap-2">
          {label}
          {isVerified ? <EmailVerifiedBadge /> : <EmailUnverifiedBadge />}
        </span>
      </label>
      <input
        className={readonlyInputClass}
        readOnly
        tabIndex={-1}
        value={value}
      />
      {!isVerified && onVerify ? (
        <button className={verifyLinkClass} onClick={onVerify} type="button">
          {verifyLabel}
        </button>
      ) : null}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const pct = len / max;
  const cls =
    pct >= 1
      ? "text-red-500 font-semibold"
      : pct >= 0.85
        ? "text-orange-400"
        : "text-gray-400";
  return (
    <span className={`text-[11px] tabular-nums shrink-0 ${cls}`}>
      {len}/{max}
    </span>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helper,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  helper?: string;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <label className={employeeProfileLabelClass}>{label}</label>
      <input
        className={`${editableInputClass} ${error ? "!border-red-400 focus:!ring-red-100" : ""}`}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
        maxLength={maxLength}
      />
      {error ? (
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-xs text-red-500 mb-0 leading-tight">{error}</p>
          {maxLength ? <CharCount value={value} max={maxLength} /> : null}
        </div>
      ) : (helper || maxLength) ? (
        <div className="flex items-start justify-between mt-1 gap-2">
          {helper ? (
            <p className="text-xs text-gray-400 mb-0 leading-relaxed">{helper}</p>
          ) : (
            <span />
          )}
          {maxLength ? <CharCount value={value} max={maxLength} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function EditableTextArea({
  label,
  value,
  onChange,
  placeholder,
  span2 = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  span2?: boolean;
  maxLength?: number;
}) {
  return (
    <div className={span2 ? FORM_GRID_FULL_ROW_CLASS : undefined}>
      <label className={employeeProfileLabelClass}>{label}</label>
      <textarea
        className={`${editableInputClass} min-h-[96px] resize-y`}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        value={value}
        maxLength={maxLength}
      />
      {maxLength ? (
        <div className="flex justify-end mt-1">
          <CharCount value={value} max={maxLength} />
        </div>
      ) : null}
    </div>
  );
}

type StringFieldKey = {
  [K in keyof ProfileEditableState]: ProfileEditableState[K] extends string
    ? K
    : never;
}[keyof ProfileEditableState];

const FORM_PANEL_CLASS = "w-full";
const FORM_GRID_CLASS =
  "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5";
const PROFILE_GRID_CLASS =
  "grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5";
const FORM_GRID_FULL_ROW_CLASS = "md:col-span-2 xl:col-span-3";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProfileSidebar({
  activeTab,
  onTabChange,
  onRequestSeparation,
  canRequestResignation,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onRequestSeparation: () => void;
  canRequestResignation: boolean;
}) {
  return (
    <aside className="w-full md:w-[272px] shrink-0 border-b md:border-b-0 md:border-r border-gray-100 bg-white flex flex-col">
      <nav className="flex-1 px-3 pt-5 pb-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p
              className={`${employeeFieldLabelClass} px-3 mb-2`}
            >
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    className={`w-full flex items-center gap-2.5 pl-3 pr-3 py-2.5 rounded-md text-[13px] font-medium transition-all cursor-pointer border-0 border-l-2 ${
                      active
                        ? "border-l-[#ff014f] bg-gray-50 text-gray-900"
                        : "border-l-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    key={id}
                    onClick={() => onTabChange(id)}
                    type="button"
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active ? "text-[#ff014f]" : "text-gray-400"}`}
                    />
                    <span className="flex-1 text-left truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {canRequestResignation && (
        <div className="px-3 pb-5 pt-2 border-t border-gray-100 mt-auto">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer border-0 bg-transparent"
            onClick={onRequestSeparation}
            type="button"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Request Resignation</span>
          </button>
        </div>
      )}
    </aside>
  );
}

function ProfileActionBar({
  saving,
  onReset,
  showReset = true,
  hint = "Changes are saved to your employee record.",
}: {
  saving: boolean;
  onReset: () => void;
  showReset?: boolean;
  hint?: string;
}) {
  return (
    <div className="shrink-0 px-8 py-4 border-t border-gray-100 bg-gray-50/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-xs text-gray-500 m-0">{hint}</p>
      <div className="flex items-center gap-3 shrink-0">
        {showReset ? (
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            disabled={saving}
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
        ) : null}
        <button
          className={`${employeeBtnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [extendedProfile, setExtendedProfile] = useState<EmployeeProfile | null>(
    null,
  );
  const [form, setForm] = useState<ProfileEditableState | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [myResignation, setMyResignation] = useState<Resignation | null>(null);
  const [myExitInterview, setMyExitInterview] = useState<ExitInterviewResponse | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
  const [emailVerifyCooldown, setEmailVerifyCooldown] = useState(60);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [phoneVerifyCooldown, setPhoneVerifyCooldown] = useState(60);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [academicErrors, setAcademicErrors] = useState<
    Record<string, { yearOfPassing?: string; gradePercentage?: string }>
  >({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingPhotoFileRef = useRef<File | null>(null);
  const committedFormRef = useRef<ProfileEditableState | null>(null);

  function validateYear(value: string): string | undefined {
    const v = value.trim();
    if (!v) return undefined;
    if (!/^\d+$/.test(v)) return "Year must be a number";
    if (v.length !== 4) return "Enter a 4-digit year";
    const n = Number(v);
    if (n < 1950) return "Year must be 1950 or later";
    if (n > new Date().getFullYear()) return "Year cannot be in the future";
    return undefined;
  }

  function validatePercentage(value: string): string | undefined {
    const v = value.trim();
    if (!v) return undefined;
    const cleaned = v.endsWith("%") ? v.slice(0, -1) : v;
    const n = Number(cleaned);
    if (isNaN(n) || cleaned === "") return "Enter a number (e.g. 85 or 85%)";
    if (n < 0) return "Percentage cannot be negative";
    if (n > 100) return "Percentage must be 100 or less";
    return undefined;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await loadEmployeeProfilePage();
      setProfile(data.profile);
      setExtendedProfile(data.extended);
      setForm(data.form);
      committedFormRef.current = data.form;
    } catch (e) {
      setError((e as Error).message ?? "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMyResignation() {
    try {
      const rows = await getMyResignations();
      setMyResignation(rows[0] ?? null);
    } catch {
      /* non-critical — the strip just stays hidden */
    }
  }

  async function refreshMyExitInterview() {
    try {
      setMyExitInterview(await getMyExitInterview());
    } catch {
      /* non-critical */
    }
  }

  useEffect(() => {
    void refreshMyResignation();
    void refreshMyExitInterview();
  }, []);

  function set<K extends StringFieldKey>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setPrimaryAccount(checked: boolean) {
    setForm((prev) => (prev ? { ...prev, isPrimaryAccount: checked } : prev));
  }

  function updateAcademic(id: string, patch: Partial<ProfileQualification>) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            academics: prev.academics.map((a) =>
              a.id === id ? { ...a, ...patch } : a,
            ),
          }
        : prev,
    );
    setAcademicErrors((prev) => {
      const entry = { ...(prev[id] ?? {}) };
      if ("yearOfPassing" in patch) {
        const err = validateYear(patch.yearOfPassing ?? "");
        if (err) entry.yearOfPassing = err;
        else delete entry.yearOfPassing;
      }
      if ("gradePercentage" in patch) {
        const err = validatePercentage(patch.gradePercentage ?? "");
        if (err) entry.gradePercentage = err;
        else delete entry.gradePercentage;
      }
      return { ...prev, [id]: entry };
    });
  }

  function addAcademic() {
    setForm((prev) => {
      if (!prev || prev.academics.length >= 5) return prev;
      return {
        ...prev,
        academics: [
          ...prev.academics,
          {
            id: newLocalId(),
            qualification: "",
            institution: "",
            boardUniversity: "",
            yearOfPassing: "",
            gradePercentage: "",
          },
        ],
      };
    });
  }

  function removeAcademic(id: string) {
    setForm((prev) =>
      prev
        ? { ...prev, academics: prev.academics.filter((a) => a.id !== id) }
        : prev,
    );
    setAcademicErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleVerifyPersonalEmail() {
    if (!profile?.personalEmail || profile.personalEmailVerified) return;
    setSendingEmailOtp(true);
    try {
      const result = await sendPersonalEmailVerificationOtp();
      setEmailVerifyCooldown(result.resendCooldownSeconds);
      setEmailVerifyOpen(true);
      toast.success("Verification code sent to your personal email.");
    } catch (err) {
      toast.error((err as Error).message ?? "Could not send verification code.");
    } finally {
      setSendingEmailOtp(false);
    }
  }

  async function handleVerifyPersonalPhone() {
    if (!profile?.phone || profile.phoneVerified) return;
    setSendingPhoneOtp(true);
    try {
      const result = await sendPersonalPhoneVerificationOtp();
      setPhoneVerifyCooldown(result.resendCooldownSeconds);
      setPhoneVerifyOpen(true);
      toast.success("Verification code sent to your mobile number.");
    } catch (err) {
      toast.error((err as Error).message ?? "Could not send verification code.");
    } finally {
      setSendingPhoneOtp(false);
    }
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    pendingPhotoFileRef.current = file;
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !extendedProfile) return;

    if (activeTab === "academics") {
      const hasErrors = Object.values(academicErrors).some(
        (e) => e.yearOfPassing || e.gradePercentage,
      );
      if (hasErrors) {
        toast.error("Please fix the errors in Academic Details before saving.");
        return;
      }
    }

    if (activeTab === "bank" && profile) {
      const saved = profilePageToEditable(profile, extendedProfile);
      if (
        form.accountNumber.trim() === saved.accountNumber.trim() &&
        form.accountName.trim() === saved.accountName.trim() &&
        form.bankName.trim() === saved.bankName.trim() &&
        form.branchName.trim() === saved.branchName.trim() &&
        form.ifscCode.trim() === saved.ifscCode.trim() &&
        form.isPrimaryAccount === saved.isPrimaryAccount
      ) {
        toast.success("No changes to save.");
        return;
      }
    }

    setSaving(true);
    try {
      if (pendingPhotoFileRef.current) {
        await uploadProfilePhoto(pendingPhotoFileRef.current);
        pendingPhotoFileRef.current = null;
        if (photoPreview) {
          URL.revokeObjectURL(photoPreview);
          setPhotoPreview(null);
        }
      }

      const data = await saveEmployeeProfilePage(form, extendedProfile);
      setProfile(data.profile);
      setExtendedProfile(data.extended);
      setForm(data.form);
      committedFormRef.current = data.form;
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={employeeLoadingClass}>Loading your profile…</div>;
  }

  if (error || !profile || !form) {
    return (
      <div className={`${employeeCardClass} p-8 text-center`}>
        <div className={employeeErrorBannerClass}>
          {error ?? "Profile could not be loaded."}
        </div>
        <button
          className={employeeBtnClass}
          onClick={() => void load()}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  const avatarSrc = photoPreview ?? profile.avatarUrl;
  const showActionBar = activeTab !== "employment";

  return (
    <>
      {myResignation &&
        !["ManagerRejected", "Rejected", "Withdrawn"].includes(myResignation.status) && (
          <MyResignationStrip resignation={myResignation} />
        )}
      {myExitInterview?.status === "Pending" &&
        ["ClearancesComplete", "FnFComplete", "Closed"].includes(
          myResignation?.caseStatus ?? "",
        ) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-[#FF014F] shrink-0">
            <MessageSquare className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#be185d] leading-tight m-0">
              Exit interview pending
            </p>
            <p className="text-[12px] text-[#be185d]/80 leading-tight mt-0.5 m-0">
              Please share your feedback before your last working day.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSurveyOpen(true)}
            className="ml-auto px-4 py-2 bg-[#FF014F] hover:bg-[#eb0249] text-white text-[12.5px] font-semibold rounded-lg transition-colors"
          >
            Complete Survey
          </button>
        </div>
      )}
      <form
        className={`${employeeCardClass} overflow-hidden shadow-sm`}
        onSubmit={onSave}
      >
        <div className="flex flex-col md:flex-row min-h-[620px]">
          <ProfileSidebar
            activeTab={activeTab}
            canRequestResignation={
              !myResignation ||
              ["ManagerRejected", "Rejected", "Withdrawn"].includes(myResignation.status)
            }
            onRequestSeparation={() => setExitOpen(true)}
            onTabChange={setActiveTab}
          />

          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="flex-1 px-8 py-5 overflow-y-auto">
              <ProfileSectionHeader tab={activeTab} />

              {activeTab === "profile" && (
                <div className={FORM_PANEL_CLASS}>
                  <div className="rounded-lg border border-gray-100 bg-gradient-to-br from-gray-50/80 to-[#fff1f2]/40 p-5 mb-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                      <button
                        aria-label="Upload profile photo"
                        className="relative w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-[#ec4899] to-[#be185d] flex items-center justify-center text-white text-xl font-semibold shrink-0 ring-2 ring-white shadow-md group cursor-pointer transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb9ce] focus-visible:ring-offset-2 self-center sm:self-start"
                        onClick={() => fileRef.current?.click()}
                        type="button"
                      >
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={profile.fullName}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            src={avatarSrc}
                          />
                        ) : (
                          profile.initials
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <Camera className="w-6 h-6 text-white drop-shadow-sm" />
                        </span>
                        <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#ff014f] text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
                          <Camera className="w-3.5 h-3.5" />
                        </span>
                      </button>
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5 sm:pt-1">
                        <ProfileIdentityRow
                          label="Full Name"
                          value={profile.fullName}
                        />
                        <ProfileIdentityRow
                          label="Employee ID"
                          value={profile.empId}
                        />
                        <ProfileIdentityRow
                          label="Reporting Manager"
                          value={profile.reportingManager}
                        />
                        <input
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={onPhotoChange}
                          ref={fileRef}
                          type="file"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={PROFILE_GRID_CLASS}>
                    <ReadOnlyField
                      label="User Role"
                      value={profile.authRoleLabel}
                    />
                    <ReadOnlyField
                      label="User Type"
                      value={profile.userTypeLabel}
                    />
                    <ReadOnlyField
                      label="Designation"
                      value={profile.designation}
                    />
                    <ReadOnlyField
                      label="Work Email"
                      value={profile.workEmail}
                    />
                    <VerifiedReadOnlyField
                      isVerified={profile.personalEmailVerified ?? false}
                      label="Personal Email"
                      onVerify={
                        !sendingEmailOtp
                          ? () => void handleVerifyPersonalEmail()
                          : undefined
                      }
                      value={profile.personalEmail}
                      verifyLabel="Verify Email"
                    />
                    <VerifiedReadOnlyField
                      isVerified={profile.phoneVerified ?? false}
                      label="Phone Number"
                      onVerify={
                        !sendingPhoneOtp
                          ? () => void handleVerifyPersonalPhone()
                          : undefined
                      }
                      value={profile.phone}
                      verifyLabel="Verify Mobile"
                    />
                  </div>
                </div>
              )}

              {activeTab === "contact" && (
                <div className={`${FORM_PANEL_CLASS} ${FORM_GRID_CLASS}`}>
                  <EditableField
                    helper="Used for urgent communication and emergency outreach."
                    label="Phone Number"
                    maxLength={20}
                    onChange={(v) => set("phone", v)}
                    placeholder="9999900000"
                    type="tel"
                    value={form.phone}
                  />
                  <EditableField
                    label="Personal Email"
                    maxLength={254}
                    onChange={(v) => set("personalEmail", v)}
                    placeholder="you@example.com"
                    type="email"
                    value={form.personalEmail}
                  />
                  <div
                    className={`${FORM_GRID_FULL_ROW_CLASS} grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5`}
                  >
                    <EditableTextArea
                      label="Current Address"
                      onChange={(v) => set("currentAddress", v)}
                      placeholder="House / street / city / state / PIN"
                      value={form.currentAddress}
                      maxLength={200}
                    />
                    <EditableTextArea
                      label="Permanent Address"
                      onChange={(v) => set("permanentAddress", v)}
                      placeholder="House / street / city / state / PIN"
                      value={form.permanentAddress}
                      maxLength={200}
                    />
                  </div>
                </div>
              )}

              {activeTab === "employment" && (
                <div className={FORM_PANEL_CLASS}>
                  <div className={FORM_GRID_CLASS}>
                    <ReadOnlyField
                      label="Date of Joining"
                      value={fmtDate(profile.joiningDate)}
                    />
                    <ReadOnlyField
                      label="Employment Type"
                      value={profile.employmentType}
                    />
                    <ReadOnlyField
                      label="Department"
                      value={profile.department}
                    />
                    <ReadOnlyField
                      label="Designation"
                      value={profile.designation}
                    />
                    <ReadOnlyField label="Grade" value={profile.grade} />
                    <ReadOnlyField label="Branch" value={profile.branch} />
                  </div>
                </div>
              )}

              {activeTab === "emergency" && (
                <div className={`${FORM_PANEL_CLASS} ${FORM_GRID_CLASS}`}>
                  <EditableField
                    label="Contact Name"
                    maxLength={200}
                    onChange={(v) => set("emergencyContactName", v)}
                    placeholder="Full Name"
                    value={form.emergencyContactName}
                  />
                  <EditableField
                    helper="We collect this in case of emergencies."
                    label="Contact Phone"
                    maxLength={20}
                    onChange={(v) => set("emergencyContactPhone", v)}
                    placeholder="9999900000"
                    type="tel"
                    value={form.emergencyContactPhone}
                  />
                </div>
              )}

              {activeTab === "personal" && (
                <div className={`${FORM_PANEL_CLASS} ${FORM_GRID_CLASS}`}>
                  <EditableField
                    label="Father's Name"
                    maxLength={200}
                    onChange={(v) => set("fatherName", v)}
                    placeholder="Full Name"
                    value={form.fatherName}
                  />
                  <EditableField
                    label="Mother's Name"
                    maxLength={200}
                    onChange={(v) => set("motherName", v)}
                    placeholder="Full Name"
                    value={form.motherName}
                  />
                  <EditableField
                    label="PAN Number"
                    maxLength={10}
                    onChange={(v) => set("panNumber", v)}
                    placeholder="ABCDE1234F"
                    value={form.panNumber}
                  />
                  <EditableField
                    label="Aadhaar Number"
                    maxLength={14}
                    onChange={(v) => set("aadhaarNumber", v)}
                    placeholder="1234 5678 9012"
                    value={form.aadhaarNumber}
                  />
                  <EditableField
                    label="UAN"
                    maxLength={12}
                    onChange={(v) => set("uanNumber", v)}
                    placeholder="12-digit UAN"
                    value={form.uanNumber}
                  />
                  <EditableField
                    label="ESIC"
                    maxLength={17}
                    onChange={(v) => set("esicNumber", v)}
                    placeholder="ESIC number"
                    value={form.esicNumber}
                  />
                </div>
              )}

              {activeTab === "academics" && (
                <div className={`${FORM_PANEL_CLASS} space-y-4`}>
                  {form.academics.map((a, i) => (
                    <div
                      className="rounded-lg border border-gray-100 bg-gray-50/30 overflow-hidden"
                      key={a.id}
                    >
                      <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Qualification {i + 1}
                        </span>
                        {form.academics.length > 1 && (
                          <button
                            aria-label="Remove qualification"
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600 bg-transparent border-0 cursor-pointer p-0 transition-colors"
                            onClick={() => removeAcademic(a.id)}
                            type="button"
                          >
                            <X className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className={`p-5 ${FORM_GRID_CLASS}`}>
                        <EditableField
                          label="Qualification"
                          maxLength={100}
                          onChange={(v) =>
                            updateAcademic(a.id, { qualification: v })
                          }
                          placeholder="e.g. Class 10"
                          value={a.qualification}
                        />
                        <EditableField
                          label="Institution / School"
                          maxLength={200}
                          onChange={(v) =>
                            updateAcademic(a.id, { institution: v })
                          }
                          placeholder="Name"
                          value={a.institution}
                        />
                        <EditableField
                          label="Board / University"
                          maxLength={200}
                          onChange={(v) =>
                            updateAcademic(a.id, { boardUniversity: v })
                          }
                          placeholder="e.g. CBSE"
                          value={a.boardUniversity}
                        />
                        <EditableField
                          error={academicErrors[a.id]?.yearOfPassing}
                          label="Year of Passing"
                          maxLength={4}
                          onChange={(v) =>
                            updateAcademic(a.id, { yearOfPassing: v })
                          }
                          placeholder="2018"
                          value={a.yearOfPassing}
                        />
                        <EditableField
                          error={academicErrors[a.id]?.gradePercentage}
                          label="Grade / Percentage"
                          maxLength={7}
                          onChange={(v) =>
                            updateAcademic(a.id, { gradePercentage: v })
                          }
                          placeholder="e.g. 85%"
                          value={a.gradePercentage}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    className={employeeBtnOutlineSmClass}
                    onClick={addAcademic}
                    type="button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Qualification
                  </button>
                </div>
              )}

              {activeTab === "bank" && (
                <div className={`${FORM_PANEL_CLASS} ${FORM_GRID_CLASS}`}>
                  <EditableField
                    label="Account Number"
                    maxLength={20}
                    onChange={(v) => set("accountNumber", v)}
                    placeholder="Account number"
                    value={form.accountNumber}
                  />
                  <EditableField
                    label="Account Name"
                    maxLength={100}
                    onChange={(v) => set("accountName", v)}
                    placeholder="As per bank records"
                    value={form.accountName}
                  />
                  <EditableField
                    label="Bank Name"
                    maxLength={100}
                    onChange={(v) => set("bankName", v)}
                    placeholder="e.g. HDFC Bank"
                    value={form.bankName}
                  />
                  <EditableField
                    label="Branch"
                    maxLength={100}
                    onChange={(v) => set("branchName", v)}
                    placeholder="Branch name"
                    value={form.branchName}
                  />
                  <EditableField
                    label="IFSC Code"
                    maxLength={11}
                    onChange={(v) => set("ifscCode", v)}
                    placeholder="HDFC0001234"
                    value={form.ifscCode}
                  />
                  <div className="flex items-end">
                    <label className="flex items-center gap-2.5 cursor-pointer h-[42px]">
                      <input
                        checked={form.isPrimaryAccount}
                        className="w-4 h-4 accent-[#ff014f] cursor-pointer"
                        onChange={(e) => setPrimaryAccount(e.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-sm text-gray-700">
                        Mark as primary salary account
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {showActionBar ? (
              <ProfileActionBar
                hint="Changes are saved to your employee record."
                onReset={() => setShowResetConfirm(true)}
                saving={saving}
                showReset={!TAB_META[activeTab].hrManaged}
              />
            ) : null}
          </div>
        </div>
      </form>

      {exitOpen && (
        <ResignationExitDialog
          onClose={() => setExitOpen(false)}
          onSubmitted={refreshMyResignation}
        />
      )}
      {surveyOpen && myExitInterview && (
        <ExitSurveyDialog
          response={myExitInterview}
          onClose={() => setSurveyOpen(false)}
          onSubmitted={refreshMyExitInterview}
        />
      )}
      <PersonalEmailVerificationDialog
        email={profile.personalEmail}
        initialCooldownSeconds={emailVerifyCooldown}
        onClose={() => setEmailVerifyOpen(false)}
        onVerified={async () => {
          const data = await loadEmployeeProfilePage();
          setProfile(data.profile);
          setExtendedProfile(data.extended);
          setForm(data.form);
        }}
        open={emailVerifyOpen}
      />
      <PersonalPhoneVerificationDialog
        initialCooldownSeconds={phoneVerifyCooldown}
        onClose={() => setPhoneVerifyOpen(false)}
        onVerified={async () => {
          const data = await loadEmployeeProfilePage();
          setProfile(data.profile);
          setExtendedProfile(data.extended);
          setForm(data.form);
        }}
        open={phoneVerifyOpen}
        phone={profile.phone}
      />

      {showResetConfirm &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowResetConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-[380px] shadow-[0_24px_64px_rgba(0,0,0,0.22)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-2">
                <h2 className="text-[15px] font-bold text-gray-900 leading-tight m-0">
                  Reset fields?
                </h2>
                <p className="text-[13px] text-gray-500 mt-1.5 m-0">
                  This will clear all editable fields on this page. This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2.5 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    pendingPhotoFileRef.current = null;
                    if (photoPreview) {
                      URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(null);
                    }
                    setAcademicErrors({});
                    setForm({
                      phone: "",
                      personalEmail: "",
                      currentAddress: "",
                      permanentAddress: "",
                      emergencyContactName: "",
                      emergencyContactPhone: "",
                      fatherName: "",
                      motherName: "",
                      panNumber: "",
                      aadhaarNumber: "",
                      uanNumber: "",
                      esicNumber: "",
                      academics: [
                        { id: "class-10", qualification: "Class 10", institution: "", boardUniversity: "", yearOfPassing: "", gradePercentage: "" },
                        { id: "class-12", qualification: "Class 12", institution: "", boardUniversity: "", yearOfPassing: "", gradePercentage: "" },
                      ],
                      accountNumber: "",
                      accountName: "",
                      bankName: "",
                      branchName: "",
                      ifscCode: "",
                      isPrimaryAccount: true,
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

const RESIGNATION_REASONS = [
  "Better Opportunity",
  "Relocation",
  "Personal Reasons",
  "Higher Studies",
  "Health Issues",
  "Career Change",
  "Work-Life Balance",
  "Compensation",
];

// Compact banner shown on the profile when the employee has a resignation on
// record. Mirrors the brand palette / pill styling used elsewhere.
const RESIGNATION_STATUS_STYLE: Record<
  Resignation["status"],
  { bg: string; color: string; label: string }
> = {
  Submitted: { bg: "#fef9c3", color: "#b45309", label: "Submitted — pending manager" },
  ManagerDiscussion: { bg: "#fef3c7", color: "#92400e", label: "In discussion with manager" },
  ManagerApproved: { bg: "#dbeafe", color: "#1d4ed8", label: "Manager approved — pending HR" },
  ManagerRejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected by manager" },
  HRApproved: { bg: "#dcfce7", color: "#15803d", label: "HR approved — offboarding initiated" },
  OnHold: { bg: "#f3f4f6", color: "#6b7280", label: "On hold" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
  Withdrawn: { bg: "#f3f4f6", color: "#6b7280", label: "Withdrawn" },
};

// ─── resignation flow timeline ──────────────────────────────────────────────
// The seven canonical phases an employee's resignation passes through. The
// current phase is derived from the resignation status plus, once HR approves
// and an offboarding case is spawned, the case status.
const RESIGNATION_FLOW_LABELS = [
  "Submitted",
  "Manager Review",
  "HR Review",
  "Offboarding",
  "Clearances",
  "Full & Final",
  "Closed",
] as const;

type FlowProgress = {
  doneThrough: number; // count of fully-completed steps
  current: number; // index of the in-progress step (-1 when halted/closed)
  halted: { kind: "rejected" | "withdrawn" | "hold"; label: string } | null;
  subnote: string | null;
};

function resignationFlowProgress(r: Resignation): FlowProgress {
  let doneThrough = 1;
  let current = 1;
  let halted: FlowProgress["halted"] = null;
  let subnote: string | null = null;

  switch (r.status) {
    case "Submitted":
      doneThrough = 1;
      current = 1;
      break;
    case "ManagerDiscussion":
      doneThrough = 1;
      current = 1;
      subnote = "Your manager has requested a discussion before deciding.";
      break;
    case "ManagerApproved":
      doneThrough = 2;
      current = 2;
      break;
    case "ManagerRejected":
      doneThrough = 1;
      current = -1;
      halted = { kind: "rejected", label: "Rejected by manager" };
      break;
    case "Rejected":
      doneThrough = 2;
      current = -1;
      halted = { kind: "rejected", label: "Rejected by HR" };
      break;
    case "Withdrawn":
      doneThrough = 1;
      current = -1;
      halted = { kind: "withdrawn", label: "Withdrawn" };
      break;
    case "OnHold":
      doneThrough = 2;
      current = -1;
      halted = { kind: "hold", label: "On hold" };
      break;
    case "HRApproved":
      switch (r.caseStatus) {
        case "ClearancesComplete":
          doneThrough = 4;
          current = 5;
          break;
        case "FnFComplete":
          doneThrough = 5;
          current = 6;
          break;
        case "Closed":
          doneThrough = 7;
          current = -1;
          break;
        case "OnHold":
          doneThrough = 3;
          current = -1;
          halted = { kind: "hold", label: "Case on hold" };
          break;
        default: // OffboardingInitiated (or case not yet visible)
          doneThrough = 3;
          current = 4;
          break;
      }
      break;
    default:
      doneThrough = 1;
      current = 1;
  }
  return { doneThrough, current, halted, subnote };
}

function MyResignationStrip({ resignation }: { resignation: Resignation }) {
  const s =
    RESIGNATION_STATUS_STYLE[resignation.status] ?? RESIGNATION_STATUS_STYLE.Submitted;
  const { doneThrough, current, halted, subnote } = resignationFlowProgress(resignation);

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#fff1f2] text-[#FF014F] shrink-0">
          <LogOut className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-tight m-0">
            Resignation on record
            {resignation.caseNumber ? (
              <span className="ml-2 text-[11px] font-medium text-gray-400">
                {resignation.caseNumber}
              </span>
            ) : null}
          </p>
          <p className="text-[12px] text-gray-500 leading-tight mt-0.5 m-0">
            Last working day{" "}
            {fmtStripDate(resignation.modifiedLwd ?? resignation.lastWorkingDate)}
            {resignation.reason ? ` · ${resignation.reason}` : ""}
          </p>
        </div>
        <span
          className="ml-auto text-[11.5px] font-semibold rounded-md px-2.5 py-1"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      </div>

      {/* horizontal phase stepper */}
      <div className="mt-4 flex items-start gap-0 overflow-x-auto pb-1">
        {RESIGNATION_FLOW_LABELS.map((label, i) => {
          const isDone = i < doneThrough;
          const isCurrent = i === current;
          const isHaltedHere = halted != null && i === doneThrough;
          const dotColor = isHaltedHere
            ? halted!.kind === "hold"
              ? "#6b7280"
              : "#dc2626"
            : isDone
              ? "#16a34a"
              : isCurrent
                ? "#FF014F"
                : "#d1d5db";
          const labelColor =
            isDone || isCurrent || isHaltedHere ? "#374151" : "#9ca3af";
          return (
            <div
              key={label}
              className="flex flex-col items-center min-w-[70px] relative"
            >
              {/* connector to previous step */}
              {i > 0 && (
                <span
                  className="absolute top-[9px] right-1/2 w-full h-[2px]"
                  style={{ background: i <= doneThrough ? "#16a34a" : "#e5e7eb" }}
                />
              )}
              <span
                className="relative z-10 flex items-center justify-center rounded-full"
                style={{
                  width: isCurrent || isHaltedHere ? 20 : 18,
                  height: isCurrent || isHaltedHere ? 20 : 18,
                  background: isDone ? dotColor : "#fff",
                  border: `2px solid ${dotColor}`,
                  boxShadow: isCurrent ? "0 0 0 3px #ffe4ec" : "none",
                }}
              >
                {isDone && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="4"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span
                className="mt-1.5 text-[10.5px] font-medium text-center leading-tight px-0.5"
                style={{ color: labelColor }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {(subnote || halted) && (
        <p
          className="mt-1 text-[11.5px] leading-snug m-0"
          style={{
            color: halted
              ? halted.kind === "hold"
                ? "#6b7280"
                : "#b91c1c"
              : "#92400e",
          }}
        >
          {halted ? halted.label : subnote}
        </p>
      )}
    </div>
  );
}

function fmtStripDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ResignationExitDialog({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [lwd, setLwd] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [buyout, setBuyout] = useState(false);
  const [reasons, setReasons] = useState<string[]>(RESIGNATION_REASONS);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // Load admin-configured exit reasons; fall back to the built-in list.
  useEffect(() => {
    let cancelled = false;
    listActiveExitReasons()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setReasons(rows.map((r) => r.label));
      })
      .catch(() => {
        /* keep fallback reasons */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lwd || !reason || !remarks.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitResignation({
        lastWorkingDate: lwd,
        reason,
        detailedRemark: remarks.trim(),
        buyoutRequested: buyout,
        file,
      });
      const warnings = (result.validation ?? []).filter(
        (v: ValidationItem) => v.level === "warning",
      );
      toast.success("Resignation request submitted for review.");
      if (warnings.length > 0) {
        toast.warning(warnings.map((w) => w.message).join(" "));
      }
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit resignation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4">
        <form
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
          onSubmit={submit}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-semibold text-gray-900 m-0">
                Request Resignation
              </h3>
              <p className="text-xs text-gray-500 mt-1 mb-0">
                Submit your resignation for HR review
              </p>
            </div>
            <button
              aria-label="Close"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors border-0 bg-transparent cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <X className={`${employeeIconMd} text-gray-500`} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={employeeProfileLabelClass}>
                  Last Working Day <span className="text-red-500">*</span>
                </label>
                <input
                  className={employeeInputClass}
                  onChange={(e) => setLwd(e.target.value)}
                  type="date"
                  value={lwd}
                />
              </div>
              <div>
                <label className={employeeProfileLabelClass}>
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  className={`${employeeSelectClass} ${reason ? "" : "text-gray-400"}`}
                  onChange={(e) => setReason(e.target.value)}
                  value={reason}
                >
                  <option value="">Select reason</option>
                  {reasons.map((r) => (
                    <option className="text-gray-800" key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={employeeProfileLabelClass}>
                Detailed Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`${employeeInputClass} min-h-[96px] resize-y`}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter detailed remarks..."
                rows={4}
                value={remarks}
              />
            </div>

            <div>
              <label className={employeeProfileLabelClass}>Attachment</label>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-left cursor-pointer bg-white transition-colors"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-[#fff1f2] text-[#ff014f] shrink-0">
                  <Paperclip className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-700">
                    Choose file
                  </span>
                  <span className="block text-xs text-gray-400 truncate">
                    {file?.name ?? "No file chosen"}
                  </span>
                </span>
              </button>
              <input
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                ref={fileRef}
                type="file"
              />
              <p className="text-xs text-gray-400 mt-1.5 mb-0">
                Accepted formats: PDF, JPG, PNG, WebP
              </p>
            </div>

            <div>
              <label className={employeeProfileLabelClass}>
                Notice Buyout Request
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                <input
                  checked={buyout}
                  className="w-4 h-4 accent-[#ff014f] cursor-pointer"
                  onChange={(e) => setBuyout(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm text-gray-700">
                  Yes, I want to request a notice buyout
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
            <button
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm cursor-pointer transition-colors"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${employeeBtnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
