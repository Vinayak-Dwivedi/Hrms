"use client";

import { AlertCircle, CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  downloadEmployeeBulkTemplate,
  EMPLOYEE_BULK_TEMPLATE_HEADERS,
  uploadEmployeesBulk,
  type BulkUploadRowError,
} from "../api/employees.client";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeIconMd,
  employeeIconSm,
  employeeWarnBannerClass,
} from "../employee-theme";
import EmployeeModalShell from "./EmployeeModalShell";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkUploadEmployeeModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<BulkUploadRowError[]>([]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setErrors([]);
      setIsUploading(false);
    }
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0] ?? null);
      setErrors([]);
    }
  }

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setErrors([]);

    try {
      const result = await uploadEmployeesBulk(file);

      if (result.inserted > 0) {
        toast.success(`Successfully imported ${result.inserted} employee(s).`);
        onSuccess?.();
      }

      if (result.errors.length > 0) {
        setErrors(result.errors);
        toast.warning(
          result.inserted > 0
            ? "Import completed with some row errors."
            : "No employees were imported.",
        );
      } else if (result.inserted > 0) {
        onClose();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <EmployeeModalShell
      maxWidthClass="max-w-2xl"
      onClose={onClose}
      open={open}
      title="Bulk Employee Upload"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500 m-0">
          Upload an Excel or CSV file to create multiple employees at once.
        </p>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wide m-0">
            Required columns
          </p>
          <p className="text-sm text-gray-600 m-0">
            {EMPLOYEE_BULK_TEMPLATE_HEADERS.join(", ")}
          </p>
        </div>

        <button
          className={employeeBtnOutlineSmClass}
          onClick={downloadEmployeeBulkTemplate}
          type="button"
        >
          <Download className={employeeIconSm} />
          Download template
        </button>

        <div className="flex items-center justify-center w-full">
          <label
            className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors"
            htmlFor="employee-bulk-file-modal"
          >
            <div className="flex flex-col items-center justify-center py-6">
              <Upload className={`${employeeIconMd} mb-3 text-gray-400`} />
              <p className="mb-1 text-sm text-gray-600">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">.XLSX or .CSV (max 5MB)</p>
            </div>
            <input
              accept=".xlsx,.csv"
              className="hidden"
              id="employee-bulk-file-modal"
              onChange={handleFileChange}
              type="file"
            />
          </label>
        </div>

        {file && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
            <FileUp className={`${employeeIconMd} text-[lab(52%_28_-70)] shrink-0`} />
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate m-0">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 m-0">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              className="text-xs text-red-600 hover:text-red-700 bg-transparent border-0 cursor-pointer shrink-0"
              onClick={() => setFile(null)}
              type="button"
            >
              Remove
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <div className={employeeWarnBannerClass}>
            <div className="flex items-start gap-2">
              <AlertCircle className={`${employeeIconSm} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium m-0 mb-2">Row errors</p>
                <ul className="list-none p-0 m-0 space-y-1 max-h-40 overflow-y-auto text-sm">
                  {errors.map((err) => (
                    <li key={`${err.row}-${err.error}`}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            className={employeeBtnOutlineSmClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`${employeeBtnClass} disabled:opacity-60 text-xs px-3 py-1`}
            disabled={!file || isUploading}
            onClick={() => void handleUpload()}
            type="button"
          >
            {isUploading ? (
              "Uploading…"
            ) : (
              <>
                <CheckCircle2 className={employeeIconSm} />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </EmployeeModalShell>
  );
}
