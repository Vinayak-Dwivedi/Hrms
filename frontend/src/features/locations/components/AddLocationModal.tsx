"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
} from "@/features/employees/employee-theme";
import { createLocation } from "../api/locations.client";
import LocationFormFields from "./LocationFormFields";
import {
  emptyLocationFormValues,
  locationFormSchema,
  toCreateLocationPayload,
  type LocationFormValues,
} from "../schemas/location.schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddLocationModal({ open, onClose, onSaved }: Props) {
  const [values, setValues] = useState<LocationFormValues>(
    emptyLocationFormValues,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValues(emptyLocationFormValues);
      setSubmitError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const parsed = locationFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await createLocation(toCreateLocationPayload(parsed.data));
      toast.success("Location created.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmployeeModalShell open={open} onClose={onClose} title="Add Location">
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
            {submitting ? "Saving…" : "Save Location"}
          </button>
        </div>
      </form>
    </EmployeeModalShell>
  );
}
