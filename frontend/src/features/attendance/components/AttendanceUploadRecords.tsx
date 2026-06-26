"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Search, Table2 } from "lucide-react";
import {
  listAttendanceUploads,
  type AttendanceUploadRecord,
} from "@/features/attendance/api/attendance-upload.client";
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

function formatUploadedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeValue(t: string | null): string {
  if (!t) return "—";
  const parts = t.split(":");
  const hh = parts[0] ?? "00";
  const mm = parts[1] ?? "00";
  const ss = parts[2] ?? "00";
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`;
}

type Props = {
  refreshKey?: number;
};

export default function AttendanceUploadRecords({ refreshKey = 0 }: Props) {
  const [fromDate, setFromDate] = useState(() => currentMonthDateRange().fromDate);
  const [toDate, setToDate] = useState(() => currentMonthDateRange().toDate);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(25);
  const [rows, setRows] = useState<AttendanceUploadRecord[]>([]);
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
      const result = await listAttendanceUploads({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search,
        page,
        limit,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, search, page, limit]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, search, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const rangeEnd = Math.min(safePage * limit, total);
  const dateRangeInvalid =
    Boolean(fromDate && toDate) && fromDate > toDate;

  function resetFilters() {
    const range = currentMonthDateRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setSearch("");
    setSearchInput("");
    setPage(1);
    setLimit(25);
  }

  function applySearch() {
    setSearch(searchInput.trim());
  }

  return (
    <section className={employeeFormSectionClass}>
      <div className={employeeListFormSectionHeaderClass}>
        <div className="flex items-center gap-2.5">
          <div className={employeeListFormSectionIconWrapClass}>
            <Table2 className={employeeListFormSectionIconClass} />
          </div>
          <h2 className={employeeListFormSectionTitleClass}>
            Uploaded Attendance Records
          </h2>
        </div>
      </div>

      <div className={`${employeeCardClass} border-0 shadow-none rounded-none`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 min-w-0">
              <div className="min-w-0">
                <label className={employeeListFilterLabelClass} htmlFor="att-upload-from-date">
                  Attendance Date From
                </label>
                <input
                  id="att-upload-from-date"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={employeeListInputClass}
                />
              </div>

              <div className="min-w-0">
                <label className={employeeListFilterLabelClass} htmlFor="att-upload-to-date">
                  Attendance Date To
                </label>
                <input
                  id="att-upload-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className={employeeListInputClass}
                />
              </div>

              <div className="min-w-0">
                <label className={employeeListFilterLabelClass} htmlFor="att-upload-search">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="att-upload-search"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearch();
                    }}
                    placeholder="Employee code…"
                    className={`${employeeListInputClass} pl-8`}
                  />
                  <Search
                    className={`${employeeIconXs} text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2`}
                  />
                </div>
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
              <button
                type="button"
                onClick={applySearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Search className={employeeIconXs} />
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {(error || dateRangeInvalid) && (
          <div className={`mx-4 mt-4 ${employeeErrorBannerClass}`}>
            {dateRangeInvalid
              ? "From date must be on or before to date."
              : error}
          </div>
        )}

        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
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
          <div className={employeeLoadingClass}>Loading uploaded records…</div>
        ) : dateRangeInvalid ? (
          <div className={employeeListTableEmptyClass}>
            Adjust the date range to view uploaded records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[
                    "Employee Code",
                    "Attendance Date",
                    "In Time",
                    "Out Time",
                    "Attendance Status",
                    "Uploaded At",
                  ].map((h) => (
                    <th key={h} className={employeeListTableHeadClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={employeeListTableEmptyClass}>
                      No uploaded records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className={employeeListTableRowClass}>
                      <td
                        className={`${employeeListTableCellClass} font-medium text-slate-800 whitespace-nowrap`}
                      >
                        {row.employeeCode}
                      </td>
                      <td
                        className={`${employeeListTableCellClass} whitespace-nowrap`}
                      >
                        {formatAttendanceDate(row.attendanceDate)}
                      </td>
                      <td
                        className={`${employeeListTableCellClass} whitespace-nowrap font-mono text-[12px]`}
                      >
                        {formatTimeValue(row.inTime)}
                      </td>
                      <td
                        className={`${employeeListTableCellClass} whitespace-nowrap font-mono text-[12px]`}
                      >
                        {formatTimeValue(row.outTime)}
                      </td>
                      <td
                        className={`${employeeListTableCellClass} whitespace-nowrap ${attendanceStatusCellClass(row.attendanceStatus)}`}
                      >
                        {formatAttendanceStatusLabel(row.attendanceStatus)}
                      </td>
                      <td className={`${employeeListTableCellClass} whitespace-nowrap`}>
                        {formatUploadedAt(row.uploadedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className={employeeListTableFooterClass}>
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
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
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
  );
}
