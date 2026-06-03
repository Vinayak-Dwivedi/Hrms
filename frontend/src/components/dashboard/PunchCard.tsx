import type { Employee, AttendanceRecord } from "@/lib/dashboard";

interface PunchCardProps {
  employee: Employee;
  attendance: AttendanceRecord;
  onPunchToggle?: () => void | Promise<void>;
  busy?: boolean;
}

export default function PunchCard({
  employee,
  attendance,
  onPunchToggle,
  busy,
}: PunchCardProps) {
  const hasPunchedIn = Boolean(attendance.punchIn);
  const hasPunchedOut = Boolean(attendance.punchOut);
  const dayComplete = hasPunchedIn && hasPunchedOut;
  const action = !hasPunchedIn ? "Punch In" : hasPunchedOut ? "Day Complete" : "Punch Out";
  return (
    <div
      className="rounded-2xl overflow-hidden shrink-0"
      style={{ width: "270px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
    >
      {/* Gradient top section */}
      <div
        className="px-6 pt-7 pb-8 text-white text-center"
        style={{
          background: "linear-gradient(145deg, #8B1A52 0%, #C5195F 100%)",
        }}
      >
        {/* Avatar ring */}
        <div className="flex justify-center mb-4">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: "80px",
              height: "80px",
              background: "rgba(255,255,255,0.18)",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.3)",
            }}
          >
            <div
              className="rounded-full bg-white flex items-center justify-center text-xl font-bold"
              style={{
                width: "64px",
                height: "64px",
                color: "#be185d",
              }}
            >
              {employee.initials}
            </div>
          </div>
        </div>

        <h2 className="text-[17px] font-bold mb-0.5">{employee.name}</h2>
        <p className="text-sm mb-0.5" style={{ opacity: 0.8 }}>
          {employee.role}
        </p>
        <p className="text-sm font-medium mb-4" style={{ opacity: 0.75 }}>
          {employee.employeeId}
        </p>

        {attendance.isCheckedIn && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider"
            style={{ background: "rgba(0,0,0,0.25)", letterSpacing: "0.08em" }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: "8px",
                height: "8px",
                background: "#4ade80",
                flexShrink: 0,
              }}
            />
            CHECKED IN
          </span>
        )}
      </div>

      {/* White bottom section */}
      <div className="bg-white px-6 pt-5 pb-5">
        {/* Punch In */}
        <div
          className="pb-4 mb-4"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>
            Punch In
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-gray-800">
              {attendance.punchIn ?? "—"}
            </span>
            <span
              className="rounded-full shrink-0"
              style={{
                width: "10px",
                height: "10px",
                background: "#22c55e",
              }}
            />
          </div>
        </div>

        {/* Punch Out */}
        <div
          className="pb-4 mb-4"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>
            Punch Out
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold" style={{ color: "#9ca3af" }}>
              {attendance.punchOut ?? "— : —"}
            </span>
            <span
              className="rounded-full shrink-0"
              style={{
                width: "10px",
                height: "10px",
                background: "#d1d5db",
              }}
            />
          </div>
        </div>

        {/* Working Hours */}
        <div className="mb-5">
          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>
            Working Hours
          </p>
          <p className="text-2xl font-bold" style={{ color: "#be185d" }}>
            {attendance.workingHours}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
            Shift {attendance.shift}
          </p>
        </div>

        {/* Punch Toggle Button */}
        <button
          type="button"
          onClick={() => onPunchToggle?.()}
          disabled={dayComplete || busy || !onPunchToggle}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-pink-50 disabled:cursor-not-allowed"
          style={{
            border: "1.5px solid #be185d",
            color: dayComplete ? "#9ca3af" : "#be185d",
            borderColor: dayComplete ? "#e5e7eb" : "#be185d",
            background: "transparent",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Working…" : action}
        </button>
      </div>
    </div>
  );
}
