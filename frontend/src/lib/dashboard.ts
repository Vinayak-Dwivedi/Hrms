export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  employeeId: string;
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
}

export type HolidayType = "National" | "Regional" | "Optional";

export interface Holiday {
  id: string;
  name: string;
  month: string;
  day: string;
  year: string;
  type: HolidayType;
}

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export const mockEmployee: Employee = {
  id: "1",
  name: "Rahul Mehta",
  role: "Senior Associate",
  initials: "RM",
  employeeId: "ILD-2847",
};

export const mockManager: Employee = {
  id: "2",
  name: "Priya Sharma",
  role: "Process Manager",
  initials: "PS",
  employeeId: "ILD-1042",
};

export const mockAttendance: AttendanceRecord = {
  punchIn: "9:04 AM",
  punchOut: null,
  workingHours: "3h 43m",
  shift: "9:00 – 6:00",
  isCheckedIn: true,
};

export const mockLeaveBalance: LeaveType[] = [
  { id: "1", name: "Annual Leave", code: "AL", used: 6, total: 18, available: 12 },
  { id: "2", name: "Sick Leave", code: "SL", used: 2, total: 8, available: 6 },
  { id: "3", name: "Casual Leave", code: "CL", used: 1, total: 6, available: 5 },
  { id: "4", name: "Compensatory Off", code: "CO", used: 0, total: 4, available: 4 },
];

export const mockHolidays: Holiday[] = [
  { id: "1", name: "Eid Al-Adha", month: "Jun", day: "7", year: "2026", type: "National" },
  { id: "2", name: "Garhwali Diwas", month: "Jun", day: "15", year: "2026", type: "Regional" },
  { id: "3", name: "Rath Yatra", month: "Jul", day: "4", year: "2026", type: "Optional" },
];

export const mockNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Attendance", href: "/attendance" },
  { label: "Leave", href: "/leave" },
];

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
}

export const mockAttendanceCalendar: DayAttendance[] = [
  // Week 1
  { date: "2026-05-01", status: "Holiday", holidayName: "Labour Day" },
  { date: "2026-05-02", status: "Present", punchIn: "9:00 AM", punchOut: "6:34 PM", hoursWorked: "8h 32m", location: "iLeads Dehradun HQ" },
  // Week 2
  { date: "2026-05-05", status: "Present", punchIn: "9:00 AM", punchOut: "6:38 PM", hoursWorked: "8h 38m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-06", status: "Present", punchIn: "9:00 AM", punchOut: "6:35 PM", hoursWorked: "8h 35m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-07", status: "Present", punchIn: "9:00 AM", punchOut: "6:48 PM", hoursWorked: "8h 48m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-08", status: "Leave", leaveType: "Annual Leave", approvedBy: "Priya Sharma" },
  { date: "2026-05-09", status: "Present", punchIn: "9:00 AM", punchOut: "6:45 PM", hoursWorked: "8h 45m", location: "iLeads Dehradun HQ" },
  // Week 3
  { date: "2026-05-12", status: "Present", punchIn: "9:14 AM", punchOut: "7:05 PM", hoursWorked: "8h 51m", lateBy: "14m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-13", status: "Present", punchIn: "9:00 AM", punchOut: "6:52 PM", hoursWorked: "8h 52m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-14", status: "Present", punchIn: "9:00 AM", punchOut: "6:33 PM", hoursWorked: "8h 33m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-15", status: "Present", punchIn: "9:00 AM", punchOut: "6:54 PM", hoursWorked: "8h 54m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-16", status: "HalfDay", punchIn: "9:08 AM", punchOut: "1:20 PM", hoursWorked: "4h 12m", lateBy: "8m", earlyExit: "4h 40m", location: "iLeads Dehradun HQ" },
  // Week 4
  { date: "2026-05-19", status: "Present", punchIn: "9:00 AM", punchOut: "6:50 PM", hoursWorked: "8h 50m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-20", status: "Leave", leaveType: "Sick Leave", approvedBy: "Priya Sharma" },
  { date: "2026-05-21", status: "Leave", leaveType: "Annual Leave", approvedBy: "Priya Sharma" },
  { date: "2026-05-22", status: "Present", punchIn: "9:07 AM", punchOut: "6:45 PM", hoursWorked: "8h 38m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-23", status: "Absent" },
  // Week 5
  { date: "2026-05-26", status: "Present", punchIn: "9:12 AM", punchOut: "6:43 PM", hoursWorked: "8h 31m", lateBy: "12m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-27", status: "Present", punchIn: "9:00 AM", punchOut: "6:52 PM", hoursWorked: "8h 52m", location: "iLeads Dehradun HQ" },
  { date: "2026-05-28", status: "Present", punchIn: "9:00 AM", punchOut: null, hoursWorked: "8h 32m", location: "iLeads Dehradun HQ" },
];

export const mockAttendanceNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Attendance", href: "/attendance", active: true },
  { label: "Leave", href: "/leave" },
];

// ── Leave Requests ────────────────────────────────────────────────────────────

export type LeaveStatus = "Pending" | "Approved" | "Cancelled" | "Rejected";
export type LeaveTypeName =
  | "Earned Leave"
  | "Casual Leave"
  | "Sick Leave"
  | "Compensatory Off"
  | "Unpaid Leave";

export interface LeaveRequest {
  id: string;
  appliedOn: string;      // ISO datetime
  leaveType: LeaveTypeName;
  leaveTypeCode: string;
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  duration: number;       // 0.5 = half day, 1+ = full days
  isHalfDay: boolean;
  reason: string;
  status: LeaveStatus;
  statusReason?: string;  // cancellation / approval note
  approvedOn: string;     // ISO datetime
}

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: "1",
    appliedOn: "2026-05-13T10:30:00",
    leaveType: "Casual Leave",
    leaveTypeCode: "CL",
    startDate: "2026-05-13",
    endDate: "2026-05-13",
    duration: 0.5,
    isHalfDay: true,
    reason: "test",
    status: "Pending",
    approvedOn: "2026-05-27T16:54:00",
  },
  {
    id: "2",
    appliedOn: "2026-06-04T09:00:00",
    leaveType: "Earned Leave",
    leaveTypeCode: "EL",
    startDate: "2026-06-04",
    endDate: "2026-06-04",
    duration: 1,
    isHalfDay: false,
    reason: "Test",
    status: "Pending",
    approvedOn: "2026-04-13T12:09:00",
  },
  {
    id: "3",
    appliedOn: "2026-04-16T08:45:00",
    leaveType: "Earned Leave",
    leaveTypeCode: "EL",
    startDate: "2026-04-16",
    endDate: "2026-04-16",
    duration: 1,
    isHalfDay: false,
    reason: "Testing",
    status: "Cancelled",
    statusReason: "Test",
    approvedOn: "2026-04-13T11:32:00",
  },
  {
    id: "4",
    appliedOn: "2026-04-16T08:30:00",
    leaveType: "Earned Leave",
    leaveTypeCode: "EL",
    startDate: "2026-04-16",
    endDate: "2026-04-16",
    duration: 1,
    isHalfDay: false,
    reason: "Testing",
    status: "Cancelled",
    statusReason: "[Employee] Cancelled while pending approval due to change in schedule",
    approvedOn: "2026-04-13T11:28:00",
  },
  {
    id: "5",
    appliedOn: "2026-05-12T09:15:00",
    leaveType: "Earned Leave",
    leaveTypeCode: "EL",
    startDate: "2026-05-12",
    endDate: "2026-05-12",
    duration: 0.5,
    isHalfDay: true,
    reason: "Testing",
    status: "Pending",
    approvedOn: "2026-04-13T11:24:00",
  },
  {
    id: "6",
    appliedOn: "2026-05-07T10:00:00",
    leaveType: "Casual Leave",
    leaveTypeCode: "CL",
    startDate: "2026-05-07",
    endDate: "2026-05-07",
    duration: 0.5,
    isHalfDay: true,
    reason: "Testing",
    status: "Approved",
    statusReason: "Testing",
    approvedOn: "2026-04-13T11:24:00",
  },
  {
    id: "7",
    appliedOn: "2026-03-31T11:00:00",
    leaveType: "Casual Leave",
    leaveTypeCode: "CL",
    startDate: "2026-03-31",
    endDate: "2026-03-31",
    duration: 0.5,
    isHalfDay: true,
    reason: "Test",
    status: "Pending",
    approvedOn: "2026-04-13T11:22:00",
  },
  {
    id: "8",
    appliedOn: "2026-04-15T09:30:00",
    leaveType: "Casual Leave",
    leaveTypeCode: "CL",
    startDate: "2026-04-15",
    endDate: "2026-04-15",
    duration: 1,
    isHalfDay: false,
    reason: "Testing",
    status: "Pending",
    approvedOn: "2026-04-13T11:20:00",
  },
  {
    id: "9",
    appliedOn: "2026-03-30T09:00:00",
    leaveType: "Earned Leave",
    leaveTypeCode: "EL",
    startDate: "2026-03-30",
    endDate: "2026-03-30",
    duration: 1,
    isHalfDay: false,
    reason: "Testing",
    status: "Pending",
    approvedOn: "2026-04-13T11:20:00",
  },
  {
    id: "10",
    appliedOn: "2026-04-02T10:00:00",
    leaveType: "Casual Leave",
    leaveTypeCode: "CL",
    startDate: "2026-04-02",
    endDate: "2026-04-02",
    duration: 1,
    isHalfDay: false,
    reason: "fbgfdgbfd",
    status: "Cancelled",
    statusReason: "Test",
    approvedOn: "2026-04-01T10:02:00",
  },
  {
    id: "11",
    appliedOn: "2026-02-10T09:00:00",
    leaveType: "Sick Leave",
    leaveTypeCode: "SL",
    startDate: "2026-02-18",
    endDate: "2026-02-20",
    duration: 3,
    isHalfDay: false,
    reason: "Flu and fever",
    status: "Approved",
    statusReason: "Get well soon",
    approvedOn: "2026-02-10T14:30:00",
  },
  {
    id: "12",
    appliedOn: "2026-01-20T11:00:00",
    leaveType: "Compensatory Off",
    leaveTypeCode: "CO",
    startDate: "2026-01-19",
    endDate: "2026-01-21",
    duration: 3,
    isHalfDay: false,
    reason: "Worked on weekend",
    status: "Approved",
    approvedOn: "2026-01-20T15:00:00",
  },
  {
    id: "13",
    appliedOn: "2026-03-05T10:00:00",
    leaveType: "Earned Leave",
    leaveTypeCode: "EL",
    startDate: "2026-03-18",
    endDate: "2026-03-20",
    duration: 3,
    isHalfDay: false,
    reason: "Family function",
    status: "Pending",
    approvedOn: "2026-03-05T10:00:00",
  },
  {
    id: "14",
    appliedOn: "2026-04-01T09:00:00",
    leaveType: "Casual Leave",
    leaveTypeCode: "CL",
    startDate: "2026-04-19",
    endDate: "2026-04-21",
    duration: 3,
    isHalfDay: false,
    reason: "Personal work",
    status: "Cancelled",
    statusReason: "Plans changed",
    approvedOn: "2026-04-01T09:30:00",
  },
];

export const mockLeaveNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Attendance", href: "/attendance" },
  { label: "Leave", href: "/leave", active: true },
];
