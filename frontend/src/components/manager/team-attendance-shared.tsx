import { employeeFilterLabelClass } from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

export type AttCellStatus = "P" | "A" | "L" | "HD" | "W" | "H" | "—";

export const AVATAR_CLASSES = [
  "bg-violet-600",
  "bg-teal-700",
  "bg-indigo-700",
  "bg-sky-700",
  "bg-pink-700",
  "bg-green-700",
  "bg-red-700",
  "bg-amber-700",
  "bg-blue-700",
  "bg-teal-600",
  "bg-violet-700",
  "bg-orange-700",
];

export const ATTENDANCE_STATUS_CLASS: Record<AttCellStatus, string> = {
  P: "bg-green-100 text-green-700",
  A: "bg-red-100 text-red-700",
  L: "bg-pink-100 text-[#ff014f]",
  HD: "bg-orange-100 text-orange-700",
  W: "bg-gray-100 text-gray-500",
  H: "bg-blue-100 text-blue-700",
  "—": "bg-gray-50 text-gray-400",
};

export const DETAIL_STATUS_CLASS: Record<string, string> = {
  Present: "text-green-700",
  Holiday: "text-blue-700",
  Weekend: "text-gray-500",
  Absent: "text-red-700",
  Leave: "text-[#ff014f]",
  "Half Day": "text-orange-700",
  "—": "text-gray-400",
};

export const tableHeadCellClass =
  "px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider";

export const tableHeadCellCenterClass =
  "px-3 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider";

export const tableBodyRowClass =
  "hover:bg-gray-50 transition-colors text-sm text-gray-700";

export const tableBodyCellClass = "px-6 py-4";

export const tableBodyCellCenterClass = "px-3 py-4 text-center";

export function avatarClassFor(empId: string) {
  let h = 0;
  for (const c of empId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_CLASSES[h % AVATAR_CLASSES.length];
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function mapAttendanceStatus(s: string): AttCellStatus {
  switch (s) {
    case "Present":
      return "P";
    case "Absent":
      return "A";
    case "Leave":
      return "L";
    case "Half Day":
      return "HD";
    case "Weekend":
      return "W";
    case "Holiday":
      return "H";
    default:
      return "—";
  }
}

export function AttendanceStatusBadge({ status }: { status: AttCellStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 text-xs font-medium rounded-full select-none",
        ATTENDANCE_STATUS_CLASS[status],
      )}
    >
      {status}
    </span>
  );
}

export function eachDateInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const cur = new Date(start);
  while (cur <= end) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function labelForDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const mon = dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${mon} ${String(d).padStart(2, "0")}`;
}

export function dayOfMonth(ymd: string) {
  return Number(ymd.slice(8, 10));
}

function weekdayShort(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
}

export interface TeamAttendanceGridMember {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
}

const gridHeadBaseClass =
  "flex items-center justify-center border-b border-r border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider";

const gridCellBaseClass =
  "flex items-center border-b border-r border-gray-100 min-h-[56px]";

const STATUS_LEGEND: Array<{ code: AttCellStatus; label: string }> = [
  { code: "P", label: "Present" },
  { code: "A", label: "Absent" },
  { code: "L", label: "Leave" },
  { code: "HD", label: "Half Day" },
  { code: "W", label: "Weekend" },
  { code: "H", label: "Holiday" },
  { code: "—", label: "No data" },
];

interface TeamAttendanceGridProps {
  team: TeamAttendanceGridMember[];
  dates: string[];
  todayYmd: string;
  statusFor: (empId: number, ymd: string) => AttCellStatus;
}

export function TeamAttendanceGrid({
  team,
  dates,
  todayYmd,
  statusFor,
}: TeamAttendanceGridProps) {
  const gridTemplateColumns = `minmax(240px, 280px) repeat(${dates.length}, minmax(52px, 1fr))`;

  return (
    <>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-fit w-full"
          style={{ gridTemplateColumns }}
        >
          <div
            className={cn(
              gridHeadBaseClass,
              "sticky left-0 z-20 justify-start px-6 py-4",
            )}
          >
            Employee
          </div>
          {dates.map((d) => (
            <div
              key={d}
              className={cn(
                gridHeadBaseClass,
                "flex-col gap-0.5 py-2 px-1",
                d === todayYmd && "text-[#ff014f]",
              )}
            >
              <span>{dayOfMonth(d)}</span>
              <span className="text-[10px] font-normal normal-case tracking-normal text-gray-400">
                {weekdayShort(d)}
              </span>
            </div>
          ))}

          {team.length === 0 ? (
            <div
              className="col-span-full px-6 py-10 text-center text-sm text-gray-400 border-b border-gray-100"
              style={{ gridColumn: "1 / -1" }}
            >
              No team members found.
            </div>
          ) : (
            team.map((m) => (
              <div key={m.id} className="contents group">
                <div
                  className={cn(
                    gridCellBaseClass,
                    "sticky left-0 z-10 bg-white px-6 py-3 group-hover:bg-gray-50 transition-colors",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                        avatarClassFor(m.empId),
                      )}
                    >
                      {initials(m.firstName, m.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 m-0 truncate">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-gray-400 m-0 truncate">
                        {m.designation ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
                {dates.map((d) => (
                  <div
                    key={d}
                    className={cn(
                      gridCellBaseClass,
                      "justify-center px-1 py-3 group-hover:bg-gray-50 transition-colors",
                    )}
                  >
                    <AttendanceStatusBadge status={statusFor(m.id, d)} />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100">
        <p className={cn(employeeFilterLabelClass, "mb-3")}>Status legend</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {STATUS_LEGEND.map(({ code, label }) => (
            <div key={code} className="flex items-center gap-2">
              <AttendanceStatusBadge status={code} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
