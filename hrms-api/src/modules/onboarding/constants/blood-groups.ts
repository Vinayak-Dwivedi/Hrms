import { env } from "@/env";
import {
  bloodGroupValues,
  parseBloodGroupsEnv,
  type BloodGroupOption,
} from "@/lib/blood-groups";

export const BLOOD_GROUP_OPTIONS: BloodGroupOption[] = parseBloodGroupsEnv(
  env.BLOOD_GROUPS,
);

export const BLOOD_GROUP_VALUES = bloodGroupValues(BLOOD_GROUP_OPTIONS) as [
  string,
  ...string[],
];
