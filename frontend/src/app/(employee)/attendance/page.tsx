"use client";

import RoleAttendance from "@/components/attendance/RoleAttendance";
import { useAuth } from "@/lib/auth-context";
import { resolveUiRole } from "@/lib/resolve-ui-role";

export default function AttendancePage() {
  const { hasPermission, user } = useAuth();
  return (
    <RoleAttendance role={resolveUiRole(hasPermission, user?.role)} />
  );
}
