export type BloodGroupOption = {
  label: string;
  value: string;
};

export const DEFAULT_BLOOD_GROUP_OPTIONS: BloodGroupOption[] = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

function normalizeOption(entry: unknown): BloodGroupOption | null {
  if (typeof entry === "string") {
    const value = entry.trim();
    if (!value) return null;
    return { label: value, value };
  }
  if (entry && typeof entry === "object") {
    const row = entry as { label?: unknown; value?: unknown };
    const value =
      typeof row.value === "string"
        ? row.value.trim()
        : typeof row.label === "string"
          ? row.label.trim()
          : "";
    if (!value) return null;
    const label = typeof row.label === "string" ? row.label.trim() : value;
    return { label: label || value, value };
  }
  return null;
}

/** Parse BLOOD_GROUPS from env (comma-separated values or JSON array). */
export function parseBloodGroupsEnv(raw: string | undefined): BloodGroupOption[] {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_BLOOD_GROUP_OPTIONS;

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) return DEFAULT_BLOOD_GROUP_OPTIONS;
      const options = parsed
        .map(normalizeOption)
        .filter((option): option is BloodGroupOption => option != null);
      return options.length > 0 ? options : DEFAULT_BLOOD_GROUP_OPTIONS;
    } catch {
      return DEFAULT_BLOOD_GROUP_OPTIONS;
    }
  }

  const options = trimmed
    .split(",")
    .map((part) => normalizeOption(part))
    .filter((option): option is BloodGroupOption => option != null);

  return options.length > 0 ? options : DEFAULT_BLOOD_GROUP_OPTIONS;
}

export function bloodGroupValues(options: BloodGroupOption[]): string[] {
  return options.map((option) => option.value);
}
