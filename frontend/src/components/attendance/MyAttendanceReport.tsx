"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RotateCcw } from "lucide-react";
import {
  fetchMyAttendanceReport,
  type AttendanceReportRow,
} from "@/features/attendance/api/attendance-report.client";
import {
  attendanceStatusCellClass,
  formatAttendanceStatusLabel,
} from "@/features/attendance/lib/attendance-status-ui";
import {
  employeeCardClass,
  employeeErrorBannerClass,
  employeeFormSectionClass,
  employeeIconSm,
  employeeIconXs,
  employeeListFilterLabelClass,
  employeeListFormSectionHeaderClass,
  employeeListFormSectionIconClass,
  employeeListFormSectionIconWrapClass,
  employeeListFormSectionTitleClass,
  employeeListInputClass,
  employeeListPaginationBtnActiveClass,
  employeeListPaginationBtnClass,
  employeeListPaginationBtnInactiveClass,
  employeeListResetBtnClass,
  employeeListSelectClass,
  employeeListTableCellClass,
  employeeListTableEmptyClass,
  employeeListTableFooterClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
  employeeListTableSummaryClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";

const PAGE_SIZES = [10, 25, 50, 100] as const;

const MY_REPORT_COLUMNS: { key: keyof AttendanceReportRow; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "day", label: "Day" },
  { key: "shiftName", label: "Shift Name" },
  { key: "shiftTiming", label: "Shift Timing" },
  { key: "attendanceStatus", label: "Attendance Status" },
  { key: "firstLoginTime", label: "First Login Time" },
  { key: "lastLogoutTime", label: "Last Logout Time" },
  { key: "grossWorkingHours", label: "Shift Hours" },
  { key: "breakTime", label: "Lunch Break" },
  { key: "netWorkingHours", label: "Net Login Hours" },
  { key: "lateBy", label: "Late By" },
  { key: "earlyExit", label: "Early Exit" },
  { key: "overtimeHours", label: "Overtime Hours" },
  { key: "missPunch", label: "Miss Punch" },
  { key: "regularizationStatus", label: "Regularization Status" },
];

function currentMonthDateRange(): { fromDate: string; toDate: string } {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  return {
    fromDate: `${year}-${monthStr}-01`,
    toDate: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatAttendanceDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCellValue(key: keyof AttendanceReportRow, value: string | null): string {
  if (!value) return "—";
  if (key === "date") return formatAttendanceDate(value);
  return value;
}

export default function MyAttendanceReport() {
  const [fromDate, setFromDate] = useState(() => currentMonthDateRange().fromDate);
  const [toDate, setToDate] = useState(() => currentMonthDateRange().toDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(25);
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setRows([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyAttendanceReport({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit,
      });
      setRows(result.rows);
      setTotal(result.total);
      setEmployeeId(result.employeeId);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const rangeEnd = Math.min(safePage * limit, total);
  const dateRangeInvalid = Boolean(fromDate && toDate) && fromDate > toDate;

  function resetFilters() {
    const range = currentMonthDateRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setPage(1);
    setLimit(25);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <section className={`${employeeFormSectionClass} flex flex-col flex-1 min-h-0`}>
        <div className={employeeListFormSectionHeaderClass}>
          <div className="flex items-center gap-2.5">
            <div className={employeeListFormSectionIconWrapClass}>
              <BarChart3 className={employeeListFormSectionIconClass} />
            </div>
            <div>
              <h2 className={employeeListFormSectionTitleClass}>My Attendance Report</h2>
              {employeeId && (
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Employee ID: {employeeId}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`${employeeCardClass} border-0 shadow-none rounded-none flex flex-col flex-1 min-h-0`}
        >
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="flex flex-col xl:flex-row xl:items-end gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0">
                <div className="min-w-0">
                  <label
                    className={employeeListFilterLabelClass}
                    htmlFor="my-att-report-from-date"
                  >
                    Attendance Date From
                  </label>
                  <input
                    id="my-att-report-from-date"
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={employeeListInputClass}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    className={employeeListFilterLabelClass}
                    htmlFor="my-att-report-to-date"
                  >
                    Attendance Date To
                  </label>
                  <input
                    id="my-att-report-to-date"
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className={employeeListInputClass}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={resetFilters}
                  className={employeeListResetBtnClass}
                >
                  <RotateCcw className={employeeIconSm} />
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {(error || dateRangeInvalid) && (
            <div className={`mx-4 mt-4 shrink-0 ${employeeErrorBannerClass}`}>
              {dateRangeInvalid
                ? "From date must be on or before to date."
                : error}
            </div>
          )}

          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className={`${employeeListSelectClass} !w-auto min-w-[72px]`}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>
            <p className={employeeListTableSummaryClass}>
              {total === 0
                ? "No entries"
                : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
            </p>
          </div>

          {loading && !dateRangeInvalid ? (
            <div className={employeeLoadingClass}>
              <Loader2 className={`${employeeIconXs} animate-spin inline mr-2`} />
              Loading attendance report…
            </div>
          ) : dateRangeInvalid ? (
            <div className={employeeListTableEmptyClass}>
              Adjust the date range to view the report.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    {MY_REPORT_COLUMNS.map((col) => (
                      <th key={col.key} className={employeeListTableHeadClass}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={MY_REPORT_COLUMNS.length}
                        className={employeeListTableEmptyClass}
                      >
                        No attendance records found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr
                        key={`${row.date}-${idx}`}
                        className={employeeListTableRowClass}
                      >
                        {MY_REPORT_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`${employeeListTableCellClass} whitespace-nowrap ${
                              col.key === "firstLoginTime" ||
                              col.key === "lastLogoutTime"
                                ? "font-mono text-[12px]"
                                : ""
                            } ${
                              col.key === "attendanceStatus"
                                ? attendanceStatusCellClass(row[col.key])
                                : ""
                            }`}
                          >
                            {col.key === "attendanceStatus"
                              ? formatAttendanceStatusLabel(row[col.key])
                              : formatCellValue(col.key, row[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className={`${employeeListTableFooterClass} shrink-0`}>
              <p className={employeeListTableSummaryClass}>
                Page {safePage} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={employeeListPaginationBtnClass}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    const start = Math.max(
                      1,
                      Math.min(safePage - 2, totalPages - 4),
                    );
                    pageNum = start + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={
                        pageNum === safePage
                          ? employeeListPaginationBtnActiveClass
                          : employeeListPaginationBtnInactiveClass
                      }
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={employeeListPaginationBtnClass}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
