import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatUploadTimeValue,
  mapUploadAttendanceRows,
} from "./me-attendance-uploads.js";

describe("me-attendance-uploads", () => {
  it("formats upload time values as HH:mm:ss", () => {
    assert.equal(formatUploadTimeValue("9:5:0"), "09:05:00");
    assert.equal(formatUploadTimeValue(null), null);
  });

  it("maps upload rows and drops null dates", () => {
    const records = mapUploadAttendanceRows([
      {
        attendanceDate: "2026-06-25",
        inTime: "09:00:00",
        outTime: "18:00:00",
        totalHours: "08:30:00",
      },
      {
        attendanceDate: null,
        inTime: null,
        outTime: null,
        totalHours: null,
      },
    ]);

    assert.equal(records.length, 1);
    assert.equal(records[0]?.date, "2026-06-25");
    assert.equal(records[0]?.inTime, "09:00:00");
    assert.equal(records[0]?.outTime, "18:00:00");
    assert.equal(records[0]?.totalHours, "08:30:00");
  });

  it("returns empty array when no upload rows match", () => {
    assert.deepEqual(mapUploadAttendanceRows([]), []);
  });
});
