"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EditEmployeeModal from "@/features/employees/components/EditEmployeeModal";

export default function EmployeeEditPage() {
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
    <EditEmployeeModal
      employeeId={id}
      onClose={() => {
        setOpen(false);
        router.push("/employees");
      }}
      onSaved={() => {
        router.push("/employees");
      }}
      open={open}
    />
  );
}
