"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EditEmployeeForm from "./EditEmployeeForm";
import {
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import {
  fetchEmployeeById,
  type EmployeeDetail,
} from "../api/employees.client";

interface Props {
  employeeId: number;
}

export default function EditEmployeePageContent({ employeeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const emp = await fetchEmployeeById(employeeId);
        if (cancelled) return;
        setEmployee(emp);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return (
    <>
      <div className="mb-3">
        <Link className={employeeBtnOutlineSmClass} href="/employees">
          ← Back to employees
        </Link>
      </div>

      {loading && <div className={employeeLoadingClass}>Loading employee…</div>}
      {loadError && (
        <div className={employeeErrorBannerClass}>{loadError}</div>
      )}
      {!loading && !loadError && employee && (
        <EditEmployeeForm
          employee={employee}
          onSuccess={() => router.push("/employees")}
        />
      )}
    </>
  );
}
