"use client";

import { Building2, ChevronRight, Loader2, MapPin, Network } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBranches } from "@/features/employees/api/employees.client";
import {
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";
import {
  fetchOrgDepartments,
  fetchOrgSubDepartments,
  type OrgDepartment,
  type OrgSubDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  filterDepartmentsByLocation,
  filterSubDepartmentsByDepartmentAndLocation,
} from "@/features/org-hierarchy/lib/org-hierarchy-location";
import type { HierarchyScopeRow } from "@/features/leave-policy/lib/leave-plan-scope";
import {
  buildScopePayloadFromCascade,
  emptyCascadeScopeState,
  formatScopeSummary,
  hydrateCascadeFromRows,
  type CascadeScopeState,
} from "./lib/leave-plan-scope";

type LookupItem = { id: number; name: string };

type Props = {
  scope: HierarchyScopeRow[];
  onChange: (rows: HierarchyScopeRow[]) => void;
  /** Hide outer card chrome when nested inside another field. */
  embedded?: boolean;
};

const ALL_DEPARTMENTS = "__all_departments__";
const ALL_SUB_DEPARTMENTS = "__all_sub_departments__";

export default function LeavePlanHierarchyScopeEditor({
  scope,
  onChange,
  embedded = false,
}: Props) {
  const skipScopeSync = useRef(false);
  const [cascade, setCascade] = useState<CascadeScopeState>(() =>
    hydrateCascadeFromRows(scope),
  );

  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [subDepartments, setSubDepartments] = useState<OrgSubDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [brs, depts, subs] = await Promise.all([
          fetchBranches(),
          fetchOrgDepartments(),
          fetchOrgSubDepartments(),
        ]);
        if (cancelled) return;
        setBranches(brs);
        setDepartments(depts);
        setSubDepartments(subs);
      } catch (e) {
        if (!cancelled) {
          setLoadError((e as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (skipScopeSync.current) {
      skipScopeSync.current = false;
      return;
    }
    setCascade(hydrateCascadeFromRows(scope));
  }, [scope]);

  const parsedLocationId = cascade.locationId;

  const visibleDepartments = useMemo(() => {
    if (parsedLocationId == null) return [];
    return filterDepartmentsByLocation(departments, parsedLocationId);
  }, [departments, parsedLocationId]);

  const visibleSubDepartments = useMemo(() => {
    if (
      parsedLocationId == null ||
      cascade.allDepartments ||
      cascade.departmentId == null
    ) {
      return [];
    }
    return filterSubDepartmentsByDepartmentAndLocation(
      subDepartments,
      cascade.departmentId,
      parsedLocationId,
    );
  }, [
    cascade.allDepartments,
    cascade.departmentId,
    parsedLocationId,
    subDepartments,
  ]);

  const locationName = branches.find((b) => b.id === cascade.locationId)?.name;
  const departmentName = visibleDepartments.find(
    (d) => d.id === cascade.departmentId,
  )?.name;
  const subDepartmentName = visibleSubDepartments.find(
    (s) => s.id === cascade.subDepartmentId,
  )?.name;

  const summary = formatScopeSummary(scope, {
    locationName,
    departmentName,
    subDepartmentName,
  });

  function apply(next: CascadeScopeState) {
    skipScopeSync.current = true;
    setCascade(next);
    onChange(buildScopePayloadFromCascade(next));
  }

  function setCompanyWide(companyWide: boolean) {
    if (companyWide) {
      apply(emptyCascadeScopeState());
      return;
    }
    const next: CascadeScopeState = {
      companyWide: false,
      locationId: null,
      allDepartments: true,
      departmentId: null,
      allSubDepartments: true,
      subDepartmentId: null,
    };
    skipScopeSync.current = true;
    setCascade(next);
    onChange([]);
  }

  function onLocationChange(value: string) {
    const locationId = value === "" ? null : Number(value);
    apply({
      companyWide: false,
      locationId: Number.isFinite(locationId) ? locationId : null,
      allDepartments: true,
      departmentId: null,
      allSubDepartments: true,
      subDepartmentId: null,
    });
  }

  function onDepartmentChange(value: string) {
    if (value === ALL_DEPARTMENTS) {
      apply({
        ...cascade,
        companyWide: false,
        allDepartments: true,
        departmentId: null,
        allSubDepartments: true,
        subDepartmentId: null,
      });
      return;
    }
    const departmentId = value === "" ? null : Number(value);
    apply({
      ...cascade,
      companyWide: false,
      allDepartments: false,
      departmentId: Number.isFinite(departmentId) ? departmentId : null,
      allSubDepartments: true,
      subDepartmentId: null,
    });
  }

  function onSubDepartmentChange(value: string) {
    if (value === ALL_SUB_DEPARTMENTS) {
      apply({
        ...cascade,
        companyWide: false,
        allSubDepartments: true,
        subDepartmentId: null,
      });
      return;
    }
    const subDepartmentId = value === "" ? null : Number(value);
    apply({
      ...cascade,
      companyWide: false,
      allSubDepartments: false,
      subDepartmentId: Number.isFinite(subDepartmentId)
        ? subDepartmentId
        : null,
    });
  }

  const departmentValue = cascade.allDepartments
    ? ALL_DEPARTMENTS
    : cascade.departmentId != null
      ? String(cascade.departmentId)
      : "";

  const subDepartmentValue = cascade.allSubDepartments
    ? ALL_SUB_DEPARTMENTS
    : cascade.subDepartmentId != null
      ? String(cascade.subDepartmentId)
      : "";

  const hierarchyDisabled = cascade.companyWide;
  const departmentDisabled = hierarchyDisabled || cascade.locationId == null;
  const subDepartmentDisabled =
    departmentDisabled ||
    cascade.allDepartments ||
    cascade.departmentId == null;

  const body = (
    <div className="flex flex-col gap-4">
      <label className="inline-flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={cascade.companyWide}
          onChange={(e) => setCompanyWide(e.target.checked)}
          className="h-4 w-4 accent-[lab(36.9089%_35.0961_-85.6872)]"
        />
        <span className="font-medium">Apply to entire organization</span>
      </label>

      {loadError && (
        <div className={employeeErrorBannerClass}>{loadError}</div>
      )}

      <div
        className={[
          "rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-4 transition-opacity",
          hierarchyDisabled ? "opacity-55 pointer-events-none" : "",
        ].join(" ")}
      >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <Network size={13} />
              Organizational unit
            </div>
            {loading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <ScopeSelect
              step={1}
              icon={<MapPin size={14} className="text-sky-600" />}
              label="Location"
              hint="Work location (branch)"
              disabled={hierarchyDisabled || loading}
              value={cascade.locationId ?? ""}
              onChange={onLocationChange}
              placeholder="Select location"
              options={branches.map((b) => ({ id: b.id, name: b.name }))}
              emptyMessage={
                !loading && branches.length === 0
                  ? "No locations found. Add branches in master data."
                  : undefined
              }
            />

            <ScopeSelect
              step={2}
              icon={<Building2 size={14} className="text-violet-600" />}
              label="Department"
              hint={
                cascade.locationId
                  ? `Departments at ${locationName ?? "selected location"}`
                  : "Select a location first"
              }
              disabled={departmentDisabled || loading}
              value={departmentValue}
              onChange={onDepartmentChange}
              placeholder={
                cascade.locationId
                  ? "Select department"
                  : "Select location first"
              }
              options={[
                { id: ALL_DEPARTMENTS, name: "All departments" },
                ...visibleDepartments.map((d) => ({ id: d.id, name: d.name })),
              ]}
              emptyMessage={
                cascade.locationId &&
                !loading &&
                visibleDepartments.length === 0
                  ? "No departments mapped to this location."
                  : undefined
              }
            />

            <ScopeSelect
              step={3}
              icon={<Network size={14} className="text-emerald-600" />}
              label="Sub-department"
              hint={
                cascade.departmentId && !cascade.allDepartments
                  ? `Under ${departmentName ?? "selected department"}`
                  : "Select a department first"
              }
              disabled={subDepartmentDisabled || loading}
              value={subDepartmentValue}
              onChange={onSubDepartmentChange}
              placeholder={
                cascade.departmentId && !cascade.allDepartments
                  ? "Select sub-department"
                  : "Select department first"
              }
              options={[
                { id: ALL_SUB_DEPARTMENTS, name: "All sub-departments" },
                ...visibleSubDepartments.map((s) => ({
                  id: s.id,
                  name: s.name,
                })),
              ]}
              emptyMessage={
                cascade.departmentId &&
                !cascade.allDepartments &&
                !loading &&
                visibleSubDepartments.length === 0
                  ? "No sub-departments mapped to this department."
                  : undefined
              }
            />
          </div>
        </div>

        {!cascade.companyWide && cascade.locationId != null && (
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-gray-600 px-1">
            <span className="font-medium text-gray-500">Coverage path:</span>
            <PathChip icon={<MapPin size={12} />} label={locationName ?? "—"} />
            {cascade.allDepartments ? (
              <>
                <ChevronRight size={12} className="text-gray-300" />
                <PathChip label="All departments" />
              </>
            ) : departmentName ? (
              <>
                <ChevronRight size={12} className="text-gray-300" />
                <PathChip
                  icon={<Building2 size={12} />}
                  label={departmentName}
                />
                {cascade.allSubDepartments ? (
                  <>
                    <ChevronRight size={12} className="text-gray-300" />
                    <PathChip label="All sub-departments" />
                  </>
                ) : subDepartmentName ? (
                  <>
                    <ChevronRight size={12} className="text-gray-300" />
                    <PathChip
                      icon={<Network size={12} />}
                      label={subDepartmentName}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        )}

        <p className="text-[11.5px] text-gray-400 leading-snug px-0.5">
          {embedded
            ? "Uncheck “entire organization”, then pick location, department, and sub-department in order."
            : "Uncheck “entire organization”, then pick location, department, and sub-department. Active policies seed balances for employees in that path."}
        </p>
    </div>
  );

  if (embedded) return body;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Applies to</p>
          <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">
            Location → Department → Sub-department
          </p>
        </div>
        <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
          {summary}
        </span>
      </div>
      <div className="p-4">{body}</div>
    </div>
  );
}

function ScopeSelect({
  step,
  icon,
  label,
  hint,
  disabled,
  value,
  onChange,
  placeholder,
  options,
  emptyMessage,
}: {
  step: number;
  icon: React.ReactNode;
  label: string;
  hint: string;
  disabled: boolean;
  value: string | number;
  onChange: (value: string) => void;
  placeholder: string;
  options: { id: number | string; name: string }[];
  emptyMessage?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[72px_1fr] gap-3 items-start">
      <div className="flex items-center gap-2 pt-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 text-[11px] font-bold text-gray-500 shadow-sm">
          {step}
        </span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={employeeFilterLabelClass}>{label}</label>
        <p className="text-[11px] text-gray-400 -mt-1 mb-0.5">{hint}</p>
        <select
          className={employeeSelectClass}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        {emptyMessage && (
          <p className="text-[11px] text-amber-700">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function PathChip({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[11.5px] font-medium text-gray-700 shadow-sm">
      {icon}
      {label}
    </span>
  );
}
