"use client";

import RoleDashboard from "@/components/dashboard/RoleDashboard";
import { useAuth } from "@/lib/auth-context";
import { resolveUiRole } from "@/lib/resolve-ui-role";

export default function DashboardPage() {
  const { hasPermission, user } = useAuth();
  return (
    <RoleDashboard role={resolveUiRole(hasPermission, user?.role)} />
  );
}
