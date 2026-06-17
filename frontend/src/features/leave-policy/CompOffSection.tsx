"use client";

// Compensatory Off â€” settings. Deliberately minimal: a master enable, whether a
// reason is required, and when the credit expires. The earn â†’ request â†’ approve
// â†’ credit â†’ use workflow lives in the Comp-Off request flow (Leave page) and
// the Approvals page; this tab only holds the policy defaults.
//
// Settings persist on the "CO" leave_policies row (status Active = enabled).

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, RotateCcw, Save } from "lucide-react";
import {
  createPolicy,
  getPolicyForLeaveType,
  updatePolicy,
  type LeavePolicy,
} from "./api/leave-policies.client";
import { listLeaveTypes } from "./api/leave-types.client";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative shrink-0 rounded-full transition-colors duration-200 w-10 h-5.5 disabled:opacity-40",
        checked ? "bg-[#ff014f]" : "bg-gray-300",
      ].join(" ")}
      style={{ width: 40, height: 22 }}
      aria-pressed={checked}
    >
      <span
        className="absolute top-0.5 bg-white rounded-full shadow-sm transition-[left] duration-200"
        style={{ width: 18, height: 18, left: checked ? 20 : 2 }}
      />
    </button>
  );
}

export default function CompOffSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [compOffTypeId, setCompOffTypeId] = useState<number | null>(null);
  const [existingPolicy, setExistingPolicy] = useState<LeavePolicy | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [reasonRequired, setReasonRequired] = useState(true);
  const [expiryMode, setExpiryMode] = useState<"yearEnd" | "afterDays">("afterDays");
  const [expiryDays, setExpiryDays] = useState("90");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const types = await listLeaveTypes();
      const co = types.find((t) => t.code === "CO");
      if (!co) {
        setError(
          "No Compensatory Off (code â€œCOâ€) leave type found. Create one under Leave Types first.",
        );
        return;
      }
      setCompOffTypeId(co.id);

      const policy = await getPolicyForLeaveType("CO");
      setExistingPolicy(policy);
      if (policy) {
        const s = policy.settings as Record<string, unknown>;
        setEnabled(policy.status === "Active");
        setReasonRequired(Boolean(s.requireReason ?? true));
        setExpiryMode(s.expiryMode === "yearEnd" ? "yearEnd" : "afterDays");
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

  async function save() {
    if (!compOffTypeId) return;
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const settings: Record<string, unknown> = {
        requireReason: reasonRequired,
        expiryMode,
        expiryDays: Number(expiryDays) || 0,
      };
      const body = {
        leaveTypeId: compOffTypeId,
        name: existingPolicy?.name ?? "Compensatory Off Policy",
        description:
          existingPolicy?.description ??
          "Comp-off earned by working on a holiday or weekly off.",
        status: (enabled ? "Active" : "Draft") as "Active" | "Draft",
        isDefault: true,
        settings,
        scope: [{ scopeType: "Company" as const, scopeId: null, priority: 100 }],
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
      {/* How it works */}
      <section className="bg-white border border-gray-200 rounded-2xl px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock size={16} className="text-[#ff014f]" />
          <h3 className="text-[15px] font-bold text-gray-900">
            Compensatory Off
          </h3>
        </div>
        <p className="text-[12.5px] text-gray-500 leading-relaxed max-w-2xl">
          When an employee works on a <strong>holiday</strong> or their{" "}
          <strong>weekly off</strong>, they raise a comp-off request from the
          Leave page. Once their manager (or HR) approves it, one comp-off day is
          credited to their balance, which they can apply for later like any
          other leave.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11.5px] font-semibold text-gray-500">
          {["Work holiday / week-off", "Request", "Manager approves", "Credit added", "Use later"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-pink-50 text-[#be185d] border border-pink-100">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-gray-300">â†’</span>}
              </span>
            ),
          )}
        </div>
      </section>

      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-gray-500">
          <Loader2 size={14} className="animate-spin" /> Loadingâ€¦
        </div>
      ) : (
        <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          <SettingRow
            title="Enable Compensatory Off"
            desc="Allow employees to earn comp-off for working holidays / weekly offs."
          >
            <Toggle checked={enabled} onChange={setEnabled} />
          </SettingRow>
          <SettingRow
            title="Reason required"
            desc="Make the reason mandatory when an employee raises a comp-off request."
          >
            <Toggle checked={reasonRequired} onChange={setReasonRequired} disabled={!enabled} />
          </SettingRow>
          <SettingRow
            title="Credit expiry"
            desc="When unused comp-off credit lapses."
          >
            <div className="flex items-center gap-2">
              <select
                value={expiryMode}
                onChange={(e) => setExpiryMode(e.target.value as "yearEnd" | "afterDays")}
                disabled={!enabled}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] disabled:opacity-50"
              >
                <option value="afterDays">After N days</option>
                <option value="yearEnd">At year end</option>
              </select>
              {expiryMode === "afterDays" && (
                <input
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  disabled={!enabled}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-right text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] disabled:opacity-50"
                />
              )}
            </div>
          </SettingRow>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        {saveMsg && (
          <span className="text-[12px] text-emerald-700 font-semibold">{saveMsg}</span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || loading || !compOffTypeId}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#ff014f] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-900">{title}</p>
        <p className="text-[12px] text-gray-500 mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
