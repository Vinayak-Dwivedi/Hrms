"use client";

import { ClipboardCheck, FileText, Lock, MessageSquare, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import CaseClearanceDialog from "@/features/offboarding/CaseClearanceDialog";
import CaseClosureDialog from "@/features/offboarding/CaseClosureDialog";
import CaseDocumentsDialog from "@/features/offboarding/CaseDocumentsDialog";
import CaseExitInterviewDialog from "@/features/offboarding/CaseExitInterviewDialog";
import CaseFnfDialog from "@/features/offboarding/CaseFnfDialog";
import {
  listCases,
  type OffboardingCase,
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

const CASE_STATUS: Record<OffboardingCase["status"], { bg: string; color: string; label: string }> = {
  OffboardingInitiated: { bg: "#fef3c7", color: "#d97706", label: "Initiated" },
  ClearancesComplete: { bg: "#dbeafe", color: "#1d4ed8", label: "Clearances Done" },
  FnFComplete: { bg: "#fce7f3", color: "#be185d", label: "FnF Complete" },
  Closed: { bg: "#dcfce7", color: "#15803d", label: "Closed" },
  OnHold: { bg: "#f3f4f6", color: "#6b7280", label: "On Hold" },
};

export default function OffboardingCasesSection() {
  const [rows, setRows] = useState<OffboardingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearanceCase, setClearanceCase] = useState<OffboardingCase | null>(null);
  const [interviewCase, setInterviewCase] = useState<OffboardingCase | null>(null);
  const [fnfCase, setFnfCase] = useState<OffboardingCase | null>(null);
  const [docsCase, setDocsCase] = useState<OffboardingCase | null>(null);
  const [closureCase, setClosureCase] = useState<OffboardingCase | null>(null);

  async function load() {
    try {
      setRows(await listCases());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <>
    <TableShell minWidth={1000}>
      <thead>
        <tr>
          <th style={headStyle}>Case No.</th>
          <th style={headStyle}>Employee</th>
          <th style={headStyle}>Department</th>
          <th style={headStyle}>Date of Joining</th>
          <th style={headStyle}>Last Working Day</th>
          <th style={headStyle}>Notice</th>
          <th style={headStyle}>Status</th>
          <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <EmptyRow colSpan={8} text="Loading…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={8} text="No offboarding cases yet." />
        ) : (
          rows.map((c) => {
            const s = CASE_STATUS[c.status];
            return (
              <tr key={c.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={{ ...cellStyle, fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                  {c.caseNumber}
                </td>
                <td style={cellStyle}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ background: avatarColor(c.employee.empId) }}
                    >
                      {initials(c.employee.firstName, c.employee.lastName)}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-gray-900 truncate">
                        {c.employee.firstName} {c.employee.lastName}
                      </span>
                      <span className="block text-[11px] text-gray-400">{c.employee.empId}</span>
                    </div>
                  </div>
                </td>
                <td style={cellStyle}>{c.departmentName ?? "—"}</td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(c.dateOfJoining)}</td>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmtDate(c.lastWorkingDate)}</td>
                <td style={cellStyle}>{c.noticePeriodDays ?? "—"}{c.noticePeriodDays != null ? "d" : ""}</td>
                <td style={cellStyle}>
                  <StatusPill bg={s.bg} color={s.color} label={s.label} />
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <div className="flex items-center justify-end gap-2">
                    <ActionBtn title="View clearance" border="#e5e7eb" color="#6b7280" onClick={() => setClearanceCase(c)}>
                      <ClipboardCheck size={16} />
                    </ActionBtn>
                    <ActionBtn title="View exit interview" border="#e5e7eb" color="#6b7280" onClick={() => setInterviewCase(c)}>
                      <MessageSquare size={16} />
                    </ActionBtn>
                    <ActionBtn title="Full & Final settlement" border="#e5e7eb" color="#6b7280" onClick={() => setFnfCase(c)}>
                      <Wallet size={16} />
                    </ActionBtn>
                    <ActionBtn title="Exit documents" border="#e5e7eb" color="#6b7280" onClick={() => setDocsCase(c)}>
                      <FileText size={16} />
                    </ActionBtn>
                    <ActionBtn title="Access & final closure" border="#e5e7eb" color="#6b7280" onClick={() => setClosureCase(c)}>
                      <Lock size={16} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </TableShell>
    {clearanceCase && (
      <CaseClearanceDialog caseRow={clearanceCase} onClose={() => setClearanceCase(null)} onChanged={load} />
    )}
    {interviewCase && (
      <CaseExitInterviewDialog caseRow={interviewCase} onClose={() => setInterviewCase(null)} />
    )}
    {fnfCase && (
      <CaseFnfDialog caseRow={fnfCase} onClose={() => setFnfCase(null)} onChanged={load} />
    )}
    {docsCase && (
      <CaseDocumentsDialog caseRow={docsCase} onClose={() => setDocsCase(null)} />
    )}
    {closureCase && (
      <CaseClosureDialog caseRow={closureCase} onClose={() => setClosureCase(null)} onChanged={load} />
    )}
    </>
  );
}
