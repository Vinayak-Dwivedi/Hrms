import { ArrowRight, CalendarPlus } from "lucide-react";

// The apply-leave dialog lives inside the Attendance calendar (click any day
// in the future). This page routes users there so the "Apply Leave" quick
// link has a real destination.
export default function ApplyLeaveLanding() {
  return (
    <div
      className="rounded-2xl bg-white"
      style={{ border: "1px solid #e5e7eb", padding: 40 }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="rounded-2xl flex items-center justify-center mb-4"
          style={{
            width: 64,
            height: 64,
            background:
              "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
          }}
        >
          <CalendarPlus size={28} style={{ color: "#fff" }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Apply for Leave</h2>
        <p
          className="text-sm max-w-md"
          style={{ color: "#6b7280", lineHeight: 1.5 }}
        >
          Pick the date(s) on the Attendance calendar and use the Apply Leave
          dialog. You can choose a leave type, mark a half day, and attach a
          reason from there.
        </p>

        <a
          href="/attendance"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold no-underline"
          style={{
            background:
              "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
            color: "#fff",
          }}
        >
          Open Attendance Calendar
          <ArrowRight size={14} />
        </a>

        <p
          className="mt-6 text-[11px]"
          style={{ color: "#9ca3af" }}
        >
          Existing requests live on the{" "}
          <a
            href="/leave"
            className="font-semibold no-underline"
            style={{ color: "#be185d" }}
          >
            Leave
          </a>{" "}
          page where you can view and cancel pending ones.
        </p>
      </div>
    </div>
  );
}
