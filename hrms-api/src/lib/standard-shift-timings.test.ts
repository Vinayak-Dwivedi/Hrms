import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_STANDARD_SHIFT_TIMINGS,
  findMatchingStandardShift,
  parseClockTo24h,
  parseShiftTimingsEnv,
} from "./standard-shift-timings.js";

describe("standard-shift-timings", () => {
  it("parses AM/PM clock strings", () => {
    assert.equal(parseClockTo24h("09:00 AM"), "09:00");
    assert.equal(parseClockTo24h("07:00 PM"), "19:00");
    assert.equal(parseClockTo24h("10:00 PM"), "22:00");
    assert.equal(parseClockTo24h("01:00 PM"), "13:00");
  });

  it("uses default presets when env is empty", () => {
    assert.equal(parseShiftTimingsEnv(undefined).length, 3);
    assert.deepEqual(
      parseShiftTimingsEnv(undefined).map((s) => s.key),
      ["morning", "evening", "night"],
    );
  });

  it("parses JSON object env format", () => {
    const parsed = parseShiftTimingsEnv(
      JSON.stringify({
        morning: { label: "Morning Shift", login: "09:00 AM", logout: "07:00 PM" },
        evening: { login: "01:00 PM", logout: "10:00 PM" },
      }),
    );
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0]?.startTime, "09:00");
    assert.equal(parsed[0]?.endTime, "19:00");
    assert.equal(parsed[1]?.startTime, "13:00");
  });

  it("matches stored times to a standard preset", () => {
    const match = findMatchingStandardShift(
      "09:00:00",
      "19:00:00",
      DEFAULT_STANDARD_SHIFT_TIMINGS,
    );
    assert.equal(match?.key, "morning");
  });
});
