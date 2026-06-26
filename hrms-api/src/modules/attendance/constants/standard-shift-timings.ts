import { env } from "@/env";
import {
  parseShiftTimingsEnv,
  type StandardShiftTiming,
} from "@/lib/standard-shift-timings";

export const STANDARD_SHIFT_TIMINGS: StandardShiftTiming[] = parseShiftTimingsEnv(
  env.SHIFT_TIMINGS,
);
