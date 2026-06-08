"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ViewEmployeeModal from "@/features/employees/components/ViewEmployeeModal";

export default function EmployeeViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [open, setOpen] = useState(Number.isFinite(id));

  useEffect(() => {
    if (!Number.isFinite(id)) {
      router.replace("/employees");
    }
  }, [id, router]);

  if (!Number.isFinite(id)) return null;

  return (
    <ViewEmployeeModal
      employeeId={id}
      onClose={() => {
        setOpen(false);
        router.push("/employees");
      }}
      onEdit={(editEmployeeId) => {
        router.push(`/employees/${editEmployeeId}/edit`);
      }}
      open={open}
    />
  );
}
