// Browser-side fetch helpers for /api/hrms/*. Each helper returns the
// shape the UI components already expect (see src/lib/dashboard.ts), so
// pages can swap mock arrays for the API response with minimal changes.

import type {
  AttendanceRecord as UIAttendanceRecord,
  DayAttendance,
  Employee as UIEmployee,
  LeaveRequest as UILeaveRequest,
  LeaveStatus,
  LeaveType as UILeaveType,
} from "./dashboard";

// Base URL of the hrms-api Express service (browser-visible).
//   - Dev / prod (recommended): leave empty — same-origin /api (Next rewrite or nginx).
//   - Direct API URL (cross-origin): only if you accept cookie/CORS constraints.
/** Empty in dev/prod when API is same-origin (Next rewrite or nginx). */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export function resolveApiAssetUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildUrl(path: string): string {
  // Route by prefix to the matching hrms-api router mount point.
  //   /me/...      → /api/me/...
  //   /manager/... → /api/manager/...
  //   anything else  → /api/hrms/<path>  (generic CRUD)
  if (path === "/me" || path.startsWith("/me/")) return `${API_BASE}/api${path}`;
  if (path === "/manager" || path.startsWith("/manager/")) return `${API_BASE}/api${path}`;
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    credentials: "include", // send/receive httpOnly auth cookies
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthSession {
  user: LoggedInUser;
  permissions: string[];
}

export async function signIn(
  loginId: string,
  password: string,
): Promise<LoggedInUser> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body?.error?.message ?? `Sign-in failed (${res.status})`);
  }
  const data = (await res.json()) as { user: LoggedInUser };
  return data.user;
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    /* swallow — caller redirects regardless */
  });
}

export async function fetchAuthSession(): Promise<AuthSession | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/auth/me failed: ${res.status}`);
  const data = (await res.json()) as {
    user: LoggedInUser;
    permissions?: string[];
  };
  return {
    user: data.user,
    permissions: data.permissions ?? [],
  };
}

/** @deprecated Use fetchAuthSession for permission-aware auth. */
export async function fetchAuthMe(): Promise<LoggedInUser | null> {
  const session = await fetchAuthSession();
  return session?.user ?? null;
}

// ───────────────────────────── /me ─────────────────────────────

interface MeResponse {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  email: string;
  personalEmail: string;
  personalEmailVerified?: boolean;
  personalEmailVerifiedAt?: string | null;
  workEmail: string | null;
  phone: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string | null;
  role: string | null;
  department: string | null;
  grade: string | null;
  branch: string | null;
  joiningDate: string;
  // Added by the extended /api/me — present for the profile page.
  middleName?: string | null;
  gender?: string | null;
  dob?: string | null;
  employmentType?: string | null;
  reportingManager?: string | null;
  reportingManagerEmpId?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export async function fetchCurrentEmployee(): Promise<UIEmployee> {
  const me = await jsonFetch<MeResponse>("/me");
  return {
    id: String(me.id),
    name: me.fullName,
    role: me.role ?? "Employee",
    initials: me.initials || me.empId.slice(0, 2).toUpperCase(),
    employeeId: me.empId,
    avatarUrl: resolveApiAssetUrl(me.avatarUrl),
    email: me.email,
    personalEmail: me.personalEmail,
    workEmail: me.workEmail,
    personalEmailVerified: me.personalEmailVerified ?? false,
    phone: me.phone,
    phoneVerified: me.phoneVerified ?? false,
  };
}

// ── My Profile (view/edit) ────────────────────────────────────────────────────

export interface MyProfile {
  id: number;
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  email: string;
  personalEmail: string;
  personalEmailVerified: boolean;
  personalEmailVerifiedAt: string | null;
  workEmail: string | null;
  phone: string;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
  gender: string | null;
  dob: string | null;
  designation: string | null;
  department: string | null;
  grade: string | null;
  branch: string | null;
  employmentType: string | null;
  reportingManager: string | null;
  joiningDate: string;
  currentAddress: string | null;
  permanentAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export async function fetchMyProfile(): Promise<MyProfile> {
  const me = await jsonFetch<MeResponse>("/me");
  return {
    id: me.id,
    empId: me.empId,
    firstName: me.firstName,
    middleName: me.middleName ?? null,
    lastName: me.lastName,
    fullName: me.fullName,
    initials: me.initials || me.empId.slice(0, 2).toUpperCase(),
    avatarUrl: resolveApiAssetUrl(me.avatarUrl),
    email: me.email,
    personalEmail: me.personalEmail,
    personalEmailVerified: me.personalEmailVerified ?? false,
    personalEmailVerifiedAt: me.personalEmailVerifiedAt ?? null,
    workEmail: me.workEmail,
    phone: me.phone,
    phoneVerified: me.phoneVerified ?? false,
    phoneVerifiedAt: me.phoneVerifiedAt ?? null,
    gender: me.gender ?? null,
    dob: me.dob ?? null,
    designation: me.role ?? null,
    department: me.department ?? null,
    grade: me.grade ?? null,
    branch: me.branch ?? null,
    employmentType: me.employmentType ?? null,
    reportingManager: me.reportingManager ?? null,
    joiningDate: me.joiningDate,
    currentAddress: me.currentAddress ?? null,
    permanentAddress: me.permanentAddress ?? null,
    emergencyContactName: me.emergencyContactName ?? null,
    emergencyContactPhone: me.emergencyContactPhone ?? null,
  };
}

export interface UpdateMyProfileInput {
  phone: string;
  personalEmail: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export async function updateMyProfile(
  input: UpdateMyProfileInput,
): Promise<void> {
  await jsonFetch<{ ok: boolean }>("/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ────────────────────── attendance / punch card ─────────────────────

interface RawAttendance {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  workingMinutes: number | null;
  lateByMinutes: number;
  earlyExitMinutes: number;
  status: string;
  location: string | null;
}

// Format a "HH:MM:SS" string (from postgres time column) as 24-hour HH:MM
// (military time). Single source of truth for punch-time display across the
// dashboard, attendance calendar, attendance table, and manager report.
function formatTimeOfDay(t: string | null): string | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatMinutes(min: number | null | undefined): string {
  if (!min || min <= 0) return "0h 0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export async function fetchTodayAttendance(): Promise<UIAttendanceRecord> {
  const data = await jsonFetch<{ record: RawAttendance | null }>(
    "/me/attendance/today",
  );
  const r = data.record;
  if (!r) {
    return {
      punchIn: null,
      punchOut: null,
      workingHours: "0h 0m",
      shift: "9:00 – 6:00",
      isCheckedIn: false,
    };
  }
  return {
    punchIn: formatTimeOfDay(r.punchIn),
    punchOut: formatTimeOfDay(r.punchOut),
    workingHours: formatMinutes(r.workingMinutes),
    shift: "9:00 – 6:00",
    isCheckedIn: Boolean(r.punchIn && !r.punchOut),
  };
}

export async function punchIn(): Promise<UIAttendanceRecord> {
  await jsonFetch<{ record: RawAttendance }>("/me/punch-in", { method: "POST" });
  return fetchTodayAttendance();
}

export async function punchOut(): Promise<UIAttendanceRecord> {
  await jsonFetch<{ record: RawAttendance }>("/me/punch-out", { method: "POST" });
  return fetchTodayAttendance();
}

// ───────────────────── attendance calendar ────────────────────────

function mapAttStatus(s: string): DayAttendance["status"] {
  switch (s) {
    case "Present":
      return "Present";
    case "Absent":
      return "Absent";
    case "Half Day":
      return "HalfDay";
    case "Leave":
      return "Leave";
    case "Holiday":
      return "Holiday";
    case "Weekend":
      return "Weekend";
    default:
      return "Present";
  }
}

interface MonthHolidayRow {
  id: number;
  date: string;
  name: string;
  type: string;
  isHalfDay: boolean;
}

export async function fetchMonthAttendance(
  year: number,
  month1: number,
): Promise<DayAttendance[]> {
  const data = await jsonFetch<{
    records: RawAttendance[];
    holidays?: MonthHolidayRow[];
  }>(`/me/attendance/month?year=${year}&month=${month1}`);

  const attendance = data.records.map<DayAttendance>((r) => ({
    date: r.date,
    status: mapAttStatus(r.status),
    punchIn: formatTimeOfDay(r.punchIn) ?? undefined,
    punchOut: formatTimeOfDay(r.punchOut),
    hoursWorked: formatMinutes(r.workingMinutes),
    lateBy: r.lateByMinutes ? `${r.lateByMinutes}m` : undefined,
    earlyExit: r.earlyExitMinutes ? `${r.earlyExitMinutes}m` : undefined,
    location: r.location ?? undefined,
  }));

  // Merge holidays in. An actual attendance record (Present, Leave, etc.)
  // wins over a Holiday cell — if the employee worked on a designated
  // holiday, the calendar should show the real attendance.
  const haveAttendance = new Set(attendance.map((a) => a.date));
  const holidayDays = (data.holidays ?? [])
    .filter((h) => !haveAttendance.has(h.date))
    .map<DayAttendance>((h) => ({
      date: h.date,
      status: "Holiday",
      holidayName: h.name,
    }));

  return [...attendance, ...holidayDays].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

// ───────────────────────── leave ─────────────────────────────────

interface RawLeaveRequest {
  id: number;
  fromDate: string;
  toDate: string;
  days: string;
  durationType: "Full Day" | "First Half" | "Second Half";
  reason: string;
  status: string;
  appliedOn: string;
  managerDecidedAt: string | null;
  hrDecidedAt: string | null;
  createdAt: string;
  leaveTypeName: string;
  leaveTypeCode: string;
}

function mapLeaveStatus(s: string): LeaveStatus {
  if (s === "Approved") return "Approved";
  if (s === "Rejected") return "Rejected";
  if (s === "Cancelled") return "Cancelled";
  // Pending / Forwarded → treated as Pending in the employee view
  return "Pending";
}

export async function fetchMyLeaveRequests(): Promise<UILeaveRequest[]> {
  const data = await jsonFetch<{ requests: RawLeaveRequest[] }>(
    "/me/leave-requests",
  );
  return data.requests.map((r) => {
    const decidedAt = r.hrDecidedAt ?? r.managerDecidedAt ?? r.createdAt;
    return {
      id: String(r.id),
      appliedOn: r.appliedOn,
      leaveType: r.leaveTypeName as UILeaveRequest["leaveType"],
      leaveTypeCode: r.leaveTypeCode,
      startDate: r.fromDate,
      endDate: r.toDate,
      duration: Number(r.days),
      isHalfDay: r.durationType !== "Full Day",
      reason: r.reason,
      status: mapLeaveStatus(r.status),
      approvedOn: decidedAt,
    };
  });
}

export async function cancelLeaveRequest(id: string): Promise<void> {
  await jsonFetch(`/me/leave-requests/${id}/cancel`, { method: "POST" });
}

export interface SubmitLeaveInput {
  leaveTypeCode: string;
  fromDate: string;
  toDate: string;
  days: number;
  durationType: "Full Day" | "First Half" | "Second Half";
  reason: string;
}

export async function submitLeaveRequest(input: SubmitLeaveInput): Promise<void> {
  await jsonFetch("/me/leave-requests", {
    method: "POST",
    body: JSON.stringify({
      leaveTypeCode: input.leaveTypeCode,
      fromDate: input.fromDate,
      toDate: input.toDate,
      days: input.days,
      durationType: input.durationType,
      reason: input.reason,
    }),
  });
}

// ─────────────────── Regularisation ───────────────────

export interface SubmitRegularisationInput {
  date: string;
  requestedPunchIn: string; // HH:MM:SS or HH:MM (server expects HH:MM:SS)
  requestedPunchOut: string;
  reason: string;
  originalIssue?: string;
}

export async function submitRegularisationRequest(
  input: SubmitRegularisationInput,
  scope: "employee" | "manager" = "employee",
): Promise<void> {
  const base = scope === "manager" ? "/manager/me" : "/me";
  await jsonFetch(`${base}/regularisation-requests`, {
    method: "POST",
    body: JSON.stringify({
      date: input.date,
      requestedPunchIn:
        input.requestedPunchIn.length === 5
          ? `${input.requestedPunchIn}:00`
          : input.requestedPunchIn,
      requestedPunchOut:
        input.requestedPunchOut.length === 5
          ? `${input.requestedPunchOut}:00`
          : input.requestedPunchOut,
      reason: input.reason,
      originalIssue: input.originalIssue,
    }),
  });
}

export interface MyRegularisationRow {
  id: number;
  date: string;
  originalIssue: string | null;
  requestedPunchIn: string;
  requestedPunchOut: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approverRemarks: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export async function fetchMyRegularisationRequests(
  scope: "employee" | "manager" = "employee",
): Promise<MyRegularisationRow[]> {
  const base = scope === "manager" ? "/manager/me" : "/me";
  const data = await jsonFetch<{ requests: MyRegularisationRow[] }>(
    `${base}/regularisation-requests`,
  );
  return data.requests;
}

// ────────────────────── leave balances (dashboard side panel) ──────────────

interface RawLeaveBalance {
  leaveTypeId: number;
  name: string;
  code: string;
  openingBalance: string;
  used: string;
  closingBalance: string;
}

export async function fetchMyLeaveBalances(): Promise<UILeaveType[]> {
  const data = await jsonFetch<{ balances: RawLeaveBalance[] }>(
    "/me/leave-balances",
  );
  return data.balances.map((b) => ({
    id: String(b.leaveTypeId),
    name: b.name,
    code: b.code,
    used: Number(b.used),
    total: Number(b.openingBalance),
    available: Number(b.closingBalance),
  }));
}

// ────────────────────── upcoming holidays ──────────────────────────────────

export interface UpcomingHoliday {
  id: number;
  date: string; // YYYY-MM-DD
  name: string;
  type: "National" | "Regional" | "Optional" | "Restricted" | "Festival";
  branchId: number | null;
  isHalfDay?: boolean;
}

export async function fetchUpcomingHolidays(
  limit = 5,
): Promise<UpcomingHoliday[]> {
  const data = await jsonFetch<{ holidays: UpcomingHoliday[] }>(
    `/me/holidays?upcoming=true&limit=${limit}`,
  );
  return data.holidays;
}

// ────────────────────── weekly attendance rollup ───────────────────────────

export interface WeekAttendanceTotals {
  totalWorkingMinutes: number;
  present: number;
  absent: number;
  onLeave: number;
  lateArrivals: number;
}

export interface WeekAttendanceDay {
  date: string;
  dayLabel: string;
  record: RawAttendance | null;
}

export type AttendanceWindow = "7d" | "30d";

export interface WeekChartPoint {
  label: string;          // "Mon" / "Tue" for 7d, "May 8" / "May 14" for 30d
  presentMins: number;    // sum of working minutes within the bucket
  absentCount: number;    // count of Absent days within the bucket
  leaveCount: number;     // count of Leave days within the bucket
}

export interface WeekAttendance {
  weekStart: string;
  weekEnd: string;
  window: AttendanceWindow;
  days: WeekAttendanceDay[];
  chartPoints: WeekChartPoint[];
  totals: WeekAttendanceTotals;
}

export async function fetchWeekAttendance(
  anchorDate?: string,
  window: AttendanceWindow = "7d",
): Promise<WeekAttendance> {
  const params = new URLSearchParams();
  if (anchorDate) params.set("date", anchorDate);
  if (window === "30d") params.set("window", "30");
  const qs = params.toString() ? `?${params.toString()}` : "";
  return jsonFetch<WeekAttendance>(`/me/attendance/week${qs}`);
}

// ═══════════════════════════ Manager view ═══════════════════════════

export async function fetchCurrentManager(): Promise<UIEmployee> {
  const me = await jsonFetch<MeResponse>("/manager/me");
  return {
    id: String(me.id),
    name: me.fullName,
    role: me.role ?? "Manager",
    initials: me.initials || me.empId.slice(0, 2).toUpperCase(),
    employeeId: me.empId,
    avatarUrl: me.avatarUrl ?? null,
    email: me.email,
    personalEmail: me.personalEmail,
    workEmail: me.workEmail,
    phone: me.phone,
  };
}

export async function fetchManagerTodayAttendance(): Promise<UIAttendanceRecord> {
  const data = await jsonFetch<{ record: RawAttendance | null }>(
    "/manager/me/attendance/today",
  );
  const r = data.record;
  if (!r) {
    return {
      punchIn: null,
      punchOut: null,
      workingHours: "0h 0m",
      shift: "9:00 – 6:00",
      isCheckedIn: false,
    };
  }
  return {
    punchIn: formatTimeOfDay(r.punchIn),
    punchOut: formatTimeOfDay(r.punchOut),
    workingHours: formatMinutes(r.workingMinutes),
    shift: "9:00 – 6:00",
    isCheckedIn: Boolean(r.punchIn && !r.punchOut),
  };
}

export async function fetchManagerMonthAttendance(
  year: number,
  month1: number,
): Promise<DayAttendance[]> {
  const data = await jsonFetch<{ records: RawAttendance[] }>(
    `/manager/me/attendance/month?year=${year}&month=${month1}`,
  );
  return data.records.map((r) => ({
    date: r.date,
    status: mapAttStatus(r.status),
    punchIn: formatTimeOfDay(r.punchIn) ?? undefined,
    punchOut: formatTimeOfDay(r.punchOut),
    hoursWorked: formatMinutes(r.workingMinutes),
    lateBy: r.lateByMinutes ? `${r.lateByMinutes}m` : undefined,
    earlyExit: r.earlyExitMinutes ? `${r.earlyExitMinutes}m` : undefined,
    location: r.location ?? undefined,
  }));
}

export async function fetchManagerLeaveRequests(): Promise<UILeaveRequest[]> {
  const data = await jsonFetch<{ requests: RawLeaveRequest[] }>(
    "/manager/me/leave-requests",
  );
  return data.requests.map((r) => ({
    id: String(r.id),
    appliedOn: r.appliedOn,
    leaveType: r.leaveTypeName as UILeaveRequest["leaveType"],
    leaveTypeCode: r.leaveTypeCode,
    startDate: r.fromDate,
    endDate: r.toDate,
    duration: Number(r.days),
    isHalfDay: r.durationType !== "Full Day",
    reason: r.reason,
    status: mapLeaveStatus(r.status),
    approvedOn: r.hrDecidedAt ?? r.managerDecidedAt ?? r.createdAt,
  }));
}

export async function fetchManagerLeaveBalances(): Promise<UILeaveType[]> {
  const data = await jsonFetch<{ balances: RawLeaveBalance[] }>(
    "/manager/me/leave-balances",
  );
  return data.balances.map((b) => ({
    id: String(b.leaveTypeId),
    name: b.name,
    code: b.code,
    used: Number(b.used),
    total: Number(b.openingBalance),
    available: Number(b.closingBalance),
  }));
}

// ───────────────── Team ─────────────────

export interface TeamMember {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  grade: string | null;
  dob: string;
  joiningDate: string;
  profilePhotoUrl: string | null;
}

export interface TeamAttrition {
  from: string;
  to: string;
  count: number;
  teamSize: number;
  percentage: number;
}

export async function fetchTeamAttrition(
  from?: string,
  to?: string,
): Promise<TeamAttrition> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const qs = q.toString();
  return jsonFetch<TeamAttrition>(
    `/manager/team/attrition${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchTeam(): Promise<TeamMember[]> {
  const data = await jsonFetch<{ team: TeamMember[] }>("/manager/team");
  return data.team;
}

export interface TeamAttendanceResponse {
  from: string;
  to: string;
  team: Array<{
    id: number;
    empId: string;
    firstName: string;
    lastName: string;
    designation: string | null;
  }>;
  records: Array<{
    employeeId: number;
    date: string;
    punchIn: string | null;
    punchOut: string | null;
    workingMinutes: number | null;
    lateByMinutes: number;
    earlyExitMinutes: number;
    status: string;
    location: string | null;
  }>;
}

export async function fetchTeamAttendance(
  from?: string,
  to?: string,
): Promise<TeamAttendanceResponse> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const qs = q.toString();
  return jsonFetch<TeamAttendanceResponse>(
    `/manager/team/attendance${qs ? `?${qs}` : ""}`,
  );
}

// ───────────────── Leave approvals ─────────────────

export interface ApprovalLeaveRequest {
  id: number;
  employeeId: number;
  empId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  leaveTypeName: string;
  leaveTypeCode: string;
  fromDate: string;
  toDate: string;
  days: string;
  durationType: "Full Day" | "First Half" | "Second Half";
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Forwarded" | "Cancelled";
  appliedOn: string;
  managerDecision: string | null;
  managerDecidedAt: string | null;
  managerRemarks: string | null;
}

export async function fetchLeaveApprovals(
  status?: "all" | "pending" | "approved" | "rejected" | "forwarded",
): Promise<ApprovalLeaveRequest[]> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  const data = await jsonFetch<{ requests: ApprovalLeaveRequest[] }>(
    `/manager/leave-approvals${qs}`,
  );
  return data.requests;
}

export async function approveLeaveRequest(id: number) {
  await jsonFetch(`/manager/leave-approvals/${id}/approve`, { method: "POST" });
}

export async function rejectLeaveRequest(id: number, remarks?: string) {
  await jsonFetch(`/manager/leave-approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks }),
  });
}

export async function forwardLeaveRequest(id: number) {
  await jsonFetch(`/manager/leave-approvals/${id}/forward`, { method: "POST" });
}

// ───────────────── Regularisation approvals ─────────────────

export interface ApprovalRegRequest {
  id: number;
  employeeId: number;
  empId: string;
  firstName: string;
  lastName: string;
  date: string;
  originalIssue: string | null;
  requestedPunchIn: string;
  requestedPunchOut: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approverRemarks: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export async function fetchRegularisationApprovals(
  status?: "all" | "pending" | "approved" | "rejected",
): Promise<ApprovalRegRequest[]> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  const data = await jsonFetch<{ requests: ApprovalRegRequest[] }>(
    `/manager/regularisation-approvals${qs}`,
  );
  return data.requests;
}

export async function approveRegRequest(id: number) {
  await jsonFetch(`/manager/regularisation-approvals/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectRegRequest(id: number, remarks?: string) {
  await jsonFetch(`/manager/regularisation-approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks }),
  });
}

// ═══════════════════ Org Setup → Locations (HR) ═══════════════════
// Backed by the generic CRUD endpoints at /api/hrms/locations.

export interface Location {
  id: number;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
}

export interface LocationInput {
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await jsonFetch<{ data: Location[] }>("/locations?limit=500");
  return res.data;
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const res = await jsonFetch<{ data: Location }>("/locations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateLocation(
  id: number,
  input: LocationInput,
): Promise<Location> {
  const res = await jsonFetch<{ data: Location }>(`/locations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteLocation(id: number): Promise<void> {
  await jsonFetch(`/locations/${id}`, { method: "DELETE" });
}

// ═══════════════════ Org Setup → Departments (HR) ═══════════════════
// Backed by the generic CRUD endpoints at /api/hrms/departments. The
// department "lead" is the table's managerId (an employee id); lead name/role
// are resolved client-side from the employees + designations endpoints.

export interface DepartmentApi {
  id: number;
  name: string;
  code: string | null;
  managerId: number | null;
}

export interface DepartmentInput {
  name: string;
  code: string;
  managerId: number | null;
}

export interface DeptLeadOption {
  id: number;
  name: string;
  role: string | null;
  empCode: string;
}

export async function fetchDepartments(): Promise<DepartmentApi[]> {
  const res = await jsonFetch<{ data: DepartmentApi[] }>(
    "/departments?limit=500",
  );
  return res.data;
}

interface RawEmployeeLite {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  designationId: number | null;
}

// Employees resolved into department-lead options (name + designation + empId).
export async function fetchDeptLeadOptions(): Promise<DeptLeadOption[]> {
  const [empRes, desigRes] = await Promise.all([
    jsonFetch<{ data: RawEmployeeLite[] }>("/employees?limit=500"),
    jsonFetch<{ data: Array<{ id: number; name: string }> }>(
      "/designations?limit=500",
    ),
  ]);
  const desigById = new Map(desigRes.data.map((d) => [d.id, d.name]));
  return empRes.data
    .map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`.trim(),
      role:
        e.designationId != null
          ? (desigById.get(e.designationId) ?? null)
          : null,
      empCode: e.empId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createDepartment(
  input: DepartmentInput,
): Promise<DepartmentApi> {
  const res = await jsonFetch<{ data: DepartmentApi }>("/departments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateDepartment(
  id: number,
  input: DepartmentInput,
): Promise<DepartmentApi> {
  const res = await jsonFetch<{ data: DepartmentApi }>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await jsonFetch(`/departments/${id}`, { method: "DELETE" });
}

// ═══════════════════ Org Setup → Designations (HR) ═══════════════════
// Backed by the generic CRUD endpoints at /api/hrms/designations. The single
// "grade" shown in the UI maps to the table's gradeMin/gradeMax pair (same id
// in both = exactly this grade). Head count is the read-only employeeCount,
// maintained by the backend from employees in the designation.

export interface DesignationApi {
  id: number;
  name: string;
  code: string | null;
  gradeMinId: number | null;
  gradeMaxId: number | null;
  employeeCount: number;
}

export interface DesignationInput {
  name: string;
  code: string;
  gradeMinId: number | null;
  gradeMaxId: number | null;
}

export interface GradeOption {
  id: number;
  code: string;
  bandName: string;
}

export async function fetchDesignations(): Promise<DesignationApi[]> {
  const res = await jsonFetch<{ data: DesignationApi[] }>(
    "/designations?limit=500",
  );
  return res.data;
}

export async function fetchGrades(): Promise<GradeOption[]> {
  const res = await jsonFetch<{ data: GradeOption[] }>("/grades?limit=500");
  return res.data
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function createDesignation(
  input: DesignationInput,
): Promise<DesignationApi> {
  const res = await jsonFetch<{ data: DesignationApi }>("/designations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateDesignation(
  id: number,
  input: DesignationInput,
): Promise<DesignationApi> {
  const res = await jsonFetch<{ data: DesignationApi }>(`/designations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteDesignation(id: number): Promise<void> {
  await jsonFetch(`/designations/${id}`, { method: "DELETE" });
}
