"use client";

import AppShell from "@/components/app/AppShell";
import { AuthProvider, RouteGuard, useAuth } from "@/lib/auth-context";
import { resolveUiRole } from "@/lib/resolve-ui-role";

function AppShellWithRole({ children }: { children: React.ReactNode }) {
  const { user, hasPermission } = useAuth();
  const role = resolveUiRole(hasPermission, user.role);
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
