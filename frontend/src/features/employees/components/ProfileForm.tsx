"use client";

import { Camera, Lock, LogOut, Paperclip, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchMyProfile,
  type MyProfile,
  updateMyProfile,
} from "@/lib/hrms-client";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeCardClass,
  employeeErrorBannerClass,
  employeeFormSectionBodyClass,
  employeeFormSectionClass,
  employeeFormSectionDescClass,
  employeeFormSectionHeaderClass,
  employeeFormSectionsGridClass,
  employeeFormSectionTitleClass,
  employeeLoadingClass,
} from "../employee-theme";
import EmployeeFormSection from "./EmployeeFormSection";

const labelClass =
  "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

const editableInputClass =
  "w-full max-w-[260px] px-2.5 py-1.5 border border-gray-300 rounded-sm text-[13px] text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#ffb9ce] focus:border-transparent transition-colors";

// Greyed-out, HR/admin-only fields: muted background, no focus ring,
// disabled cursor, and not focusable.
const readonlyInputClass =
  "w-full max-w-[260px] px-2.5 py-1.5 border border-gray-200 rounded-sm text-[13px] text-gray-500 bg-gray-100 cursor-not-allowed select-none focus:outline-none";

function ReadOnlyField({
  label,
  value,
  span2 = false,
}: {
  label: string;
  value: string | null | undefined;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "min-w-0 md:col-span-2" : "min-w-0"}>
      <label className={labelClass}>
        <span className="inline-flex items-center gap-1">
          {label}
          <Lock className="w-3 h-3 text-gray-400" />
        </span>
      </label>
      <input
        className={readonlyInputClass}
        disabled
        readOnly
        tabIndex={-1}
        value={value ?? "—"}
      />
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  span2 = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "min-w-0 md:col-span-2" : "min-w-0"}>
      <label className={labelClass}>{label}</label>
      <input
        className={editableInputClass}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </div>
  );
}

function EditableTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      <textarea
        className={`${editableInputClass} min-h-[80px] resize-y`}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
    </div>
  );
}

type Qualification = {
  id: string;
  qualification: string;
  institution: string;
  boardUniversity: string;
  yearOfPassing: string;
  gradePercentage: string;
};

type EditableState = {
  // Contact details — persisted via the API.
  phone: string;
  personalEmail: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  // Personal & Compliance — frontend-only for now.
  fatherName: string;
  motherName: string;
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esicNumber: string;
  // Academic details — dynamic array, frontend-only for now.
  academics: Qualification[];
  // Bank details — frontend-only for now.
  accountNumber: string;
  accountName: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  isPrimaryAccount: boolean;
};

// String-valued keys only — keeps the generic `set` helper type-safe.
// (academics + isPrimaryAccount get their own dedicated handlers.)
type StringFieldKey = {
  [K in keyof EditableState]: EditableState[K] extends string ? K : never;
}[keyof EditableState];

// Seeds the academics array with the two qualifications every profile has.
function defaultAcademics(): Qualification[] {
  return [
    {
      id: "class-10",
      qualification: "Class 10",
      institution: "",
      boardUniversity: "",
      yearOfPassing: "",
      gradePercentage: "",
    },
    {
      id: "class-12",
      qualification: "Class 12",
      institution: "",
      boardUniversity: "",
      yearOfPassing: "",
      gradePercentage: "",
    },
  ];
}

function toEditable(p: MyProfile): EditableState {
  return {
    phone: p.phone ?? "",
    personalEmail: p.personalEmail ?? "",
    currentAddress: p.currentAddress ?? "",
    permanentAddress: p.permanentAddress ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
    fatherName: "",
    motherName: "",
    panNumber: "",
    aadhaarNumber: "",
    uanNumber: "",
    esicNumber: "",
    academics: defaultAcademics(),
    accountNumber: "",
    accountName: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
    isPrimaryAccount: false,
  };
}

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

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<EditableState | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyProfile();
      setProfile(data);
      setForm(toEditable(data));
    } catch (e) {
      setError((e as Error).message ?? "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Revoke any object URL we created for the photo preview on unmount.
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

  function updateAcademic(id: string, patch: Partial<Qualification>) {
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

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      // Persist the API-backed contact fields.
      await updateMyProfile({
        phone: form.phone.trim(),
        personalEmail: form.personalEmail.trim(),
        currentAddress: form.currentAddress.trim(),
        permanentAddress: form.permanentAddress.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
      });

      // Personal & Compliance, Academics and Bank details are captured in
      // local state and ready for backend wiring (frontend-only for now).
      const pendingFrontendOnly = {
        personal: {
          fatherName: form.fatherName.trim(),
          motherName: form.motherName.trim(),
        },
        compliance: {
          panNumber: form.panNumber.trim(),
          aadhaarNumber: form.aadhaarNumber.trim(),
          uanNumber: form.uanNumber.trim(),
          esicNumber: form.esicNumber.trim(),
        },
        academics: form.academics,
        bank: {
          accountNumber: form.accountNumber.trim(),
          accountName: form.accountName.trim(),
          bankName: form.bankName.trim(),
          branchName: form.branchName.trim(),
          ifscCode: form.ifscCode.trim(),
          isPrimary: form.isPrimaryAccount,
        },
      };
      console.debug("[profile] pending (not yet persisted):", pendingFrontendOnly);

      toast.success("Profile updated.");
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

  return (
    <>
    <form className={`${employeeCardClass} overflow-hidden`} onSubmit={onSave}>
      <div className="p-6">
        <div className={employeeFormSectionsGridClass}>
          <EmployeeFormSection
            description="Identity details managed by HR. These cannot be edited here."
            title="Basic Information"
          >
            {/* Profile photo */}
            <div className="md:col-span-2 flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={profile.fullName}
                    className="w-full h-full object-cover"
                    src={avatarSrc}
                  />
                ) : (
                  profile.initials
                )}
              </div>
              <div>
                <button
                  className={employeeBtnOutlineSmClass}
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Change Photo
                </button>
                <input
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={onPhotoChange}
                  ref={fileRef}
                  type="file"
                />
                <p className="text-xs text-gray-400 mt-1.5 mb-0">
                  JPG or PNG, up to 2&nbsp;MB.
                </p>
              </div>
            </div>

            <ReadOnlyField label="Employee ID" value={profile.empId} />
            <ReadOnlyField label="Full Name" value={profile.fullName} />
            <ReadOnlyField label="Work Email" value={profile.workEmail} span2 />
          </EmployeeFormSection>

          <section className={employeeFormSectionClass}>
            <div className={employeeFormSectionHeaderClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className={employeeFormSectionTitleClass}>
                    Contact Details
                  </h3>
                  <p className={employeeFormSectionDescClass}>
                    Your contact details. You can update these yourself.
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#dc2626] bg-white border border-[#fca5a5] rounded-lg hover:bg-[#fef2f2] transition-colors cursor-pointer shrink-0"
                  onClick={() => setExitOpen(true)}
                  type="button"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>
            </div>
            <div className={employeeFormSectionBodyClass}>
              <EditableField
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
          </section>

          <EmployeeFormSection
            dense
            description="Job placement and reporting line. Managed by HR/admin."
            title="Employment Details"
          >
            <ReadOnlyField
              label="Date of Joining"
              value={fmtDate(profile.joiningDate)}
            />
            <ReadOnlyField label="Department" value={profile.department} />
            <ReadOnlyField label="Designation" value={profile.designation} />
            <ReadOnlyField
              label="Employment Type"
              value={profile.employmentType}
            />
            <ReadOnlyField
              label="Reporting Manager"
              value={profile.reportingManager}
            />
          </EmployeeFormSection>

          <EmployeeFormSection
            description="Who we should reach in case of an emergency."
            title="Emergency Contact"
          >
            <EditableField
              label="Contact Name"
              onChange={(v) => set("emergencyContactName", v)}
              placeholder="Full name"
              value={form.emergencyContactName}
            />
            <EditableField
              label="Contact Phone"
              onChange={(v) => set("emergencyContactPhone", v)}
              placeholder="9999900000"
              type="tel"
              value={form.emergencyContactPhone}
            />
          </EmployeeFormSection>
        </div>

        <div className="mt-5 space-y-5">
          {/* ── Personal & Compliance ───────────────────────────────── */}
          <EmployeeFormSection
            dense
            description="Family and statutory identifiers."
            title="Personal & Compliance"
          >
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
          </EmployeeFormSection>

          {/* ── Academic Details (dynamic array) ────────────────────── */}
          <section className={employeeFormSectionClass}>
            <div className={employeeFormSectionHeaderClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className={employeeFormSectionTitleClass}>
                    Academic Details
                  </h3>
                  <p className={employeeFormSectionDescClass}>
                    Your educational qualifications.
                  </p>
                </div>
                <button
                  className={employeeBtnOutlineSmClass}
                  onClick={addAcademic}
                  type="button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add qualification
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              {form.academics.map((a, i) => (
                <div
                  className="border border-gray-200 rounded-lg p-4"
                  key={a.id}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Qualification {i + 1}
                    </span>
                    {form.academics.length > 1 && (
                      <button
                        aria-label="Remove qualification"
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer p-0 transition-colors"
                        onClick={() => removeAcademic(a.id)}
                        type="button"
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <EditableField
                      label="Qualification"
                      onChange={(v) => updateAcademic(a.id, { qualification: v })}
                      placeholder="e.g. Class 10"
                      value={a.qualification}
                    />
                    <EditableField
                      label="Institution / School"
                      onChange={(v) => updateAcademic(a.id, { institution: v })}
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
                      onChange={(v) => updateAcademic(a.id, { yearOfPassing: v })}
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
            </div>
          </section>

          {/* ── Bank Details ────────────────────────────────────────── */}
          <EmployeeFormSection
            dense
            description="Salary account details."
            title="Bank Details"
          >
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
            <div className="min-w-0 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  checked={form.isPrimaryAccount}
                  className="w-4 h-4 accent-[#FF014F] cursor-pointer"
                  onChange={(e) => setPrimaryAccount(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-[13px] text-gray-700">
                  Primary account
                </span>
              </label>
            </div>
          </EmployeeFormSection>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button
          className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          disabled={saving}
          onClick={() => setForm(toEditable(profile))}
          type="button"
        >
          Reset
        </button>
        <button
          className={`${employeeBtnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
    {exitOpen && <ResignationExitDialog onClose={() => setExitOpen(false)} />}
    </>
  );
}

// ── Exit → Resignation dialog (frontend-only, no API) ─────────────────────────

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

const dlgLabelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
const dlgControlClass =
  "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors";

function ResignationExitDialog({ onClose }: { onClose: () => void }) {
  const [lwd, setLwd] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [buyout, setBuyout] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="w-full max-w-[640px] bg-white rounded-xl border border-gray-400 shadow-2xl overflow-hidden"
        onSubmit={submit}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 m-0">Resignation</h2>
          <button
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer p-0"
            onClick={onClose}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={dlgLabelClass}>
                Last Working Day <span className="text-red-500">*</span>
              </label>
              <input
                className={dlgControlClass}
                onChange={(e) => setLwd(e.target.value)}
                type="date"
                value={lwd}
              />
            </div>
            <div>
              <label className={dlgLabelClass}>
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                className={`${dlgControlClass} cursor-pointer ${reason ? "" : "text-gray-400"}`}
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
            <label className={dlgLabelClass}>
              Detailed Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`${dlgControlClass} min-h-[96px] resize-y`}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter detailed remarks..."
              rows={4}
              value={remarks}
            />
          </div>

          <div>
            <label className={dlgLabelClass}>Attachment</label>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-left cursor-pointer bg-white transition-colors"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-50 text-blue-500 shrink-0">
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
            <label className={dlgLabelClass}>Notice Buyout Request</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                checked={buyout}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
                onChange={(e) => setBuyout(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm text-gray-700">
                Yes, I want to request a notice buyout
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
            type="submit"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
