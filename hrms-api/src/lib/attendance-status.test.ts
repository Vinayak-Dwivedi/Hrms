import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyAttendanceDayContext,
  flagsForDate,
  resolveAttendanceStatus,
  resolveAttendanceStatusForDate,
} from "./attendance-status.js";

describe("attendance-status", () => {
  const emptyCtx = emptyAttendanceDayContext();

  it("marks Absent when both punches missing and no calendar rules apply", () => {
    const status = resolveAttendanceStatus(
      { inTime: null, outTime: null, totalHours: null },
      flagsForDate(emptyCtx, "2026-06-10"),
    );
    assert.equal(status, "Absent");
  });

  it("marks Leave when approved full-day leave on date", () => {
    const ctx = emptyAttendanceDayContext();
    ctx.approvedLeave.set("2026-06-10", "full");
    const status = resolveAttendanceStatusForDate(
      "2026-06-10",
      { inTime: null, outTime: null },
      ctx,
    );
    assert.equal(status, "Leave");
  });

  it("marks Half Day when approved half-day leave on date", () => {
    const ctx = emptyAttendanceDayContext();
    ctx.approvedLeave.set("2026-06-10", "half");
    const status = resolveAttendanceStatusForDate(
      "2026-06-10",
      { inTime: null, outTime: null },
      ctx,
    );
    assert.equal(status, "Half Day");
  });

  it("marks Holiday when date is a company holiday", () => {
    const ctx = emptyAttendanceDayContext();
    ctx.holidays.add("2026-06-10");
    const status = resolveAttendanceStatusForDate(
      "2026-06-10",
      { inTime: null, outTime: null },
      ctx,
    );
    assert.equal(status, "Holiday");
  });

  it("marks Weekend when date is weekly off", () => {
    const ctx = emptyAttendanceDayContext();
    ctx.weeklyOff.add("2026-06-07");
    const status = resolveAttendanceStatusForDate(
      "2026-06-07",
      { inTime: null, outTime: null },
      ctx,
    );
    assert.equal(status, "Weekend");
  });

  it("does not let pending leave override — missing punches stay Absent", () => {
    const status = resolveAttendanceStatusForDate(
      "2026-06-10",
      { inTime: null, outTime: null },
      emptyCtx,
    );
    assert.equal(status, "Absent");
  });

  it("marks Absent when one punch missing and no worked hours", () => {
    const status = resolveAttendanceStatus(
      { inTime: "09:00:00", outTime: null, totalHours: null },
      flagsForDate(emptyCtx, "2026-06-10"),
    );
    assert.equal(status, "Absent");
  });

  it("derives Present from sufficient worked hours", () => {
    const status = resolveAttendanceStatus(
      { inTime: "09:00:00", outTime: "18:00:00", totalHours: "09:00:00" },
      flagsForDate(emptyCtx, "2026-06-10"),
    );
    assert.equal(status, "Present");
  });

  it("derives Half Day from partial worked hours", () => {
    const status = resolveAttendanceStatus(
      { inTime: "09:00:00", outTime: "13:00:00", totalHours: "04:00:00" },
      flagsForDate(emptyCtx, "2026-06-10"),
    );
    assert.equal(status, "Half Day");
  });

  it("approved leave takes precedence over holiday", () => {
    const ctx = emptyAttendanceDayContext();
    ctx.approvedLeave.set("2026-06-10", "full");
    ctx.holidays.add("2026-06-10");
    const status = resolveAttendanceStatusForDate(
      "2026-06-10",
      { inTime: null, outTime: null },
      ctx,
    );
    assert.equal(status, "Leave");
  });
});
