"use client";

import { useEffect, useState } from "react";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnSmClass,
  employeeErrorBannerClass,
  employeeFieldLabelClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchLocationById,
  type LocationDetail,
} from "../api/locations.client";

interface Props {
  locationId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
}

export default function ViewLocationModal({
  locationId,
  open,
  onClose,
  onEdit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationDetail | null>(null);

  useEffect(() => {
    if (!open || locationId == null) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const row = await fetchLocationById(locationId);
        if (cancelled) return;
        setLocation(row);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, locationId]);

  const title = location?.name ?? "Location Details";

  return (
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && (
        <div className={employeeLoadingClass}>Loading location…</div>
      )}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && location && (
        <div className="p-6 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 m-0">
            {[
              ["Name", location.name],
              ["Address", location.address ?? "—"],
              [
                "Headcount",
                location.headcount === 0 ? "—" : String(location.headcount),
              ],
            ].map(([label, value]) => (
              <div key={label} className={label === "Address" ? "md:col-span-2" : undefined}>
                <dt className={employeeFieldLabelClass}>{label}</dt>
                <dd className="text-sm text-gray-800 mt-1 m-0">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex justify-end pt-2">
            <button
              className={employeeBtnSmClass}
              onClick={() => onEdit(location.id)}
              type="button"
            >
              Edit Location
            </button>
          </div>
        </div>
      )}
    </EmployeeModalShell>
  );
}
