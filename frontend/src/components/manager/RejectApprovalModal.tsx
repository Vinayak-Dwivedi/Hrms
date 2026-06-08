"use client";

import { useEffect, useState } from "react";
import {
  employeeBtnOutlineSmClass,
  employeeFieldLabelClass,
  employeeInputClass,
} from "@/features/employees/employee-theme";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import { rejectBtnClass } from "./approvals-shared";

interface Props {
  open: boolean;
  employeeName: string;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  busy?: boolean;
}

export default function RejectApprovalModal({
  open,
  employeeName,
  onClose,
  onConfirm,
  busy,
}: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <EmployeeModalShell
      maxWidthClass="max-w-md"
      onClose={onClose}
      open={open}
      title="Reject request"
    >
      <div className="px-6 py-5">
        <p className="text-sm text-gray-600 m-0 mb-4">
          Rejecting request for{" "}
          <span className="font-semibold text-gray-900">{employeeName}</span>.
          Share context with the employee.
        </p>
        <label className="block mb-4">
          <span className={employeeFieldLabelClass}>Reason for rejection</span>
          <textarea
            className={`${employeeInputClass} resize-none`}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Share context with the employee..."
            rows={3}
            value={reason}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            className={employeeBtnOutlineSmClass}
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={rejectBtnClass}
            disabled={busy}
            onClick={() => onConfirm(reason)}
            type="button"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </EmployeeModalShell>
  );
}
