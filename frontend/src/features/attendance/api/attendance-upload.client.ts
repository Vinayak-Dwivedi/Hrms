import { API_BASE } from "@/lib/hrms-client";

export const ATTENDANCE_UPLOAD_HEADERS = [
  "Month",
  "Location",
  "Date",
  "Day",
  "Week Wise",
  "EMP Code",
  "Card No",
  "Emp Name",
  "Status",
  "Shift",
  "In Time",
  "Out Time",
  "Shift Hrs",
  "Wrk Hrs",
  "Designation",
  "Department",
] as const;

export type AttendanceUploadRowError = {
  row: number;
  error: string;
};

export type AttendanceUploadResult = {
  attendanceId?: number;
  uploaded: number;
  errors: AttendanceUploadRowError[];
};

export type AttendanceUploadRecord = {
  id: number;
  employeeCode: string;
  attendanceDate: string;
  inTime: string | null;
  outTime: string | null;
  uploadedAt: string;
  fileName: string;
};

export type ListAttendanceUploadsParams = {
  month?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type ListAttendanceUploadsResult = {
  rows: AttendanceUploadRecord[];
  total: number;
  page: number;
  limit: number;
};

export async function listAttendanceUploads(
  params: ListAttendanceUploadsParams = {},
): Promise<ListAttendanceUploadsResult> {
  const qs = new URLSearchParams();
  if (params.month) qs.set("month", params.month);
  if (params.date) qs.set("date", params.date);
  if (params.fromDate) qs.set("fromDate", params.fromDate);
  if (params.toDate) qs.set("toDate", params.toDate);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE}/api/attendance/uploads?${qs}`, {
    credentials: "include",
  });

  const body = (await res.json().catch(() => ({}))) as ListAttendanceUploadsResult & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load uploaded attendance.");
  }

  return {
    rows: body.rows ?? [],
    total: body.total ?? 0,
    page: body.page ?? 1,
    limit: body.limit ?? 25,
  };
}

export async function uploadAttendance(file: File): Promise<AttendanceUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/attendance/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = (await res.json().catch(() => ({}))) as {
    attendanceId?: number;
    uploaded?: number;
    errors?: AttendanceUploadRowError[];
    error?: { message?: string; details?: AttendanceUploadRowError[] };
  };

  if (!res.ok) {
    const message = body.error?.message ?? "Failed to upload attendance.";
    const err = new Error(message);
    if (body.error?.details) {
      (err as Error & { details?: AttendanceUploadRowError[] }).details =
        body.error.details;
    }
    throw err;
  }

  return {
    attendanceId: body.attendanceId,
    uploaded: body.uploaded ?? 0,
    errors: body.errors ?? [],
  };
}
