"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EditEmployeeForm from "./EditEmployeeForm";
import {
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
  employeeModalTitleClass,
} from "../employee-theme";
import {
  fetchEmployeeById,
  formatEmployeeDisplayName,
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

  const title =
    employee != null
      ? `Edit — ${formatEmployeeDisplayName(employee)}`
      : "Edit Employee";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link className={employeeBtnOutlineSmClass} href="/employees">
          ← Back to employees
        </Link>
        {!loading && !loadError && employee && (
          <h1 className={`${employeeModalTitleClass} m-0`}>{title}</h1>
        )}
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
