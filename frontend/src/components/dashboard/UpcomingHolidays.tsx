import type { Holiday, HolidayType } from "@/lib/dashboard";

interface UpcomingHolidaysProps {
  holidays: Holiday[];
}

const TYPE_STYLES: Record<HolidayType, { background: string; color: string }> = {
  National: { background: "#fce7f3", color: "#be185d" },
  Regional: { background: "#dbeafe", color: "#1d4ed8" },
  Optional: { background: "#ffedd5", color: "#c2410c" },
  Restricted: { background: "#fee2e2", color: "#b91c1c" },
  Festival: { background: "#ede9fe", color: "#7c3aed" },
};

export default function UpcomingHolidays({ holidays }: UpcomingHolidaysProps) {
  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{
        width: "310px",
        flexShrink: 0,
        border: "1px solid #f3f4f6",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-gray-900">Upcoming Holidays</h2>
        <a
          href="#"
          className="text-sm font-medium no-underline"
          style={{ color: "#be185d" }}
        >
          All →
        </a>
      </div>

      {/* Holiday list */}
      <div className="space-y-4">
        {holidays.map((holiday) => (
          <div key={holiday.id} className="flex items-center gap-3">
            {/* Date badge */}
            <div
              className="flex flex-col items-center justify-center rounded-xl text-center shrink-0"
              style={{
                width: "52px",
                height: "52px",
                background: "#fce7f3",
              }}
            >
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: "#be185d" }}
              >
                {holiday.month}
              </span>
              <span
                className="text-lg font-bold leading-tight"
                style={{ color: "#be185d" }}
              >
                {holiday.day}
              </span>
            </div>

            {/* Name + year */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {holiday.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                {holiday.year}
              </p>
            </div>

            {/* Type pill */}
            <span
              className="text-xs font-medium rounded-md shrink-0"
              style={{
                padding: "3px 8px",
                ...TYPE_STYLES[holiday.type],
              }}
            >
              {holiday.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
