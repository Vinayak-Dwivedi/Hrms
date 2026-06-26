import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attendanceUploadMatchesEmpId,
  attendanceUploadToEmployeeJoin,
  computeMissPunch,
  computeNetLoginMinutes,
  computeNetWorkingMinutes,
  computeOvertimeMinutes,
  computeProductiveMinutes,
  computeShiftDurationMinutes,
  formatDayName,
  formatDurationFromMinutes,
  shapeAttendanceReportRow,
} from "./attendance-report.js";
import { emptyAttendanceDayContext } from "./attendance-status.js";

describe("attendance-report", () => {
  it("defines employee_code to emp_id join helper", () => {
    assert.ok(attendanceUploadToEmployeeJoin());
    assert.ok(attendanceUploadMatchesEmpId("IASPL000130"));
  });
  it("formats weekday from date", () => {
    assert.equal(formatDayName("2024-01-01"), "Mon");
  });

  it("detects miss punch", () => {
    assert.equal(computeMissPunch("09:00:00", null), "Yes");
    assert.equal(computeMissPunch(null, "18:00:00"), "Yes");
    assert.equal(computeMissPunch("09:00:00", "18:00:00"), "No");
  });

  it("formats duration from minutes", () => {
    assert.equal(formatDurationFromMinutes(545), "9h 5m");
    assert.equal(formatDurationFromMinutes(0), null);
  });

  it("computes net login hours after lunch break", () => {
    assert.equal(computeNetLoginMinutes(540, 60), 480);
    assert.equal(computeNetLoginMinutes(30, 60), 0);
    assert.equal(computeProductiveMinutes(540, 60), 480);
    assert.equal(computeNetWorkingMinutes(540, 60), 480);
  });

  it("computes shift duration including overnight shifts", () => {
    assert.equal(computeShiftDurationMinutes("09:00:00", "19:00:00"), 600);
    assert.equal(computeShiftDurationMinutes("22:00:00", "07:00:00"), 540);
  });

  it("computes overtime as net login beyond expected shift net hours", () => {
    assert.equal(computeOvertimeMinutes(660, 60, 600), 60);
    assert.equal(computeOvertimeMinutes(600, 60, 600), 0);
    assert.equal(computeOvertimeMinutes(600, 60, 0), 0);
  });

  it("shapes net hours as login span minus shift break", () => {
    const row = shapeAttendanceReportRow({
      attendanceDate: "2026-06-25",
      employeeCode: "E001",
      inTime: "09:00:00",
      outTime: "18:00:00",
      totalHours: null,
      hasUploadRecord: true,
      firstName: "Jane",
      middleName: null,
      lastName: "Doe",
      departmentName: "Engineering",
      subDepartmentName: null,
      designationName: "Developer",
      locationName: "Mumbai",
      reportingManagerL2: "John Smith",
      reportingManagerL3: "Alice Lee",
      shift: {
        name: "Morning Shift",
        shiftTiming: "09:00 – 19:00",
        startTime: "09:00:00",
        endTime: "19:00:00",
        graceMinutes: 0,
        breakMinutes: 60,
      },
    });

    assert.equal(row.grossWorkingHours, "10h 0m");
    assert.equal(row.breakTime, "60m");
    assert.equal(row.netWorkingHours, "8h 0m");
    assert.equal(row.overtimeHours, null);
  });

  it("shapes overtime when net login exceeds expected shift hours", () => {
    const row = shapeAttendanceReportRow({
      attendanceDate: "2026-06-25",
      employeeCode: "E001",
      inTime: "09:00:00",
      outTime: "20:00:00",
      totalHours: null,
      hasUploadRecord: true,
      firstName: "Jane",
      middleName: null,
      lastName: "Doe",
      departmentName: "Engineering",
      subDepartmentName: null,
      designationName: "Developer",
      locationName: "Mumbai",
      reportingManagerL2: null,
      reportingManagerL3: null,
      shift: {
        name: "Morning Shift",
        shiftTiming: "09:00 – 19:00",
        startTime: "09:00:00",
        endTime: "19:00:00",
        graceMinutes: 0,
        breakMinutes: 60,
      },
    });

    assert.equal(row.netWorkingHours, "10h 0m");
    assert.equal(row.overtimeHours, "1h 0m");
  });

  it("shapes report row with hours from punches", () => {
    const row = shapeAttendanceReportRow({
      attendanceDate: "2026-06-25",
      employeeCode: "E001",
      inTime: "09:00:00",
      outTime: "18:00:00",
      totalHours: null,
      hasUploadRecord: true,
      firstName: "Jane",
      middleName: null,
      lastName: "Doe",
      departmentName: "Engineering",
      subDepartmentName: null,
      designationName: "Developer",
      locationName: "Mumbai",
      reportingManagerL2: "John Smith",
      reportingManagerL3: "Alice Lee",
    });

    assert.equal(row.employeeName, "Jane Doe");
    assert.equal(row.grossWorkingHours, null);
    assert.equal(row.netWorkingHours, "9h 0m");
    assert.equal(row.attendanceStatus, "Present");
    assert.equal(row.missPunch, "No");
    assert.equal(row.day, "Thu");
  });

  it("prefers total hours from upload when present", () => {
    const row = shapeAttendanceReportRow({
      attendanceDate: "2026-06-25",
      employeeCode: "E001",
      inTime: "09:00:00",
      outTime: "18:00:00",
      totalHours: "04:30:00",
      hasUploadRecord: true,
      firstName: "Jane",
      middleName: null,
      lastName: "Doe",
      departmentName: null,
      subDepartmentName: null,
      designationName: null,
      locationName: null,
      reportingManagerL2: null,
      reportingManagerL3: null,
    });

    assert.equal(row.grossWorkingHours, null);
    assert.equal(row.netWorkingHours, "4h 30m");
    assert.equal(row.attendanceStatus, "Half Day");
  });

  it("marks Absent when both punches missing and no calendar rules", () => {
    const row = shapeAttendanceReportRow({
      attendanceDate: "2026-06-25",
      employeeCode: "E001",
      inTime: null,
      outTime: null,
      totalHours: null,
      hasUploadRecord: true,
      firstName: "Jane",
      middleName: null,
      lastName: "Doe",
      departmentName: null,
      subDepartmentName: null,
      designationName: null,
      locationName: null,
      reportingManagerL2: null,
      reportingManagerL3: null,
    });

    assert.equal(row.attendanceStatus, "Absent");
    assert.equal(row.missPunch, "Yes");
  });

  it("marks Leave when approved leave on date overrides missing punches", () => {
    const ctx = emptyAttendanceDayContext();
    ctx.approvedLeave.set("2026-06-25", "full");
    const row = shapeAttendanceReportRow({
      attendanceDate: "2026-06-25",
      employeeCode: "E001",
      inTime: null,
      outTime: null,
      totalHours: null,
      hasUploadRecord: true,
      firstName: "Jane",
      middleName: null,
      lastName: "Doe",
      departmentName: null,
      subDepartmentName: null,
      designationName: null,
      locationName: null,
      reportingManagerL2: null,
      reportingManagerL3: null,
      dayContext: ctx,
    });

    assert.equal(row.attendanceStatus, "Leave");
  });

  it("shows empty attendance fields when no upload record exists", () => {
    const row = shapeAttendanceReportRow({
      attendanceDate: null,
      employeeCode: "E002",
      inTime: null,
      outTime: null,
      totalHours: null,
      hasUploadRecord: false,
      firstName: "John",
      middleName: null,
      lastName: "Smith",
      departmentName: "Sales",
      subDepartmentName: null,
      designationName: "Executive",
      locationName: "Delhi",
      reportingManagerL2: "Manager One",
      reportingManagerL3: null,
    });

    assert.equal(row.employeeName, "John Smith");
    assert.equal(row.date, null);
    assert.equal(row.firstLoginTime, null);
    assert.equal(row.lastLogoutTime, null);
    assert.equal(row.attendanceStatus, null);
    assert.equal(row.missPunch, null);
  });
});
