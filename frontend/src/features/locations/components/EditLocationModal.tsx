"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchLocationById,
  updateLocation,
  type LocationDetail,
} from "../api/locations.client";
import LocationFormFields from "./LocationFormFields";
import {
  detailToLocationFormValues,
  locationFormSchema,
  toUpdateLocationPayload,
  type LocationFormValues,
} from "../schemas/location.schema";

interface Props {
  locationId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditLocationModal({
  locationId,
  open,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [values, setValues] = useState<LocationFormValues | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setValues(detailToLocationFormValues(row));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locationId == null || !values) return;
    setSubmitError(null);
    const parsed = locationFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await updateLocation(locationId, toUpdateLocationPayload(parsed.data));
      toast.success("Location updated.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    location != null ? `Edit — ${location.name}` : "Edit Location";

  return (
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && (
        <div className={employeeLoadingClass}>Loading location…</div>
      )}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && values && (
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {submitError && (
            <div className={employeeErrorBannerClass}>{submitError}</div>
          )}
          <LocationFormFields onChange={setValues} values={values} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              className={employeeBtnOutlineSmClass}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className={employeeBtnClass} disabled={submitting} type="submit">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </EmployeeModalShell>
  );
}
