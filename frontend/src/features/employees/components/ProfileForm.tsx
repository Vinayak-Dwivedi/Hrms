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
  Paperclip,
  Phone,
  Plus,
  Shield,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  employeeFilterLabelClass,
  employeeIconMd,
  employeeInputClass,
  employeeLoadingClass,
  employeeSelectClass,
} from "../employee-theme";

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
      <label className={employeeFilterLabelClass}>
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
  "mt-1.5 text-[11px] font-semibold text-[#FF014F] hover:text-[#be185d] bg-transparent border-0 p-0 cursor-pointer inline-block";

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
      <label className={employeeFilterLabelClass}>
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

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div>
      <label className={employeeFilterLabelClass}>{label}</label>
      <input
        className={editableInputClass}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {helper ? (
        <p className="text-xs text-gray-400 mt-1.5 mb-0 leading-relaxed">
          {helper}
        </p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? FORM_GRID_FULL_ROW_CLASS : undefined}>
      <label className={employeeFilterLabelClass}>{label}</label>
      <textarea
        className={`${editableInputClass} min-h-[96px] resize-y`}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
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
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onRequestSeparation: () => void;
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
                        ? "border-l-[#FF014F] bg-gray-50 text-gray-900"
                        : "border-l-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    key={id}
                    onClick={() => onTabChange(id)}
                    type="button"
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active ? "text-[#FF014F]" : "text-gray-400"}`}
                    />
                    <span className="flex-1 text-left truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

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
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
  const [emailVerifyCooldown, setEmailVerifyCooldown] = useState(60);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [phoneVerifyCooldown, setPhoneVerifyCooldown] = useState(60);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingPhotoFileRef = useRef<File | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await loadEmployeeProfilePage();
      setProfile(data.profile);
      setExtendedProfile(data.extended);
      setForm(data.form);
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
  }

  function addAcademic() {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            academics: [
              ...prev.academics,
              {
                id: crypto.randomUUID(),
                qualification: "",
                institution: "",
                boardUniversity: "",
                yearOfPassing: "",
                gradePercentage: "",
              },
            ],
          }
        : prev,
    );
  }

  function removeAcademic(id: string) {
    setForm((prev) =>
      prev
        ? { ...prev, academics: prev.academics.filter((a) => a.id !== id) }
        : prev,
    );
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
      <form
        className={`${employeeCardClass} overflow-hidden shadow-sm`}
        onSubmit={onSave}
      >
        <div className="flex flex-col md:flex-row min-h-[620px]">
          <ProfileSidebar
            activeTab={activeTab}
            onRequestSeparation={() => setExitOpen(true)}
            onTabChange={setActiveTab}
          />

          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="flex-1 px-8 py-5 overflow-y-auto">
              <ProfileSectionHeader tab={activeTab} />

              {activeTab === "profile" && (
                <div className={FORM_PANEL_CLASS}>
                  <div className="rounded-lg border border-gray-100 bg-gradient-to-br from-gray-50/80 to-[#fff1f2]/40 p-4 mb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <button
                        aria-label="Upload profile photo"
                        className="relative w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-[#ec4899] to-[#be185d] flex items-center justify-center text-white text-xl font-semibold shrink-0 ring-2 ring-white shadow-md group cursor-pointer transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb9ce] focus-visible:ring-offset-2"
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
                        <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FF014F] text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
                          <Camera className="w-3.5 h-3.5" />
                        </span>
                      </button>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className={`${employeeFilterLabelClass} mb-1`}>
                            Employee ID
                          </p>
                          <p className="text-sm font-semibold text-gray-900 m-0">
                            {profile.empId ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className={`${employeeFilterLabelClass} mb-1`}>
                            Full Name
                          </p>
                          <p className="text-sm font-semibold text-gray-900 m-0">
                            {profile.fullName ?? "—"}
                          </p>
                        </div>
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
                    onChange={(v) => set("phone", v)}
                    placeholder="9999900000"
                    type="tel"
                    value={form.phone}
                  />
                  <EditableField
                    label="Personal Email"
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
                    />
                    <EditableTextArea
                      label="Permanent Address"
                      onChange={(v) => set("permanentAddress", v)}
                      placeholder="House / street / city / state / PIN"
                      value={form.permanentAddress}
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
                    <div className={FORM_GRID_FULL_ROW_CLASS}>
                      <ReadOnlyField
                        label="Reporting Manager"
                        value={profile.reportingManager}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "emergency" && (
                <div className={`${FORM_PANEL_CLASS} ${FORM_GRID_CLASS}`}>
                  <EditableField
                    label="Contact Name"
                    onChange={(v) => set("emergencyContactName", v)}
                    placeholder="Full name"
                    value={form.emergencyContactName}
                  />
                  <EditableField
                    helper="We collect this in case of emergencies."
                    label="Contact Phone"
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
                    onChange={(v) => set("fatherName", v)}
                    placeholder="Full name"
                    value={form.fatherName}
                  />
                  <EditableField
                    label="Mother's Name"
                    onChange={(v) => set("motherName", v)}
                    placeholder="Full name"
                    value={form.motherName}
                  />
                  <EditableField
                    label="PAN Number"
                    onChange={(v) => set("panNumber", v)}
                    placeholder="ABCDE1234F"
                    value={form.panNumber}
                  />
                  <EditableField
                    label="Aadhaar Number"
                    onChange={(v) => set("aadhaarNumber", v)}
                    placeholder="1234 5678 9012"
                    value={form.aadhaarNumber}
                  />
                  <EditableField
                    label="UAN"
                    onChange={(v) => set("uanNumber", v)}
                    placeholder="12-digit UAN"
                    value={form.uanNumber}
                  />
                  <EditableField
                    label="ESIC"
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
                          onChange={(v) =>
                            updateAcademic(a.id, { qualification: v })
                          }
                          placeholder="e.g. Class 10"
                          value={a.qualification}
                        />
                        <EditableField
                          label="Institution / School"
                          onChange={(v) =>
                            updateAcademic(a.id, { institution: v })
                          }
                          placeholder="Name"
                          value={a.institution}
                        />
                        <EditableField
                          label="Board / University"
                          onChange={(v) =>
                            updateAcademic(a.id, { boardUniversity: v })
                          }
                          placeholder="e.g. CBSE"
                          value={a.boardUniversity}
                        />
                        <EditableField
                          label="Year of Passing"
                          onChange={(v) =>
                            updateAcademic(a.id, { yearOfPassing: v })
                          }
                          placeholder="2018"
                          value={a.yearOfPassing}
                        />
                        <EditableField
                          label="Grade / Percentage"
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
                    onChange={(v) => set("accountNumber", v)}
                    placeholder="Account number"
                    value={form.accountNumber}
                  />
                  <EditableField
                    label="Account Name"
                    onChange={(v) => set("accountName", v)}
                    placeholder="As per bank records"
                    value={form.accountName}
                  />
                  <EditableField
                    label="Bank Name"
                    onChange={(v) => set("bankName", v)}
                    placeholder="e.g. HDFC Bank"
                    value={form.bankName}
                  />
                  <EditableField
                    label="Branch"
                    onChange={(v) => set("branchName", v)}
                    placeholder="Branch name"
                    value={form.branchName}
                  />
                  <EditableField
                    label="IFSC Code"
                    onChange={(v) => set("ifscCode", v)}
                    placeholder="HDFC0001234"
                    value={form.ifscCode}
                  />
                  <div className="flex items-end">
                    <label className="flex items-center gap-2.5 cursor-pointer h-[42px]">
                      <input
                        checked={form.isPrimaryAccount}
                        className="w-4 h-4 accent-[#FF014F] cursor-pointer"
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
                hint={
                  TAB_META[activeTab].hrManaged
                    ? "Profile photo is saved when you click Save Changes."
                    : "Changes are saved to your employee record."
                }
                onReset={() => {
                  pendingPhotoFileRef.current = null;
                  if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                    setPhotoPreview(null);
                  }
                  if (profile && extendedProfile) {
                    setForm(profilePageToEditable(profile, extendedProfile));
                  }
                }}
                saving={saving}
                showReset={!TAB_META[activeTab].hrManaged}
              />
            ) : null}
          </div>
        </div>
      </form>

      {exitOpen && <ResignationExitDialog onClose={() => setExitOpen(false)} />}
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

function ResignationExitDialog({ onClose }: { onClose: () => void }) {
  const [lwd, setLwd] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [buyout, setBuyout] = useState(false);
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lwd || !reason || !remarks.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    toast.success("Resignation request submitted.");
    onClose();
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
                <label className={employeeFilterLabelClass}>
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
                <label className={employeeFilterLabelClass}>
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  className={`${employeeSelectClass} ${reason ? "" : "text-gray-400"}`}
                  onChange={(e) => setReason(e.target.value)}
                  value={reason}
                >
                  <option value="">Select reason</option>
                  {RESIGNATION_REASONS.map((r) => (
                    <option className="text-gray-800" key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={employeeFilterLabelClass}>
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
              <label className={employeeFilterLabelClass}>Attachment</label>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-left cursor-pointer bg-white transition-colors"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-[#fff1f2] text-[#FF014F] shrink-0">
                  <Paperclip className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-700">
                    Choose file
                  </span>
                  <span className="block text-xs text-gray-400 truncate">
                    {fileName ?? "No file chosen"}
                  </span>
                </span>
              </button>
              <input
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                ref={fileRef}
                type="file"
              />
            </div>

            <div>
              <label className={employeeFilterLabelClass}>
                Notice Buyout Request
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                <input
                  checked={buyout}
                  className="w-4 h-4 accent-[#FF014F] cursor-pointer"
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
            <button className={employeeBtnClass} type="submit">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
