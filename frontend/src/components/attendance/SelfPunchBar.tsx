"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord } from "@/lib/dashboard";
import {
  punchIn,
  punchOut,
} from "@/lib/hrms-client";
import { cn } from "@/lib/utils";

type Props = {
  attendance: AttendanceRecord | null;
  onAttendanceChange: (record: AttendanceRecord) => void;
  className?: string;
};

export default function SelfPunchBar({
  attendance,
  onAttendanceChange,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  const hasPunchedIn = Boolean(attendance?.punchIn);
  const hasPunchedOut = Boolean(attendance?.punchOut);
  const dayComplete = hasPunchedIn && hasPunchedOut;
  const action = !hasPunchedIn
    ? "Punch In"
    : hasPunchedOut
      ? "Day Complete"
      : "Punch Out";

  async function handlePunch() {
    if (busy || dayComplete || !attendance) return;

    setBusy(true);
    try {
      const updated = hasPunchedIn ? await punchOut() : await punchIn();
      onAttendanceChange(updated);
      toast.success(hasPunchedIn ? "Punched out successfully." : "Punched in successfully.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!attendance) return null;

  return (
    <button
      type="button"
      onClick={() => void handlePunch()}
      disabled={dayComplete || busy}
      className={cn(
        "w-full mt-2 py-2 rounded-md text-sm font-semibold transition-colors",
        "border disabled:cursor-not-allowed disabled:opacity-60",
        dayComplete
          ? "border-slate-200 text-slate-400 bg-slate-50"
          : "border-[#be185d] text-[#be185d] hover:bg-pink-50",
        className,
      )}
    >
      {busy ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Working…
        </span>
      ) : (
        action
      )}
    </button>
  );
}
