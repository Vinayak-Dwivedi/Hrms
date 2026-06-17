"use client";

import { useState } from "react";
import {
  enterpriseBtnOutlineSmClass,
  enterpriseFilterLabelClass,
  enterpriseInputClass,
} from "@/lib/branding";
import { cn } from "@/lib/utils";

export default function RejectApprovalModal({
  title,
  subtitle,
  onClose,
  onConfirm,
  busy,
}: {
  title: string;
  subtitle: React.ReactNode;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md w-full max-w-md p-6 shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 m-0 mb-1.5">{title}</h2>
        <p className="text-sm text-gray-500 mb-5 m-0">{subtitle}</p>
        <label className="block mb-5">
          <span className={enterpriseFilterLabelClass}>
            Reason for rejection
          </span>
          <textarea
            className={cn(enterpriseInputClass, "h-auto min-h-[80px] py-2 resize-y")}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Share context with the employee..."
            rows={3}
            value={reason}
          />
        </label>
        <div className="flex justify-end gap-2.5">
          <button
            className={enterpriseBtnOutlineSmClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold rounded-lg border-0 bg-[#dc143c] text-white hover:bg-[#b91c1c] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            disabled={busy}
            onClick={() => onConfirm(reason)}
            type="button"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}
