"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  createPolicy,
  getPolicyForLeaveType,
  updatePolicy,
  type LeavePolicy,
  type PolicyScope,
  type ScopeType,
} from "./api/leave-policies.client";
import { listLeaveTypes } from "./api/leave-types.client";

// ─── shared building blocks ─────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  step,
  children,
  action,
}: {
  title: string;
  description: string;
  step?: number;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
        <div className="flex items-start gap-3">
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
        </div>
        {action}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? 36 : 44;
  const h = size === "sm" ? 20 : 24;
  const dot = size === "sm" ? 14 : 18;
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-[#FF014F]" : "bg-gray-300",
      ].join(" ")}
      style={{ width: w, height: h }}
      aria-pressed={checked}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow-sm transition-[left] duration-200"
        style={{
          width: dot,
          height: dot,
          left: checked ? w - dot - 3 : 3,
        }}
      />
    </button>
  );
}

function CheckPill({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-medium border transition-all duration-150",
        checked
          ? "bg-[#fff1f2] border-[#fda4af] text-[#be185d] shadow-sm"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
      ].join(" ")}
    >
      <span
        className={[
          "w-3.5 h-3.5 rounded-[5px] border flex items-center justify-center transition-colors",
          checked ? "bg-[#FF014F] border-[#FF014F]" : "bg-white border-gray-300",
        ].join(" ")}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.5l2.5 2.5L10 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}

function RowToggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-800">{title}</p>
        <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── filter group ──────────────────────────────────────────────────────────

const BRANCHES = ["All Branches", "HQ Mumbai", "Bangalore Branch", "Delhi Branch"];
const DEPARTMENTS = ["All Departments", "Engineering", "Sales", "Human Resources", "Operations"];
const DESIGNATIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Principal Architect",
  "Sales Representative",
  "Sales Manager",
  "HR Executive",
];
const CONTRACTS = ["Full-Time Permanent", "Contract Staff", "Intern / Apprentice"];
const PROCESSES = ["QA & Testing", "Product Development", "Inside Sales", "Field Sales"];

function FilterRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (o: string) => void;
}) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <p className="text-[12px] font-bold tracking-wider text-gray-500 uppercase mb-3">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <CheckPill
            key={opt}
            checked={selected.has(opt)}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </CheckPill>
        ))}
      </div>
    </div>
  );
}

// ─── main ──────────────────────────────────────────────────────────────────

export default function CompOffSection() {
  const [enabled, setEnabled] = useState(true);
  // 1. Mode of requests
  const [manualReq, setManualReq] = useState(true);
  // 2. Restrictions
  const [duration, setDuration] = useState({
    full: true,
    half: true,
    quarter: false,
    hourly: false,
  });
  const [allowFuture, setAllowFuture] = useState(true);
  const [includeTime, setIncludeTime] = useState(false);
  const [reasonMandatory, setReasonMandatory] = useState(true);
  // 3. Filters
  const [branches, setBranches] = useState<Set<string>>(new Set(["All Branches"]));
  const [depts, setDepts] = useState<Set<string>>(new Set(["All Departments"]));
  const [desigs, setDesigs] = useState<Set<string>>(new Set());
  const [contracts, setContracts] = useState<Set<string>>(new Set(["Full-Time Permanent"]));
  const [procs, setProcs] = useState<Set<string>>(new Set());
  // 4. Entitlement
  const [weekendUnits, setWeekendUnits] = useState("1.0");
  const [holidayUnits, setHolidayUnits] = useState("1.0");
  // 5. Expiry
  const [expiryMode, setExpiryMode] = useState<"yearEnd" | "afterDays">("yearEnd");
  const [expiryDays, setExpiryDays] = useState("90");

  function toggleSet(s: Set<string>, setter: (n: Set<string>) => void, item: string) {
    const next = new Set(s);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setter(next);
  }

  // ─── load/save wiring ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPolicy, setExistingPolicy] = useState<LeavePolicy | null>(null);
  const [compOffTypeId, setCompOffTypeId] = useState<number | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Find the Comp Off leave_type id once — we need it on POST/PATCH.
      const types = await listLeaveTypes();
      const co = types.find((t) => t.code === "CO");
      if (!co) {
        setError(
          "No Compensatory Off leave type found in the catalog. Create one under Master Leave Types first.",
        );
        return;
      }
      setCompOffTypeId(co.id);

      const policy = await getPolicyForLeaveType("CO");
      setExistingPolicy(policy);

      if (policy) {
        const s = policy.settings as Record<string, unknown>;
        setEnabled(policy.status === "Active");
        setManualReq(Boolean(s.manualRequest ?? true));
        setDuration({
          full: Boolean(s.allowFullDay ?? true),
          half: Boolean(s.allowHalfDay ?? true),
          quarter: Boolean(s.allowQuarterDay ?? false),
          hourly: Boolean(s.allowHourly ?? false),
        });
        setAllowFuture(Boolean(s.allowFuture ?? true));
        setIncludeTime(Boolean(s.includeTime ?? false));
        setReasonMandatory(Boolean(s.requireReason ?? true));
        setWeekendUnits(String(s.weekendUnits ?? "1.0"));
        setHolidayUnits(String(s.holidayUnits ?? "1.0"));
        setExpiryMode(
          (s.expiryMode === "afterDays" ? "afterDays" : "yearEnd") as
            | "yearEnd"
            | "afterDays",
        );
        setExpiryDays(String(s.expiryDays ?? "90"));
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

  // The scope-pill UIs use labels like "Engineering" — at write-time we
  // record them as Department/Designation/etc. scopes for the resolver.
  // "All Branches"/"All Departments" → Company-wide (special token).
  function buildScopeRows(): PolicyScope[] {
    const rows: PolicyScope[] = [];
    // Company-wide if any "All" filter is selected; the resolver picks the
    // most specific match, so adding Company as a fallback is fine.
    const isCompanyWide =
      branches.has("All Branches") || depts.has("All Departments");
    if (isCompanyWide) {
      rows.push({ scopeType: "Company", scopeId: null, priority: 100 });
    }
    function addLabeled(label: Set<string>, type: ScopeType, ignore: string[]) {
      let i = 1;
      for (const v of label) {
        if (ignore.includes(v)) continue;
        // No real id resolution yet — store label as a temporary marker via
        // scopeId=0 so we can persist that intent. A follow-up will lookup
        // real ids (e.g. department by name) when the picker is real.
        rows.push({
          scopeType: type,
          scopeId: 0 + i++, // stable but synthetic — see TODO above
          priority: 50,
        });
      }
    }
    addLabeled(branches, "Branch", ["All Branches"]);
    addLabeled(depts, "Department", ["All Departments"]);
    addLabeled(desigs, "Designation", []);
    addLabeled(contracts, "EmploymentType", []);
    addLabeled(procs, "Process", []);
    if (rows.length === 0) {
      rows.push({ scopeType: "Company", scopeId: null, priority: 100 });
    }
    return rows;
  }

  async function save() {
    if (!compOffTypeId) return;
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const settings: Record<string, unknown> = {
        manualRequest: manualReq,
        allowFullDay: duration.full,
        allowHalfDay: duration.half,
        allowQuarterDay: duration.quarter,
        allowHourly: duration.hourly,
        allowFuture,
        includeTime,
        requireReason: reasonMandatory,
        weekendUnits: Number(weekendUnits) || 0,
        holidayUnits: Number(holidayUnits) || 0,
        expiryMode,
        expiryDays: Number(expiryDays) || 0,
      };
      const body = {
        leaveTypeId: compOffTypeId,
        name: existingPolicy?.name ?? "Compensatory Off Policy",
        description:
          existingPolicy?.description ??
          "Default rules for earning comp-off when employees work weekends/holidays.",
        status: (enabled ? "Active" : "Draft") as "Active" | "Draft",
        isDefault: true,
        settings,
        scope: buildScopeRows(),
        // Keep approvals intact across saves; the Approval tab owns them.
        approvals: existingPolicy?.approvals ?? [],
      };
      const saved = existingPolicy
        ? await updatePolicy(existingPolicy.id, body)
        : await createPolicy(body);
      setExistingPolicy(saved);
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(null), 2400);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Master enable card */}
      <section className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-between gap-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
            Enable Compensatory Off
          </h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5">
            Turn on to allow employees to earn comp-off when they work on weekends
            or holidays.
          </p>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </section>

      {/* All subsequent cards fade-disable when comp-off is off */}
      <div
        className={[
          "flex flex-col gap-5 transition-opacity duration-200",
          enabled ? "opacity-100" : "opacity-50 pointer-events-none",
        ].join(" ")}
      >
        {/* 1. Mode of requests */}
        <SectionCard
          step={1}
          title="Mode of requests"
          description="Select the allowed ways of requesting for compensatory off."
          action={
            <button
              type="button"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-800"
            >
              <RotateCcw size={12} /> Reset
            </button>
          }
        >
          <RowToggle
            title="Manual request"
            desc="Compensatory off can be requested manually by raising a request."
            checked={manualReq}
            onChange={setManualReq}
          />
        </SectionCard>

        {/* 2. Restrictions */}
        <SectionCard
          step={2}
          title="Restrictions"
          description="Define settings related to compensatory off restrictions."
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[12.5px] font-semibold text-gray-700 mb-2">
                Compensatory off can be raised for
              </p>
              <div className="flex flex-wrap gap-2">
                <CheckPill
                  checked={duration.full}
                  onClick={() => setDuration((d) => ({ ...d, full: !d.full }))}
                >
                  Full day
                </CheckPill>
                <CheckPill
                  checked={duration.half}
                  onClick={() => setDuration((d) => ({ ...d, half: !d.half }))}
                >
                  Half day
                </CheckPill>
                <CheckPill
                  checked={duration.quarter}
                  onClick={() => setDuration((d) => ({ ...d, quarter: !d.quarter }))}
                >
                  Quarter day
                </CheckPill>
                <CheckPill
                  checked={duration.hourly}
                  onClick={() => setDuration((d) => ({ ...d, hourly: !d.hourly }))}
                >
                  Hourly
                </CheckPill>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-1">
              <RowToggle
                title="Allow requests for future dates"
                desc="When enabled, employees can take comp off leave first and later compensate by working overtime."
                checked={allowFuture}
                onChange={setAllowFuture}
              />
              <RowToggle
                title="Include time input when raising a request"
                desc="When enabled, compensated from and to time can be logged."
                checked={includeTime}
                onChange={setIncludeTime}
              />
              <RowToggle
                title="Make reason mandatory"
                desc="When enabled, reason is mandatory to raise a request."
                checked={reasonMandatory}
                onChange={setReasonMandatory}
              />
            </div>
          </div>
        </SectionCard>

        {/* 3. Filter by */}
        <SectionCard
          step={3}
          title="Applicability"
          description="Choose which branches, departments, designations, contracts and sub-team processes this policy applies to."
        >
          <FilterRow
            label="Filter by Branches"
            options={BRANCHES}
            selected={branches}
            onToggle={(o) => toggleSet(branches, setBranches, o)}
          />
          <FilterRow
            label="Filter by Departments"
            options={DEPARTMENTS}
            selected={depts}
            onToggle={(o) => toggleSet(depts, setDepts, o)}
          />
          <FilterRow
            label="Filter by Designations"
            options={DESIGNATIONS}
            selected={desigs}
            onToggle={(o) => toggleSet(desigs, setDesigs, o)}
          />
          <FilterRow
            label="Employment Contract Clauses"
            options={CONTRACTS}
            selected={contracts}
            onToggle={(o) => toggleSet(contracts, setContracts, o)}
          />
          <FilterRow
            label="Sub-team Processes"
            options={PROCESSES}
            selected={procs}
            onToggle={(o) => toggleSet(procs, setProcs, o)}
          />
        </SectionCard>

        {/* 4. Entitlement */}
        <SectionCard
          step={4}
          title="Entitlement"
          description="Define the compensatory entitlement when worked overtime on weekend or holiday. When worked on working days the same hours of OT will be given as entitlement."
        >
          <p className="text-[12.5px] font-semibold text-gray-700 mb-3">
            Leave credited when employee works on weekend or holiday
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UnitInput label="Weekend" value={weekendUnits} onChange={setWeekendUnits} />
            <UnitInput label="Holiday" value={holidayUnits} onChange={setHolidayUnits} />
          </div>
        </SectionCard>

        {/* 5. Expiry */}
        <SectionCard
          step={5}
          title="Expiry"
          description="Define when the compensatory off leave balance expires."
        >
          <p className="text-[12.5px] font-semibold text-gray-700 mb-3">
            Credited leave expires
          </p>
          <div className="flex flex-col gap-3">
            <Radio
              checked={expiryMode === "yearEnd"}
              onClick={() => setExpiryMode("yearEnd")}
              label="by calendar year end"
            />
            <Radio
              checked={expiryMode === "afterDays"}
              onClick={() => setExpiryMode("afterDays")}
              label={
                <span className="flex items-center gap-2">
                  after
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    onFocus={() => setExpiryMode("afterDays")}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
                  />
                  calendar days
                </span>
              }
            />
          </div>
        </SectionCard>

        {/* Save bar — wired to /api/admin/leave-policies. Settings persist
            across reloads; the resolver uses them when an employee opens
            their dashboard or applies for comp-off. */}
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
              policy…
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
            disabled={saving || loading || !compOffTypeId}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {existingPolicy ? "Update Policy" : "Save Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnitInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <span className="text-[13px] font-semibold text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-right px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
        />
        <span className="text-[12px] text-gray-500">unit</span>
      </div>
    </div>
  );
}

function Radio({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={[
          "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
          checked ? "border-[#FF014F]" : "border-gray-300",
        ].join(" ")}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-[#FF014F]" />}
      </span>
      <span className="text-[13px] text-gray-700">{label}</span>
    </button>
  );
}
