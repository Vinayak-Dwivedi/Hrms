"use client";

import { Suspense, useEffect } from "react";
import AdminLeaveSection from "@/components/leave/AdminLeaveSection";
import MyLeaveSection from "@/components/leave/MyLeaveSection";
import ManagerLeaveView, {
  type LeaveScope,
} from "@/components/manager/ManagerLeaveView";
import { useAuth } from "@/lib/auth-context";
import { resolveUiRole } from "@/lib/resolve-ui-role";
import { enterpriseLoadingClass } from "@/lib/branding";
import { useRouter, useSearchParams } from "next/navigation";

function LeavePageContent() {
  const { hasPermission, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scope: LeaveScope =
    searchParams.get("scope") === "team" ? "team" : "mine";
  const uiRole = resolveUiRole(hasPermission, user?.role);

  useEffect(() => {
    if (uiRole === "admin" && searchParams.get("scope")) {
      router.replace("/leave", { scroll: false });
    }
  }, [uiRole, searchParams, router]);

  if (uiRole === "admin") {
    return <AdminLeaveSection />;
  }

  if (hasPermission("leave.approve")) {
    return <ManagerLeaveView initialScope={scope} />;
  }

  return <MyLeaveSection role={uiRole} />;
}

export default function LeavePage() {
  return (
    <Suspense fallback={<div className={enterpriseLoadingClass}>Loading leave…</div>}>
      <LeavePageContent />
    </Suspense>
  );
}
