export type UploadAttendanceRowInput = {
  attendanceDate: string | null;
  inTime: string | null;
  outTime: string | null;
  totalHours: string | null;
};

export type UploadAttendanceRecord = {
  date: string;
  inTime: string | null;
  outTime: string | null;
  totalHours: string | null;
};

export function formatUploadTimeValue(t: string | null): string | null {
  if (!t) return null;
  const parts = t.split(":");
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  const ss = (parts[2] ?? "00").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function mapUploadAttendanceRows(
  rows: UploadAttendanceRowInput[],
): UploadAttendanceRecord[] {
  return rows
    .filter((row) => row.attendanceDate != null)
    .map((row) => ({
      date: row.attendanceDate!,
      inTime: formatUploadTimeValue(row.inTime),
      outTime: formatUploadTimeValue(row.outTime),
      totalHours: formatUploadTimeValue(row.totalHours),
    }));
}
