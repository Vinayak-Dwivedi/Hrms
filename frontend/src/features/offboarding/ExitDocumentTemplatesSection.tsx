"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  EXIT_DOC_CATEGORY_LABEL,
  EXIT_DOC_VARIABLES,
  type ExitDocCategory,
  type ExitDocumentTemplate,
  listDocumentTemplates,
  updateDocumentTemplate,
} from "@/features/offboarding/api/offboarding.client";
import {
  ActionBtn,
  cellStyle,
  DialogShell,
  EmptyRow,
  ghostBtn,
  headStyle,
  inputClass,
  labelClass,
  primaryBtn,
  StatusPill,
  TableShell,
} from "@/features/offboarding/offboarding-ui";

const CATEGORIES: ExitDocCategory[] = ["HR", "Finance", "Employee"];

export default function ExitDocumentTemplatesSection() {
  const [rows, setRows] = useState<ExitDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ExitDocumentTemplate | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listDocumentTemplates());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(t: ExitDocumentTemplate) {
    if (!confirm(`Delete document template "${t.name}"?`)) return;
    try {
      await deleteDocumentTemplate(t.id);
      toast.success("Template deleted.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={primaryBtn} onClick={() => setAddOpen(true)} type="button">
          <Plus className="w-4 h-4" /> Add Template
        </button>
      </div>

      <TableShell minWidth={640}>
        <thead>
          <tr>
            <th style={headStyle}>Name</th>
            <th style={headStyle}>Category</th>
            <th style={headStyle}>Order</th>
            <th style={headStyle}>Status</th>
            <th style={{ ...headStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow colSpan={5} text="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={5} text="No document templates." />
          ) : (
            rows.map((t) => (
              <tr key={t.id} className="hover:bg-[#fafbfc] transition-colors">
                <td style={{ ...cellStyle, fontWeight: 500, color: "#111827" }}>{t.name}</td>
                <td style={cellStyle}>{EXIT_DOC_CATEGORY_LABEL[t.category]}</td>
                <td style={cellStyle}>{t.sortOrder}</td>
                <td style={cellStyle}>
                  {t.isActive ? (
                    <StatusPill bg="#dcfce7" color="#15803d" label="Active" />
                  ) : (
                    <StatusPill bg="#f3f4f6" color="#6b7280" label="Inactive" />
                  )}
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <div className="flex items-center justify-end gap-2">
                    <ActionBtn title="Edit" border="#e5e7eb" color="#6b7280" onClick={() => setEditTarget(t)}>
                      <Pencil size={15} />
                    </ActionBtn>
                    <ActionBtn title="Delete" border="#fca5a5" color="#dc2626" onClick={() => remove(t)}>
                      <Trash2 size={15} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>

      {(addOpen || editTarget) && (
        <DocTemplateDialog
          target={editTarget}
          onClose={() => {
            setAddOpen(false);
            setEditTarget(null);
          }}
          onSaved={() => {
            setAddOpen(false);
            setEditTarget(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function DocTemplateDialog({
  target,
  onClose,
  onSaved,
}: {
  target: ExitDocumentTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [category, setCategory] = useState<ExitDocCategory>(target?.category ?? "HR");
  const [sortOrder, setSortOrder] = useState(String(target?.sortOrder ?? 100));
  const [isActive, setIsActive] = useState(target?.isActive ?? true);
  const [html, setHtml] = useState(
    target?.htmlTemplate ?? "<h2>Document Title</h2>\n<p>Date: {{currentDate}}</p>\n<p>Dear {{employeeName}},</p>\n<p></p>\n<p>Regards,<br/>{{companyName}}</p>",
  );
  const [busy, setBusy] = useState(false);
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);

  function insertVar(v: string) {
    const token = `{{${v}}}`;
    const el = htmlRef.current;
    if (!el) {
      setHtml((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? html.length;
    const end = el.selectionEnd ?? html.length;
    const next = html.slice(0, start) + token + html.slice(end);
    setHtml(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function submit() {
    if (!name.trim() || !html.trim()) {
      toast.error("Name and HTML are required.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        category,
        htmlTemplate: html,
        isActive,
        sortOrder: Number(sortOrder) || 100,
      };
      if (target) await updateDocumentTemplate(target.id, body);
      else await createDocumentTemplate(body);
      toast.success(target ? "Template updated." : "Template created.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title={target ? "Edit Document Template" : "New Document Template"}
      subtitle="Use {{tokens}} — they are filled in when a document is generated"
      maxWidth="max-w-3xl"
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Relieving Letter" />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select className={`${inputClass} bg-white`} value={category} onChange={(e) => setCategory(e.target.value as ExitDocCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXIT_DOC_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sort Order</label>
            <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer pt-6">
            <input type="checkbox" className="w-4 h-4 accent-[#FF014F]" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>

        <div>
          <label className={labelClass}>Available Variables (click to insert)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {EXIT_DOC_VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="px-2 py-1 text-[11px] font-medium rounded-md bg-[#fff1f2] text-[#be185d] hover:bg-[#fecdd3] transition-colors"
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
          <label className={labelClass}>HTML Template</label>
          <textarea
            ref={htmlRef}
            className="w-full min-h-[260px] px-3 py-2 border border-gray-300 rounded-md text-[13px] font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#ffb9ce]"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <button className={ghostBtn} onClick={onClose} type="button">Cancel</button>
        <button className={primaryBtn} onClick={submit} disabled={busy} type="button">
          {busy ? "Saving…" : "Save Template"}
        </button>
      </div>
    </DialogShell>
  );
}
