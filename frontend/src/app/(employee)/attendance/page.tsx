"use client";

import { Suspense } from "react";
import RoleAttendance from "@/components/attendance/RoleAttendance";
import ManagerAttendanceView, {
  type AttendanceScope,
} from "@/components/manager/ManagerAttendanceView";
import { useAuth } from "@/lib/auth-context";
import { resolveUiRole } from "@/lib/resolve-ui-role";
import { useSearchParams } from "next/navigation";

function AttendancePageContent() {
  const { hasPermission, user } = useAuth();
  const searchParams = useSearchParams();
  const scope: AttendanceScope =
    searchParams.get("scope") === "team" ? "team" : "mine";
  const autoApplyLeave = searchParams.get("apply") === "1";

  if (hasPermission("leave.approve")) {
    return <ManagerAttendanceView initialScope={scope} />;
  }

  return (
    <RoleAttendance
      role={resolveUiRole(hasPermission, user?.role)}
      autoApplyLeave={autoApplyLeave}
    />
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading attendance…</div>}>
      <AttendancePageContent />
    </Suspense>
  );
}
