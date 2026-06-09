"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, ChevronDown, FileCode, Check, Loader2 } from "lucide-react";
import RecipientPicker, {
  RecipientChips,
  type Recipient,
} from "./RecipientPicker";
import EmailTemplateEditor from "./EmailTemplateEditor";
import {
  fetchLookupOptions,
  NUMERIC_FIELDS,
  type LookupOption,
} from "./api/lookup-options.client";
import {
  createPolicy,
  getPolicyForLeaveType,
  updatePolicy,
  type LeavePolicy,
  type PolicyApproval,
} from "./api/leave-policies.client";
import { listLeaveTypes } from "./api/leave-types.client";

// ─── small primitives (mirror the rest of the page) ───────────────────────

function SectionCard({
  id,
  title,
  description,
  step,
  children,
}: {
  id: string;
  title: string;
  description: string;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04)] scroll-mt-24"
    >
      <header className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        {step !== undefined && (
          <span className="shrink-0 w-7 h-7 rounded-full bg-[#fff1f2] border border-[#fecdd3] text-[#be185d] text-[12px] font-bold flex items-center justify-center">
            {step}
          </span>
        )}
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
            {title}
          </h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-gray-400">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800",
        "focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] transition-shadow",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full px-3.5 py-2.5 pr-9 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
      />
    </div>
  );
}

// ─── 2. Criteria — repeatable rows ────────────────────────────────────────

type CriterionRow = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

// Smart value input — renders a dropdown populated from the matching REST
// endpoint when the field is a lookup type ("Leave Type", "Department",
// "Designation", "Employment Type"), or a number input for "Number of Days".
function CriterionValueInput({
  field,
  value,
  onChange,
}: {
  field: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isNumeric = NUMERIC_FIELDS.has(field);
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNumeric) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLookupOptions(field)
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [field, isNumeric]);

  if (isNumeric) {
    return (
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 3"
      />
    );
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || !!error}
        className="appearance-none w-full px-3.5 py-2.5 pr-9 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] disabled:bg-gray-50 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {loading
            ? `Loading ${field.toLowerCase()}s…`
            : error
              ? "Failed to load — retry"
              : `Select a ${field.toLowerCase()}…`}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {loading ? (
        <Loader2
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 animate-spin"
        />
      ) : (
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
        />
      )}
      {error && (
        <p className="text-[11px] text-rose-600 mt-1">{error}</p>
      )}
    </div>
  );
}

function CriteriaBuilder({
  rows,
  onChange,
}: {
  rows: CriterionRow[];
  onChange: (rows: CriterionRow[]) => void;
}) {
  function addRow() {
    onChange([
      ...rows,
      {
        id: String(rows.length + 1) + "_" + Math.floor(Math.random() * 9999),
        field: "Leave Type",
        operator: "is",
        value: "Casual Leave",
      },
    ]);
  }
  function updateRow(id: string, patch: Partial<CriterionRow>) {
    // When the field changes, blank the stale value — "Casual Leave" makes
    // no sense for a Department row, etc. The dropdown will repopulate from
    // the new field's API.
    const effectivePatch =
      patch.field !== undefined ? { ...patch, value: "" } : patch;
    onChange(rows.map((r) => (r.id === id ? { ...r, ...effectivePatch } : r)));
  }
  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div
          key={r.id}
          className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center bg-gray-50 border border-gray-100 rounded-xl p-3"
        >
          <span className="w-7 h-7 rounded-full bg-white border border-gray-200 text-[11px] font-bold text-gray-500 flex items-center justify-center">
            {i + 1}
          </span>
          <Select
            value={r.field}
            onChange={(v) => updateRow(r.id, { field: v })}
            options={[
              "Leave Type",
              "Number of Days",
              "Department",
              "Employment Type",
              "Designation",
            ]}
          />
          <Select
            value={r.operator}
            onChange={(v) => updateRow(r.id, { operator: v })}
            options={["is", "is not", "contains", "greater than", "less than"]}
          />
          <CriterionValueInput
            field={r.field}
            value={r.value}
            onChange={(v) => updateRow(r.id, { value: v })}
          />
          <button
            type="button"
            onClick={() => removeRow(r.id)}
            disabled={rows.length === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
            aria-label="Remove criterion"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#fda4af] text-[12.5px] font-semibold text-[#be185d] hover:bg-[#fff1f2] transition-colors"
      >
        <Plus size={14} /> Add criterion
      </button>
    </div>
  );
}

// ─── form-fields variable inserter ─────────────────────────────────────────

const VARIABLES = [
  { token: "${Employee_ID}",   label: "Employee ID" },
  { token: "${From}",          label: "From" },
  { token: "${To}",            label: "To" },
  { token: "${Leave_Type}",    label: "Leave Type" },
  { token: "${Number_of_Days}",label: "Number of Days" },
  { token: "${Reason}",        label: "Reason" },
  { token: "${Added_By}",      label: "Added By" },
  { token: "${Added_Time}",    label: "Added Time" },
];

function VariableInserterButton({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-[#be185d] hover:border-[#fda4af] hover:bg-[#fff1f2] transition-colors"
        title="Insert form-field variable"
      >
        <FileCode size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase px-3 pt-2 pb-1">
            Form fields
          </p>
          {VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => {
                onInsert(v.token);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[12.5px] text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              <span>{v.label}</span>
              <code className="text-[10px] text-gray-400">{v.token}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── recipient-field block (To / Cc / Bcc / Reply To) ─────────────────────

function RecipientField({
  label,
  recipients,
  onChange,
}: {
  label: string;
  recipients: Recipient[];
  onChange: (next: Recipient[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedIds = new Set(recipients.map((r) => r.id));

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="text-[12px] font-semibold text-gray-700">{label}</label>
      <div
        onClick={() => setPickerOpen(true)}
        className="min-h-[42px] flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors"
      >
        {recipients.length === 0 ? (
          <span className="text-[12.5px] text-gray-400">+ Add recipient</span>
        ) : (
          <RecipientChips
            items={recipients}
            onRemove={(id) => onChange(recipients.filter((r) => r.id !== id))}
          />
        )}
      </div>
      <RecipientPicker
        open={pickerOpen}
        selectedIds={selectedIds}
        onClose={() => setPickerOpen(false)}
        onCommit={onChange}
      />
    </div>
  );
}

// ─── left sidebar nav ─────────────────────────────────────────────────────

type SubKey = "approval-details" | "criteria" | "approvals" | "messages";
const SUB_NAV: { key: SubKey; label: string }[] = [
  { key: "approval-details", label: "Approval Details" },
  { key: "criteria",         label: "Criteria" },
  { key: "approvals",        label: "Approvals" },
  { key: "messages",         label: "Messages" },
];

function SubSidebar({ active }: { active: SubKey }) {
  return (
    <aside className="lg:sticky lg:top-4 bg-white border border-gray-200 rounded-2xl p-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] self-start">
      {SUB_NAV.map((it) => {
        const isActive = it.key === active;
        return (
          <a
            key={it.key}
            href={`#${it.key}`}
            className={[
              "block text-[13px] font-medium px-4 py-2.5 rounded-xl transition-colors relative",
              isActive
                ? "text-[#be185d] bg-[#fff1f2]"
                : "text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-[#FF014F]" />
            )}
            {it.label}
          </a>
        );
      })}
    </aside>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────

export default function ApprovalSection() {
  // 1. Approval details
  const [formName] = useState("Leave");
  const [approvalName, setApprovalName] = useState("Auto-approval for short leaves");
  const [desc, setDesc] = useState("");

  // 2. Criteria
  const [criteria, setCriteria] = useState<CriterionRow[]>([
    { id: "c1", field: "Leave Type", operator: "is", value: "Casual Leave" },
  ]);

  // 3. Approvals — outcome when criteria are satisfied
  const [outcome, setOutcome] = useState<"auto-approve" | "auto-reject">("auto-approve");

  // 4. Messages
  const [fromMode, setFromMode] = useState("Person performing this action");
  const [toRecipients, setToRecipients] = useState<Recipient[]>([
    { category: "fields", id: "field:employee_id", label: "Employee ID" },
  ]);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([]);
  const [bccRecipients, setBccRecipients] = useState<Recipient[]>([]);
  const [replyToRecipients, setReplyToRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState("Your request has been approved");
  const [body, setBody] = useState(
    "Hi ${Employee_ID},\n\nYour request has been automatically approved. Click here to view the record details.",
  );
  // Email template editor modal — opened from the "Open Editor" button below.
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  // Tracks which section is "active" in the sidebar — minimal version uses
  // the first one. Could be replaced with a scroll-spy useEffect later.
  const [activeSub] = useState<SubKey>("approval-details");

  function insertVariableIntoBody(token: string) {
    setBody((b) => b + " " + token);
  }
  function insertVariableIntoSubject(token: string) {
    setSubject((s) => s + " " + token);
  }

  // ─── load/save wiring ───────────────────────────────────────────────────
  //
  // Each Approval workflow is bound to a policy. To make this section work
  // standalone without forcing HR to first create a policy on the Comp Off
  // tab, we attach the workflow to the policy whose `leaveTypeCode` matches
  // the first Criterion's "Leave Type" value. If no policy exists for that
  // leave type, we create a minimal one.
  //
  // First-row criterion "Casual Leave" → look for a CL policy. If none,
  // create one named "Casual Leave Policy" with empty settings, then attach
  // this approval workflow to it.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [existingPolicy, setExistingPolicy] = useState<LeavePolicy | null>(null);
  const [existingWorkflowIndex, setExistingWorkflowIndex] = useState<number>(-1);

  function policyLeaveTypeFromCriteria(): string {
    // Use the first criterion that targets "Leave Type" to decide which
    // leave-type-bound policy to attach to. Fallback: CL.
    const ltRow = criteria.find((c) => c.field === "Leave Type");
    return ltRow?.value || "Casual Leave";
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const types = await listLeaveTypes();
      // Pick a policy to display. Without UI to choose a policy yet, we
      // default to the first Active CL policy or the first one we find.
      let policy: LeavePolicy | null = await getPolicyForLeaveType("CL");
      if (!policy) {
        // Fall back to anything
        for (const t of types) {
          policy = await getPolicyForLeaveType(t.code);
          if (policy) break;
        }
      }
      if (policy) {
        setExistingPolicy(policy);
        // If any approval workflow already exists, hydrate the form from
        // the first one. Multi-workflow editing is a follow-up.
        const wf = policy.approvals[0];
        if (wf) {
          setExistingWorkflowIndex(0);
          setApprovalName(wf.name);
          setDesc(wf.description ?? "");
          // Restore criteria — give each row a fresh local id.
          setCriteria(
            wf.criteria.length > 0
              ? wf.criteria.map((c, i) => ({
                  id: `c-${i}-${Math.floor(Math.random() * 9999)}`,
                  field: c.field,
                  operator: c.operator,
                  value: c.value,
                }))
              : [{ id: "c1", field: "Leave Type", operator: "is", value: "Casual Leave" }],
          );
          setOutcome(wf.outcome === "AutoReject" ? "auto-reject" : "auto-approve");
          setFromMode(wf.fromMode);
          setToRecipients(wf.toRecipients);
          setCcRecipients(wf.ccRecipients);
          setBccRecipients(wf.bccRecipients);
          setReplyToRecipients(wf.replyToRecipients);
          setSubject(wf.subject);
          setBody(wf.body);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const types = await listLeaveTypes();
      // Find the leave-type to anchor this policy on.
      const ltValue = policyLeaveTypeFromCriteria();
      const targetType =
        types.find(
          (t) => t.name.toLowerCase() === ltValue.toLowerCase(),
        ) ?? types.find((t) => t.code === "CL");
      if (!targetType) {
        throw new Error(
          "No matching leave type found for criteria. Create the leave type in Master Leave Types first.",
        );
      }

      // Build the workflow record from current form state.
      const workflow: PolicyApproval = {
        name: approvalName,
        description: desc || null,
        criteria: criteria.map((r) => ({
          field: r.field,
          operator: r.operator,
          value: r.value,
        })),
        outcome: outcome === "auto-reject" ? "AutoReject" : "AutoApprove",
        fromMode,
        toRecipients,
        ccRecipients,
        bccRecipients,
        replyToRecipients,
        subject,
        body,
        isActive: true,
      };

      // Resolve which policy this workflow attaches to.
      let policy = await getPolicyForLeaveType(targetType.code);
      let approvals: PolicyApproval[];
      if (!policy) {
        // Fresh: create a minimal policy + this approval workflow.
        policy = await createPolicy({
          leaveTypeId: targetType.id,
          name: `${targetType.name} Policy`,
          status: "Active",
          isDefault: true,
          settings: {},
          scope: [{ scopeType: "Company", scopeId: null, priority: 100 }],
          approvals: [workflow],
        });
        approvals = policy.approvals;
      } else {
        // Replace the existing workflow at the same index, or append.
        approvals = [...policy.approvals];
        if (existingWorkflowIndex >= 0 && existingWorkflowIndex < approvals.length) {
          approvals[existingWorkflowIndex] = workflow;
        } else {
          approvals.push(workflow);
        }
        policy = await updatePolicy(policy.id, { approvals });
      }
      setExistingPolicy(policy);
      const idx = policy.approvals.findIndex((a) => a.name === workflow.name);
      setExistingWorkflowIndex(idx >= 0 ? idx : 0);
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(null), 2400);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5">
      <SubSidebar active={activeSub} />

      <div className="flex flex-col gap-5 min-w-0">
        {/* 1. Approval details */}
        <SectionCard
          id="approval-details"
          step={1}
          title="Approval Details"
          description="Basic details of the approval."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Form name" required>
              <Input
                value={formName}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
            </Field>
            <Field label="Approval name" required>
              <Input
                value={approvalName}
                onChange={(e) => setApprovalName(e.target.value)}
                placeholder="e.g. Auto-approval for casual leaves"
              />
            </Field>
            <div className="md:col-span-2">
              <Field
                label="Description"
                hint="Optional. Shown to admins and auditors."
              >
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe when this approval should kick in…"
                  className="px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none"
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* 2. Criteria */}
        <SectionCard
          id="criteria"
          step={2}
          title="Criteria"
          description="The workflow will be triggered when these conditions are satisfied. You can add more than one."
        >
          <CriteriaBuilder rows={criteria} onChange={setCriteria} />
        </SectionCard>

        {/* 3. Approvals (Auto Approve / Auto Reject) */}
        <SectionCard
          id="approvals"
          step={3}
          title="Approvals"
          description="When the criteria are satisfied, what happens to the request."
        >
          <div className="flex items-center justify-center gap-8 py-2">
            <OutcomeRadio
              checked={outcome === "auto-approve"}
              tone="approve"
              onClick={() => setOutcome("auto-approve")}
              label="Auto Approve"
            />
            <span className="text-[12px] font-bold text-gray-400">(OR)</span>
            <OutcomeRadio
              checked={outcome === "auto-reject"}
              tone="reject"
              onClick={() => setOutcome("auto-reject")}
              label="Auto Reject"
            />
          </div>
        </SectionCard>

        {/* 4. Messages */}
        <SectionCard
          id="messages"
          step={4}
          title="Messages"
          description="Configure the email sent when this approval fires."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* From */}
            <Field label="From" required>
              <Select
                value={fromMode}
                onChange={setFromMode}
                options={[
                  "Person performing this action",
                  "Workflow admin",
                  "Custom address",
                ]}
              />
            </Field>

            {/* Add recipient row */}
            <Field label="Add" hint="Click + to expand a recipient row below.">
              <div className="flex flex-wrap gap-2">
                {(["Cc", "Bcc", "Reply To"] as const).map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200"
                  >
                    + {label}
                  </span>
                ))}
              </div>
            </Field>

            {/* To */}
            <div className="md:col-span-2">
              <RecipientField
                label="To"
                recipients={toRecipients}
                onChange={setToRecipients}
              />
            </div>
            <div className="md:col-span-1">
              <RecipientField
                label="Cc"
                recipients={ccRecipients}
                onChange={setCcRecipients}
              />
            </div>
            <div className="md:col-span-1">
              <RecipientField
                label="Bcc"
                recipients={bccRecipients}
                onChange={setBccRecipients}
              />
            </div>
            <div className="md:col-span-2">
              <RecipientField
                label="Reply To"
                recipients={replyToRecipients}
                onChange={setReplyToRecipients}
              />
            </div>

            {/* Subject — with variable inserter */}
            <div className="md:col-span-2">
              <Field label="Subject" required>
                <div className="flex items-center gap-2">
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex-1"
                  />
                  <VariableInserterButton onInsert={insertVariableIntoSubject} />
                </div>
              </Field>
            </div>

            {/* Body — with variable inserter */}
            <div className="md:col-span-2">
              <Field label="Body" required>
                <div className="flex items-start gap-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none font-mono"
                  />
                  <VariableInserterButton onInsert={insertVariableIntoBody} />
                </div>
              </Field>
            </div>

            {/* Edit Email Template */}
            <div className="md:col-span-2 flex items-center justify-between bg-[#fff1f2] border border-[#fecdd3] rounded-xl px-4 py-3">
              <div>
                <p className="text-[12.5px] font-semibold text-[#be185d]">
                  Edit Email Template
                </p>
                <p className="text-[11.5px] text-[#be185d]/80 mt-0.5">
                  Use form-field variables like <code>${"{Employee_ID}"}</code> to
                  personalise the email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateEditorOpen(true)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
              >
                Open Editor
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Email template editor — full modal */}
        <EmailTemplateEditor
          open={templateEditorOpen}
          subject={subject}
          body={body}
          onSave={({ subject: s, body: b }) => {
            setSubject(s);
            setBody(b);
          }}
          onClose={() => setTemplateEditorOpen(false)}
        />

        {/* Save bar — persists this workflow to /api/admin/leave-policies.
            The workflow is attached to the policy of the leave-type used in
            the first Criterion row. */}
        <div className="flex items-center justify-end gap-3 pt-1">
          {error && (
            <span className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
              {error}
            </span>
          )}
          {saveMsg && (
            <span className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              {saveMsg}
            </span>
          )}
          {loading && (
            <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Loading existing
              workflow…
            </span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading || saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {existingWorkflowIndex >= 0 ? "Update Approval" : "Save Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutcomeRadio({
  checked,
  tone,
  onClick,
  label,
}: {
  checked: boolean;
  tone: "approve" | "reject";
  onClick: () => void;
  label: string;
}) {
  const accent = tone === "approve" ? "#10b981" : "#ef4444";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all",
        checked
          ? "bg-white shadow-sm"
          : "bg-gray-50 border-transparent hover:bg-white hover:border-gray-200",
      ].join(" ")}
      style={
        checked
          ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}22` }
          : undefined
      }
    >
      <span
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: checked ? accent : "#d1d5db" }}
      >
        {checked && <Check size={12} color={accent} strokeWidth={3} />}
      </span>
      <span
        className="text-[13.5px] font-bold"
        style={{ color: checked ? accent : "#374151" }}
      >
        {label}
      </span>
    </button>
  );
}
