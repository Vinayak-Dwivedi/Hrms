import { API_BASE } from "@/lib/hrms-client";

export type AttendanceReportRow = {
  date: string | null;
  day: string | null;
  employeeId: string;
  employeeName: string;
  department: string | null;
  subDepartment: string | null;
  designation: string | null;
  location: string | null;
  reportingManagerL2: string | null;
  reportingManagerL3: string | null;
  shiftName: string | null;
  shiftTiming: string | null;
  attendanceStatus: string | null;
  firstLoginTime: string | null;
  lastLogoutTime: string | null;
  grossWorkingHours: string | null;
  breakTime: string | null;
  netWorkingHours: string | null;
  lateBy: string | null;
  earlyExit: string | null;
  overtimeHours: string | null;
  missPunch: string | null;
  regularizationStatus: string | null;
};

export type FetchTeamAttendanceReportParams = {
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type TeamAttendanceReportResult = {
  rows: AttendanceReportRow[];
  total: number;
  page: number;
  limit: number;
};

export type FetchMyAttendanceReportParams = {
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export type MyAttendanceReportResult = TeamAttendanceReportResult & {
  employeeId: string;
};

export async function fetchMyAttendanceReport(
  params: FetchMyAttendanceReportParams = {},
): Promise<MyAttendanceReportResult> {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set("fromDate", params.fromDate);
  if (params.toDate) qs.set("toDate", params.toDate);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE}/api/me/attendance/report?${qs}`, {
    credentials: "include",
  });

  const body = (await res.json().catch(() => ({}))) as MyAttendanceReportResult & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load attendance report.");
  }

  return {
    rows: body.rows ?? [],
    total: body.total ?? 0,
    page: body.page ?? 1,
    limit: body.limit ?? 25,
    employeeId: body.employeeId ?? "",
  };
}

export async function fetchTeamAttendanceReport(
  params: FetchTeamAttendanceReportParams = {},
): Promise<TeamAttendanceReportResult> {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set("fromDate", params.fromDate);
  if (params.toDate) qs.set("toDate", params.toDate);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetch(
    `${API_BASE}/api/manager/team/attendance-report?${qs}`,
    { credentials: "include" },
  );

  const body = (await res.json().catch(() => ({}))) as TeamAttendanceReportResult & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load attendance report.");
  }

  return {
    rows: body.rows ?? [],
    total: body.total ?? 0,
    page: body.page ?? 1,
    limit: body.limit ?? 25,
  };
}
