"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Save, X } from "lucide-react";
import {
  employeeBtnClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeInputClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";
import {
  timeInputFromApi,
  timeInputToApi,
} from "@/features/shift-configuration/lib/shift-scope";
import {
  createShiftConfig,
  fetchStandardShiftTimings,
  getShiftConfig,
  updateShiftConfig,
  type ShiftStatus,
  type ShiftSummary,
  type StandardShiftTiming,
} from "./api/shift-configs.client";

type Target = ShiftSummary | "new";
type TimingPreset = string;

type Props = {
  target: Target;
  onClose: () => void;
  onSaved: () => void;
};

const CUSTOM_PRESET = "custom";

function detectPreset(
  start: string,
  end: string,
  standards: StandardShiftTiming[],
): TimingPreset {
  const s = timeInputFromApi(start);
  const e = timeInputFromApi(end);
  const match = standards.find(
    (row) => row.startTime === s && row.endTime === e,
  );
  return match?.key ?? CUSTOM_PRESET;
}

export default function ShiftDialog({ target, onClose, onSaved }: Props) {
  const isNew = target === "new";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standards, setStandards] = useState<StandardShiftTiming[]>([]);

  const [timingPreset, setTimingPreset] = useState<TimingPreset>("morning");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("19:00");
  const [status, setStatus] = useState<ShiftStatus>("Draft");
  const [isDefault, setIsDefault] = useState(false);
  const [graceMinutes, setGraceMinutes] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const presetRows = await fetchStandardShiftTimings();
        if (cancelled) return;
        setStandards(presetRows);

        if (isNew) {
          const first = presetRows[0];
          if (first) {
            setTimingPreset(first.key);
            setStartTime(first.startTime);
            setEndTime(first.endTime);
            setName(first.label);
          }
          setLoading(false);
          return;
        }

        const detail = await getShiftConfig(target.id);
        if (cancelled) return;
        setName(detail.name);
        setStartTime(timeInputFromApi(detail.startTime));
        setEndTime(timeInputFromApi(detail.endTime));
        setTimingPreset(detectPreset(detail.startTime, detail.endTime, presetRows));
        setStatus(detail.status);
        setIsDefault(detail.isDefault);
        setGraceMinutes(detail.graceMinutes);
        setBreakMinutes(detail.breakMinutes);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, target]);

  function applyPreset(key: TimingPreset) {
    setTimingPreset(key);
    if (key === CUSTOM_PRESET) return;
    const row = standards.find((s) => s.key === key);
    if (!row) return;
    setStartTime(row.startTime);
    setEndTime(row.endTime);
    if (isNew || !name.trim()) {
      setName(row.label);
    }
  }

  const isCustom = timingPreset === CUSTOM_PRESET;
  const selectedStandard = standards.find((s) => s.key === timingPreset);

  async function handleSave() {
    if (!name.trim()) {
      setError("Shift name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: null,
        startTime: timeInputToApi(startTime),
        endTime: timeInputToApi(endTime),
        status,
        isDefault,
        graceMinutes,
        breakMinutes,
        scope: [],
      };
      if (isNew) {
        await createShiftConfig(payload);
      } else {
        await updateShiftConfig(target.id, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 border-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-[15px] font-semibold text-slate-900 m-0">
            {isNew ? "Add Shift" : "Edit Shift"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="animate-spin mr-2" size={18} />
            Loading…
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {error && <div className={employeeErrorBannerClass}>{error}</div>}

            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <label className={employeeFilterLabelClass} htmlFor="shift-timing-preset">
                  Shift Timing
                </label>
                <select
                  id="shift-timing-preset"
                  className={employeeSelectClass}
                  value={timingPreset}
                  onChange={(e) => applyPreset(e.target.value)}
                >
                  {standards.map((row) => (
                    <option key={row.key} value={row.key}>
                      {row.label} — {row.timingDisplay}
                    </option>
                  ))}
                  <option value={CUSTOM_PRESET}>Custom — set your own times</option>
                </select>
              </div>

              <div>
                <label className={employeeFilterLabelClass} htmlFor="shift-name">
                  Shift Name
                </label>
                <input
                  id="shift-name"
                  className={employeeInputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="General Shift"
                />
              </div>

              {!isCustom && selectedStandard && (
                <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
                  <span className="font-medium text-slate-800">Standard timing: </span>
                  {selectedStandard.timingDisplay}
                </div>
              )}

              {isCustom && (
                <>
                  <div>
                    <label className={employeeFilterLabelClass} htmlFor="shift-start">
                      Start Time
                    </label>
                    <input
                      id="shift-start"
                      type="time"
                      className={employeeInputClass}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={employeeFilterLabelClass} htmlFor="shift-end">
                      End Time
                    </label>
                    <input
                      id="shift-end"
                      type="time"
                      className={employeeInputClass}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className={employeeFilterLabelClass} htmlFor="shift-status">
                  Status
                </label>
                <select
                  id="shift-status"
                  className={employeeSelectClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ShiftStatus)}
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 pb-2">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                  Default shift
                </label>
              </div>

              <div>
                <label className={employeeFilterLabelClass} htmlFor="shift-grace">
                  Grace Minutes
                </label>
                <input
                  id="shift-grace"
                  type="number"
                  min={0}
                  max={120}
                  className={employeeInputClass}
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className={employeeFilterLabelClass} htmlFor="shift-break">
                  Break Minutes
                </label>
                <input
                  id="shift-break"
                  type="number"
                  min={0}
                  max={480}
                  className={employeeInputClass}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className={employeeBtnClass}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={employeeBtnClass}
              >
                {saving ? (
                  <Loader2 className="animate-spin inline mr-1" size={14} />
                ) : (
                  <Save className="inline mr-1" size={14} />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
