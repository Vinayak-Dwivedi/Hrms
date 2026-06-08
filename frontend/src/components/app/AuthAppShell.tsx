"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { fetchAuthMe } from "@/lib/hrms-client";
import type { Role } from "@/lib/roles";

function mapAuthRoleToUiRole(authRole: string): Role {
  if (authRole === "admin") return "admin";
  if (authRole === "manager") return "manager";
  return "employee";
}

export default function AuthAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuthMe()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          router.replace("/login");
          return;
        }
        setRole(mapAuthRoleToUiRole(user.role));
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return <AppShell role={role}>{children}</AppShell>;
}
