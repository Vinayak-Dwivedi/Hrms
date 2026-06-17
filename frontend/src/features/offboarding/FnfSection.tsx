"use client";

import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import CaseFnfDialog, { type FnfDialogCase } from "@/features/offboarding/CaseFnfDialog";
import {
  type FnfListItem,
  type FnfStatus,
  formatMoney,
  listFnf,
} from "@/features/offboarding/api/offboarding.client";
import {
  ActionBtn,
  avatarColor,
  cellStyle,
  EmptyRow,
  fmtDate,
  headStyle,
  initials,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";

const STATUS_STYLE: Record<FnfStatus, { bg: string; color: string }> = {
  Processing: { bg: "#fef9c3", color: "#b45309" },
  Approved: { bg: "#dbeafe", color: "#1d4ed8" },
  Paid: { bg: "#dcfce7", color: "#15803d" },
};

export default function FnfSection() {
  const [rows, setRows] = useState<FnfListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fnfCase, setFnfCase] = useState<FnfDialogCase | null>(null);

  async function load() {
    try {
      setRows(await listFnf());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load settlements.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <p className="text-[13px] text-gray-500 mb-4">
        Full &amp; Final settlements. Open a case from Active Cases to start one, or manage existing
        settlements here.
      </p>
      <TableShell minWidth={860}>
        <thead>
          <tr>
            <th style={headStyle}>Case No.</th>
            <th style={headStyle}>Employee</th>
            <th style={headStyle}>Last Working Day</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Earnings</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Deductions</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Net</th>
            <th style={headStyle}>Status</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Manage</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow colSpan={8} text="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={8} text="No settlements yet. Open a case to start one." />
          ) : (
            rows.map((r) => {
              const s = STATUS_STYLE[r.settlement.status];
              return (
                <tr key={r.settlement.id} className="hover:bg-[#fafbfc] transition-colors">
                  <td style={{ ...cellStyle, fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                    {r.caseNumber}
                  </td>
                  <td style={cellStyle}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: avatarColor(r.employee.empId) }}
                      >
                        {initials(r.employee.firstName, r.employee.lastName)}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {r.employee.firstName} {r.employee.lastName}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(r.lastWorkingDate)}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatMoney(r.totals.totalEarnings)}</td>
                  <td style={{ ...cellStyle, textAlign: "right", color: "#dc2626" }}>
                    − {formatMoney(r.totals.totalDeductions)}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: "#be185d" }}>
                    {formatMoney(r.totals.netAmount)}
                  </td>
                  <td style={cellStyle}>
                    <StatusPill bg={s.bg} color={s.color} label={r.settlement.status} />
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    <div className="flex items-center justify-end">
                      <ActionBtn
                        title="Manage settlement"
                        border="#e5e7eb"
                        color="#6b7280"
                        onClick={() =>
                          setFnfCase({
                            id: r.caseId,
                            caseNumber: r.caseNumber,
                            lastWorkingDate: r.lastWorkingDate,
                            employee: r.employee,
                          })
                        }
                      >
                        <Wallet size={16} />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      {fnfCase && (
        <CaseFnfDialog
          caseRow={fnfCase}
          onClose={() => setFnfCase(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
