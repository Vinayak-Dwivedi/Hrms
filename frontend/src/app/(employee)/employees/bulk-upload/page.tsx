"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Deep link: opens bulk upload modal on the employees listing. */
export default function EmployeeBulkUploadRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("hrms.openBulkUpload", "1");
    router.replace("/employees");
  }, [router]);

  return null;
}
