"use client";

import { FileText, Printer, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CaseDocumentItem,
  EXIT_DOC_CATEGORY_LABEL,
  type ExitDocCategory,
  generateDocument,
  getCaseDocuments,
  getDocument,
  type OffboardingCase,
  printDocumentHtml,
  sendDocument,
} from "@/features/offboarding/api/offboarding.client";
import { DialogShell, ghostBtn, StatusPill } from "@/features/offboarding/offboarding-ui";

const CATEGORY_ORDER: ExitDocCategory[] = ["HR", "Finance", "Employee"];

export default function CaseDocumentsDialog({
  caseRow,
  onClose,
  onChanged,
}: {
  caseRow: OffboardingCase;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<CaseDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    try {
      setRows(await getCaseDocuments(caseRow.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(item: CaseDocumentItem, print: boolean) {
    setBusyId(item.templateId);
    try {
      const doc = await generateDocument(caseRow.id, item.templateId);
      toast.success(`${item.name} generated.`);
      if (print) printDocumentHtml(doc.name, doc.renderedHtml);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate.");
    } finally {
      setBusyId(null);
    }
  }

  async function print(item: CaseDocumentItem) {
    if (!item.document) return;
    setBusyId(item.templateId);
    try {
      const doc = await getDocument(caseRow.id, item.document.id);
      printDocumentHtml(doc.name, doc.renderedHtml);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open document.");
    } finally {
      setBusyId(null);
    }
  }

  async function markSent(item: CaseDocumentItem) {
    if (!item.document) return;
    setBusyId(item.templateId);
    try {
      await sendDocument(caseRow.id, item.document.id);
      toast.success(`${item.name} marked sent.`);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark sent.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DialogShell
      title={`Exit Documents · ${caseRow.caseNumber}`}
      subtitle={`${caseRow.employee.firstName} ${caseRow.employee.lastName}`}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No document templates configured.</div>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const items = rows.filter((r) => r.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase mb-2">
                  {EXIT_DOC_CATEGORY_LABEL[cat]}
                </p>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {items.map((item) => {
                    const busy = busyId === item.templateId;
                    const status = item.document?.status ?? "Pending";
                    return (
                      <div key={item.templateId} className="flex items-center gap-3 px-4 py-3">
                        <FileText size={16} className="text-gray-400 shrink-0" />
                        <span className="text-[13px] text-gray-800 flex-1 min-w-0 truncate">
                          {item.name}
                        </span>
                        {status === "Pending" ? (
                          <StatusPill bg="#f3f4f6" color="#6b7280" label="Pending" />
                        ) : status === "Generated" ? (
                          <StatusPill bg="#dbeafe" color="#1d4ed8" label="Generated" />
                        ) : (
                          <StatusPill bg="#dcfce7" color="#15803d" label="Sent" />
                        )}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!item.document ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => generate(item, true)}
                              className="px-3 py-1.5 bg-[#FF014F] hover:bg-[#eb0249] text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-60"
                            >
                              {busy ? "…" : "Generate"}
                            </button>
                          ) : (
                            <>
                              <IconBtn title="Print / Save PDF" disabled={busy} onClick={() => print(item)}>
                                <Printer size={15} />
                              </IconBtn>
                              <IconBtn title="Regenerate" disabled={busy} onClick={() => generate(item, false)}>
                                <RefreshCw size={15} />
                              </IconBtn>
                              {item.document.status !== "Sent" && (
                                <IconBtn title="Mark sent" disabled={busy} onClick={() => markSent(item)} accent>
                                  <Send size={15} />
                                </IconBtn>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Close</button>
      </div>
    </DialogShell>
  );
}

function IconBtn({
  title,
  disabled,
  onClick,
  accent,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
      style={{
        width: 32,
        height: 32,
        border: `1.5px solid ${accent ? "#86efac" : "#e5e7eb"}`,
        color: accent ? "#16a34a" : "#6b7280",
        background: "#fff",
      }}
    >
      {children}
    </button>
  );
}
