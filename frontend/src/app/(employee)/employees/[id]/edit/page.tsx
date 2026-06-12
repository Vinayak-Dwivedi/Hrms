"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import EditEmployeePageContent from "@/features/employees/components/EditEmployeePageContent";

export default function EmployeeEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      router.replace("/employees");
    }
  }, [id, router]);

  if (!Number.isFinite(id)) return null;

  return <EditEmployeePageContent employeeId={id} />;
}
