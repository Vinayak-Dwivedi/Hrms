"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type ExitInterviewResponse,
  getCaseExitInterview,
  type OffboardingCase,
} from "@/features/offboarding/api/offboarding.client";
import ExitQuestionField from "@/features/offboarding/ExitQuestionField";
import { DialogShell, fmtDate, ghostBtn, StatusPill } from "@/features/offboarding/offboarding-ui";

export default function CaseExitInterviewDialog({
  caseRow,
  onClose,
}: {
  caseRow: OffboardingCase;
  onClose: () => void;
}) {
  const [resp, setResp] = useState<ExitInterviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setResp(await getCaseExitInterview(caseRow.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load exit interview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [caseRow.id]);

  return (
    <DialogShell
      title={`Exit Interview · ${caseRow.caseNumber}`}
      subtitle={`${caseRow.employee.firstName} ${caseRow.employee.lastName}`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !resp ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No exit interview assigned to this case.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {resp.status === "Completed" ? (
                <StatusPill bg="#dcfce7" color="#15803d" label="Completed" />
              ) : (
                <StatusPill bg="#fef9c3" color="#b45309" label="Pending" />
              )}
              {resp.submittedAt && (
                <span className="text-[12px] text-gray-500">
                  Submitted {fmtDate(resp.submittedAt.slice(0, 10))}
                </span>
              )}
            </div>

            {resp.status !== "Completed" ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                The employee has not submitted this survey yet.
              </p>
            ) : (
              <div className="space-y-5">
                {(resp.template?.questions ?? []).map((q) => (
                  <ExitQuestionField key={q.id} question={q} value={resp.answers[q.id]} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Close</button>
      </div>
    </DialogShell>
  );
}
