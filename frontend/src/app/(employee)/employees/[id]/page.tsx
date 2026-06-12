"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import ViewEmployeePageContent from "@/features/employees/components/ViewEmployeePageContent";

export default function EmployeeViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      router.replace("/employees");
    }
  }, [id, router]);

  if (!Number.isFinite(id)) return null;

  return <ViewEmployeePageContent employeeId={id} />;
}
