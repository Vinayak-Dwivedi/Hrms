"use client";

import {
  AlertCircle,
  ChevronDown,
  Download,
  FileUp,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  enterpriseBtnOutlineSmClass,
  enterpriseBtnSmClass,
  enterpriseCardClass,
  enterpriseCardTitleClass,
  enterpriseLinkClass,
  enterpriseLoadingClass,
} from "@/lib/branding";
import type { TeamAttendanceResponse } from "@/lib/hrms-client";
import { cn } from "@/lib/utils";
import {
  AttendanceStatusBadge,
  avatarClassFor,
  DETAIL_STATUS_CLASS,
  eachDateInRange,
  dayOfMonth,
  initials,
  mapAttendanceStatus,
  tableBodyCellClass,
  tableBodyCellCenterClass,
  tableBodyRowClass,
  tableHeadCellCenterClass,
  tableHeadCellClass,
  type AttCellStatus,
} from "./team-attendance-shared";

interface Props {
  data: TeamAttendanceResponse | null;
  loading?: boolean;
  monthLabel?: string;
  // Called after a successful bulk attendance upload so the parent can
  // refetch the report (the newly inserted rows show up immediately).
  onUploaded?: () => void;
}

function formatTimeOfDay(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatMinutes(min: number | null | undefined) {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

interface RowOut {
  date: string;
  punchIn: string;
  punchOut: string;
  workHrs: string;
  lateBy: string;
  earlyExit: string;
  status: string;
}

function detailRow(
  ymd: string,
  rec: TeamAttendanceResponse["records"][number] | undefined,
): RowOut {
  const dash = "—";
  if (rec) {
    return {
      date: ymd,
      punchIn: formatTimeOfDay(rec.punchIn),
      punchOut: formatTimeOfDay(rec.punchOut),
      workHrs: formatMinutes(rec.workingMinutes),
      lateBy: rec.lateByMinutes ? `${rec.lateByMinutes}m` : dash,
      earlyExit: rec.earlyExitMinutes ? `${rec.earlyExitMinutes}m` : dash,
      status: rec.status,
    };
  }
  return {
    date: ymd,
    punchIn: dash,
    punchOut: dash,
    workHrs: dash,
    lateBy: dash,
    earlyExit: dash,
    status: "—",
  };
}

function DetailSheet({
  member,
  records,
  dates,
  onClose,
}: {
  member: TeamAttendanceResponse["team"][number];
  records: TeamAttendanceResponse["records"];
  dates: string[];
  onClose: () => void;
}) {
  const recByDate = new Map(
    records.filter((r) => r.employeeId === member.id).map((r) => [r.date, r]),
  );

  return (
    <>
      <button
        aria-label="Close details"
        className="fixed inset-0 z-40 bg-black/50 border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="fixed top-0 right-0 h-full z-50 bg-white flex flex-col shadow-2xl w-full max-w-[680px] border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className={enterpriseCardTitleClass}>
            Details · {member.firstName} {member.lastName}
          </h2>
          <button
            className="p-1 rounded-full hover:bg-gray-100 transition-colors border-0 bg-transparent cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X className="w-[18px] h-[18px] text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
              avatarClassFor(member.empId),
            )}
          >
            {initials(member.firstName, member.lastName)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 m-0">
              {member.firstName} {member.lastName}
            </p>
            <p className="text-sm text-gray-400 m-0">
              {member.designation ?? "—"} · {member.empId}
            </p>
          </div>
        </div>

        <div className="px-6 border-b border-slate-100">
          <span className="inline-block py-3 text-[13px] font-semibold text-slate-800 border-b-2 border-[lab(36.9089%_35.0961_-85.6872)]">
            Attendance Data
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-nowrap">
                {[
                  "Day",
                  "Punch In",
                  "Punch Out",
                  "Working Hrs",
                  "Late By",
                  "Early Exit",
                  "Status",
                ].map((col) => (
                  <th key={col} className={tableHeadCellClass}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dates.map((d) => {
                const row = detailRow(d, recByDate.get(d));
                return (
                  <tr key={d} className={tableBodyRowClass}>
                    <td className={tableBodyCellClass}>{row.date}</td>
                    <td className={tableBodyCellClass}>{row.punchIn}</td>
                    <td className={tableBodyCellClass}>{row.punchOut}</td>
                    <td className={tableBodyCellClass}>{row.workHrs}</td>
                    <td className={tableBodyCellClass}>{row.lateBy}</td>
                    <td className={tableBodyCellClass}>{row.earlyExit}</td>
                    <td
                      className={cn(
                        tableBodyCellClass,
                        "font-medium",
                        DETAIL_STATUS_CLASS[row.status] ?? "text-gray-700",
                      )}
                    >
                      {row.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function TeamAttendanceReport({
  data,
  loading,
  monthLabel,
  onUploaded,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Upload Attendance dialog state ──────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<
    { row: number; error: string }[]
  >([]);

  function closeUpload() {
    setUploadOpen(false);
    setFile(null);
    setUploadErrors([]);
  }

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setUploadErrors([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/attendance/upload-bulk`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Uploaded ${body.inserted ?? 0} records.`);
        if (body.errors && body.errors.length > 0) {
          setUploadErrors(body.errors);
          toast.warning("Some rows had errors — see details below.");
        } else {
          closeUpload();
          onUploaded?.();
        }
      } else {
        toast.error(body.error?.message ?? "Failed to upload attendance.");
        if (body.error?.details) setUploadErrors(body.error.details);
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  if (loading || !data) {
    return <div className={enterpriseLoadingClass}>Loading team report…</div>;
  }

  const dates = eachDateInRange(data.from, data.to);
  const todayYmd = new Date().toISOString().slice(0, 10);
  const todayDay =
    todayYmd >= data.from && todayYmd <= data.to ? dayOfMonth(todayYmd) : -1;

  const cellStatus = new Map<number, Map<string, AttCellStatus>>();
  for (const m of data.team) cellStatus.set(m.id, new Map());
  for (const r of data.records) {
    const m = cellStatus.get(r.employeeId);
    if (m) m.set(r.date, mapAttendanceStatus(r.status));
  }

  function statusFor(empId: number, ymd: string): AttCellStatus {
    const s = cellStatus.get(empId)?.get(ymd);
    if (s) return s;
    return "—";
  }

  const selectedMember = data.team.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 m-0 tracking-tight">
            Team Attendance – Full Report
          </h1>
          <p className="text-sm text-slate-500 mt-1 m-0">
            {monthLabel ?? `${data.from} → ${data.to}`} · {data.team.length}{" "}
            members
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Upload Attendance</span>
            <span className="sm:hidden">Upload</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">All Members</span>
            <span className="sm:hidden">Members</span>
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className={cn(enterpriseCardClass, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-nowrap">
                <th
                  className={cn(
                    tableHeadCellClass,
                    "sticky left-0 z-10 bg-slate-50 min-w-[260px]",
                  )}
                >
                  Employee
                </th>
                {dates.map((d) => {
                  const day = dayOfMonth(d);
                  return (
                    <th
                      key={d}
                      className={cn(
                        tableHeadCellCenterClass,
                        "min-w-[44px]",
                        day === todayDay && "text-[lab(52%_28_-70)] font-semibold",
                      )}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.team.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-sm text-gray-400"
                    colSpan={dates.length + 1}
                  >
                    No team members found.
                  </td>
                </tr>
              ) : (
                data.team.map((m) => (
                  <tr key={m.id} className={cn(tableBodyRowClass, "group")}>
                    <td
                      className={cn(
                        tableBodyCellClass,
                        "sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                            avatarClassFor(m.empId),
                          )}
                        >
                          {initials(m.firstName, m.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 m-0">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-xs text-gray-400 m-0">
                            {m.designation ?? "—"}
                          </p>
                        </div>
                        <button
                          className={cn(enterpriseBtnOutlineSmClass, "ml-auto shrink-0")}
                          onClick={() => setSelectedId(m.id)}
                          type="button"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                    {dates.map((d) => (
                      <td key={d} className={tableBodyCellCenterClass}>
                        <AttendanceStatusBadge status={statusFor(m.id, d)} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <DetailSheet
          dates={dates}
          member={selectedMember}
          onClose={() => setSelectedId(null)}
          records={data.records}
        />
      )}

      {/* ── Upload Attendance dialog ──────────────────────────────────── */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploading) closeUpload();
          }}
        >
          <div className={cn(enterpriseCardClass, "w-full max-w-xl shadow-2xl overflow-hidden")}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className={cn(enterpriseCardTitleClass, "text-[16px]")}>
                  Upload Attendance
                </h2>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Excel/CSV with: Employee Code, Date, In Time, Out Time,
                  Worked Hours, Location.
                </p>
              </div>
              <button
                type="button"
                onClick={closeUpload}
                disabled={isUploading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {/* Dropzone */}
              <label
                htmlFor="att-upload-input"
                className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-200 rounded-md cursor-pointer bg-slate-50 hover:bg-slate-100"
              >
                <Upload className="w-8 h-8 mb-2 text-[lab(52%_28_-70)]" />
                <p className="text-[13px] text-gray-700">
                  <span className="font-semibold text-[lab(52%_28_-70)]">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  .XLSX or .CSV (Max 5 MB)
                </p>
                <input
                  id="att-upload-input"
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    setUploadErrors([]);
                  }}
                />
              </label>

              {/* Selected file */}
              {file && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileUp className="h-5 w-5 text-[lab(52%_28_-70)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="text-[12px] font-semibold text-[#dc2626] hover:bg-[#fef2f2] rounded px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Errors */}
              {uploadErrors.length > 0 && (
                <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-[#dc2626]" />
                    <p className="text-[12px] font-bold text-[#991b1b]">
                      {uploadErrors.length} row error
                      {uploadErrors.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto text-[11px] font-mono">
                    {uploadErrors.map((err, i) => (
                      <div
                        key={i}
                        className="flex gap-3 py-0.5 text-[#991b1b]"
                      >
                        <span className="shrink-0 w-10">Row {err.row}</span>
                        <span className="break-words">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
              <a
                href="/Book1.xlsx"
                download="Book1.xlsx"
                className={cn(enterpriseLinkClass, "inline-flex items-center gap-1.5 text-[12px] font-semibold rounded px-2 py-1 hover:underline")}
              >
                <Download size={14} />
                Export Sample
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeUpload}
                  disabled={isUploading}
                  className="px-3 py-1.5 text-[12px] font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className={cn(enterpriseBtnSmClass, "px-3 py-1.5 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed")}
                >
                  {isUploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
