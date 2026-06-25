"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

  const loadEmployee = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const emp = await fetchEmployeeById(employeeId);
      setEmployee(emp);
    } catch (e) {
      if (!options?.silent) {
        setLoadError((e as Error).message);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [employeeId]);

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

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
          onRefreshEmployee={() => loadEmployee({ silent: true })}
          onSuccess={() => router.push("/employees")}
        />
      )}
    </>
  );
}
