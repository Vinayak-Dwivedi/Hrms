import { enterpriseFilterLabelClass } from "@/lib/branding";
import { cn } from "@/lib/utils";

export type AttCellStatus = "P" | "A" | "L" | "HD" | "W" | "H" | "—";

export const AVATAR_CLASSES = [
  "bg-violet-600",
  "bg-teal-700",
  "bg-indigo-700",
  "bg-sky-700",
  "bg-slate-700",
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
  L: "bg-blue-100 text-[lab(52%_28_-70)]",
  HD: "bg-orange-100 text-orange-700",
  W: "bg-slate-100 text-slate-500",
  H: "bg-blue-100 text-blue-700",
  "—": "bg-slate-50 text-slate-400",
};

export const DETAIL_STATUS_CLASS: Record<string, string> = {
  Present: "text-green-700",
  Holiday: "text-blue-700",
  Weekend: "text-slate-500",
  Absent: "text-red-700",
  Leave: "text-[lab(52%_28_-70)]",
  "Half Day": "text-orange-700",
  "—": "text-slate-400",
};

export const tableHeadCellClass =
  "px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider";

export const tableHeadCellCenterClass =
  "px-3 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider";

export const tableBodyRowClass =
  "hover:bg-slate-50 transition-colors text-sm text-slate-700";

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
  "flex items-center justify-center border-b border-r border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider";

const gridCellBaseClass =
  "flex items-center border-b border-r border-slate-100 min-h-[56px]";

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
                d === todayYmd && "text-[lab(52%_28_-70)] font-semibold",
              )}
            >
              <span>{dayOfMonth(d)}</span>
              <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
                {weekdayShort(d)}
              </span>
            </div>
          ))}

          {team.length === 0 ? (
            <div
              className="col-span-full px-6 py-10 text-center text-sm text-slate-400 border-b border-slate-100"
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
                    "sticky left-0 z-10 bg-white px-6 py-3 group-hover:bg-slate-50 transition-colors",
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
                      <p className="text-sm font-medium text-slate-900 m-0 truncate">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-slate-400 m-0 truncate">
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
                      "justify-center px-1 py-3 group-hover:bg-slate-50 transition-colors",
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

      <div className="px-6 py-4 border-t border-slate-100">
        <p className={cn(enterpriseFilterLabelClass, "mb-3")}>Status legend</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {STATUS_LEGEND.map(({ code, label }) => (
            <div key={code} className="flex items-center gap-2">
              <AttendanceStatusBadge status={code} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
