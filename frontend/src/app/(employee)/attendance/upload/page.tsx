"use client";

import { useRef, useState } from "react";
import { AlertCircle, FileUp, Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import AttendanceUploadRecords from "@/features/attendance/components/AttendanceUploadRecords";
import {
  uploadAttendance,
  type AttendanceUploadRowError,
} from "@/features/attendance/api/attendance-upload.client";
import {
  employeeBtnSmClass,
  employeeErrorBannerClass,
  employeeFormSectionClass,
  employeeFormSectionTitleClass,
  employeeIconSm,
  employeeIconXs,
  employeeListFilterLabelClass,
  employeeListFormSectionHeaderClass,
  employeeListFormSectionIconClass,
  employeeListFormSectionIconWrapClass,
  employeeListFormSectionTitleClass,
  employeeListResetBtnClass,
  employeeListTableCellClass,
  employeeListTableEmptyClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
} from "@/features/employees/employee-theme";

export default function AttendanceUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<AttendanceUploadRowError[]>([]);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);

  function clearFileSelection() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

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
      const result = await uploadAttendance(file);

      if (result.uploaded > 0) {
        toast.success(`Uploaded ${result.uploaded} record(s).`);
        clearFileSelection();
        setRecordsRefreshKey((k) => k + 1);
      }

      if (result.errors.length > 0) {
        setErrors(result.errors);
        toast.warning("Upload completed with some row errors.");
      } else if (result.uploaded === 0) {
        toast.error("No records were uploaded.");
      }
    } catch (e) {
      const err = e as Error & { details?: AttendanceUploadRowError[] };
      toast.error(err.message);
      if (err.details) setErrors(err.details);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <section className={employeeFormSectionClass}>
        <div className={employeeListFormSectionHeaderClass}>
          <div className="flex items-center gap-2.5">
            <div className={employeeListFormSectionIconWrapClass}>
              <Upload className={employeeListFormSectionIconClass} />
            </div>
            <div>
              <h2 className={employeeListFormSectionTitleClass}>
                Upload Attendance File
              </h2>
              </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex flex-col xl:flex-row xl:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="attendance-upload-file"
                className={employeeListFilterLabelClass}
              >
                Select Excel File (.xlsx or .xls)
              </label>
              <input
                ref={fileInputRef}
                id="attendance-upload-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-slate-200 file:text-sm file:font-medium file:text-slate-700 file:bg-white hover:file:bg-slate-50 file:cursor-pointer disabled:opacity-50"
              />
            </div>

            {file && (
              <div className="xl:w-56 shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-sm border border-slate-200 bg-slate-50 min-h-[38px]">
                <FileUp
                  className={`${employeeIconSm} text-[lab(52%_28_-70)] shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate m-0 leading-tight">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0 xl:ml-auto">
              <button
                type="button"
                onClick={clearFileSelection}
                disabled={!file || isUploading}
                className={employeeListResetBtnClass}
              >
                <RotateCcw className={employeeIconSm} />
                Remove File
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={employeeBtnSmClass}
              >
                {isUploading ? (
                  <Loader2 className={`${employeeIconXs} animate-spin`} />
                ) : (
                  <Upload className={employeeIconXs} />
                )}
                {isUploading ? "Uploading…" : "Upload File"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {errors.length > 0 && (
        <section className={employeeFormSectionClass}>
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className={`${employeeIconSm} text-red-600`} />
            <h2 className={`${employeeFormSectionTitleClass} text-red-800`}>
              Upload Errors
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className={employeeListTableHeadClass}>Row</th>
                  <th className={employeeListTableHeadClass}>Error</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err) => (
                  <tr key={`${err.row}-${err.error}`} className={employeeListTableRowClass}>
                    <td className={`${employeeListTableCellClass} font-mono text-slate-700`}>
                      {err.row}
                    </td>
                    <td className={`${employeeListTableCellClass} text-red-700`}>
                      {err.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AttendanceUploadRecords refreshKey={recordsRefreshKey} />
    </div>
  );
}
