import { z } from "zod";
import type {
  CreateLocationPayload,
  UpdateLocationPayload,
} from "../api/locations.client";

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;

export function toCreateLocationPayload(
  values: LocationFormValues,
): CreateLocationPayload {
  return {
    name: values.name.trim(),
    address: values.address?.trim() || null,
  };
}

export function toUpdateLocationPayload(
  values: LocationFormValues,
): UpdateLocationPayload {
  return toCreateLocationPayload(values);
}

export function detailToLocationFormValues(location: {
  name: string;
  address: string | null;
}): LocationFormValues {
  return {
    name: location.name,
    address: location.address ?? "",
  };
}

export const emptyLocationFormValues: LocationFormValues = {
  name: "",
  address: "",
};
