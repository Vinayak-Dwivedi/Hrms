export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  employeeId: string;
  avatarUrl?: string | null;
  email?: string | null;
  personalEmail?: string | null;
  workEmail?: string | null;
  personalEmailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  reportingManagerName?: string | null;
}

export interface AttendanceRecord {
  punchIn: string | null;
  punchOut: string | null;
  workingHours: string;
  shift: string;
  isCheckedIn: boolean;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  used: number;
  total: number;
  available: number;
  allowHalfDay?: boolean;
  minNoticeDays?: number;
  allowNegativeBalance?: boolean;
  requiresProofAfterDays?: number | null;
  maxContinuousDays?: number | null;
  isActive?: boolean;
}

export type HolidayType =
  | "National"
  | "Regional"
  | "Optional"
  | "Restricted"
  | "Festival";

export interface Holiday {
  id: string;
  name: string;
  month: string;
  day: string;
  year: string;
  type: HolidayType;
}

export const APP_VERSION = "v2.4";
export const APP_LOCATION = "Dehradun";

// ── Attendance Calendar ──────────────────────────────────────────────────────

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "HalfDay"
  | "Leave"
  | "LeavePending"
  | "Holiday"
  | "Weekend"
  | "Future";

export interface DayAttendance {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  punchIn?: string;
  punchOut?: string | null;
  hoursWorked?: string;
  holidayName?: string;
  lateBy?: string;
  earlyExit?: string;
  location?: string;
  leaveType?: string;
  approvedBy?: string;
  leaveRequestId?: string;
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export type LeaveStatus = "Pending" | "Approved" | "Cancelled" | "Rejected";

export interface LeaveDocument {
  url: string;
  name: string;
  kind: "image" | "pdf";
}

export interface LeaveRequest {
  id: string;
  appliedOn: string; // ISO datetime
  leaveType: string;
  leaveTypeCode: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: number; // 0.5 = half day, 1+ = full days
  isHalfDay: boolean;
  reason: string;
  status: LeaveStatus;
  statusReason?: string; // cancellation / approval note
  approvedOn: string; // ISO datetime
  documents?: LeaveDocument[];
}
