import { z } from "zod";
import type {
  CreateLocationPayload,
  UpdateLocationPayload,
} from "../api/locations.client";

const optionalHeadcount = z.string().refine(
  (v) => {
    if (v.trim() === "") return true;
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
  },
  "Headcount must be a non-negative whole number.",
);

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  headcount: optionalHeadcount,
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;

export function toCreateLocationPayload(
  values: LocationFormValues,
): CreateLocationPayload {
  const payload: CreateLocationPayload = {
    name: values.name.trim(),
    address: values.address?.trim() || null,
  };
  if (values.headcount.trim() !== "") {
    payload.headcount = Number(values.headcount);
  }
  return payload;
}

export function toUpdateLocationPayload(
  values: LocationFormValues,
): UpdateLocationPayload {
  return toCreateLocationPayload(values);
}

export function detailToLocationFormValues(location: {
  name: string;
  address: string | null;
  headcount: number;
}): LocationFormValues {
  return {
    name: location.name,
    address: location.address ?? "",
    headcount: location.headcount === 0 ? "" : String(location.headcount),
  };
}

export const emptyLocationFormValues: LocationFormValues = {
  name: "",
  address: "",
  headcount: "",
};
