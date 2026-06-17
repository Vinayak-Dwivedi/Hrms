export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
  "Prefer Not to Say",
] as const;

export type MaritalStatus = (typeof MARITAL_STATUS_OPTIONS)[number];
