"use client";

import AppShell from "@/components/app/AppShell";
import { AuthProvider, RouteGuard, useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/roles";

function mapAuthRoleToUiRole(authRole: string): Role {
  if (authRole === "master" || authRole === "admin") return "admin";
  if (authRole === "manager") return "manager";
  return "employee";
}

function AppShellWithRole({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const role = mapAuthRoleToUiRole(user.role);
  return <AppShell role={role}>{children}</AppShell>;
}

export default function AuthAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <RouteGuard>
        <AppShellWithRole>{children}</AppShellWithRole>
      </RouteGuard>
    </AuthProvider>
  );
}
