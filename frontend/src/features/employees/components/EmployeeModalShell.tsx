"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { employeeModalTitleClass, employeeIconMd } from "../employee-theme";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
}

export default function EmployeeModalShell({
  open,
  title,
  onClose,
  children,
  maxWidthClass = "max-w-3xl",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full ${maxWidthClass} px-4 max-h-[90vh] flex flex-col`}
      >
        <div className="bg-white rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h3 className={employeeModalTitleClass}>{title}</h3>
            <button
              aria-label="Close"
              className="p-2 rounded-md hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <X className={`${employeeIconMd} text-slate-500`} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
