"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import EmployeeOnboardingPageContent from "@/features/employees/components/EmployeeOnboardingPageContent";

export default function EmployeeOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      router.replace("/employees");
    }
  }, [id, router]);

  if (!Number.isFinite(id)) return null;

  return <EmployeeOnboardingPageContent employeeId={id} />;
}
