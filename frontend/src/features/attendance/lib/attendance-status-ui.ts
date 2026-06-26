/** Shared Tailwind classes for attendance status labels in tables. */
export function attendanceStatusCellClass(status: string | null): string {
  switch (status) {
    case "Present":
      return "text-emerald-700 font-medium";
    case "Absent":
      return "text-red-700 font-medium";
    case "Leave":
      return "text-blue-700 font-medium";
    case "Holiday":
      return "text-violet-700 font-medium";
    case "Weekend":
      return "text-slate-500 font-medium";
    case "Half Day":
      return "text-orange-700 font-medium";
    default:
      return "";
  }
}

export function formatAttendanceStatusLabel(status: string | null): string {
  if (!status) return "—";
  return status;
}
