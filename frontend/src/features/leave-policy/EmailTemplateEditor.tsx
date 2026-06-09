"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  X,
  Save,
  Eye,
  PencilLine,
} from "lucide-react";

// Modal editor for the approval email template. Two views:
//   - "Edit"    — Subject + Body with a small formatting toolbar and a
//                 variable side-panel that inserts tokens at cursor position.
//   - "Preview" — renders the template with variables substituted with
//                 sample values, so HR can sanity-check the message before
//                 saving.
//
// The variables are token strings like ${Employee_ID}. They're inserted
// verbatim and substituted at send-time by the mailer (out of scope here).

const VARIABLES: Array<{ token: string; label: string; sample: string }> = [
  { token: "${Employee_ID}",    label: "Employee ID",    sample: "ILD-2847" },
  { token: "${Employee_Name}",  label: "Employee Name",  sample: "Rahul Mehta" },
  { token: "${Leave_Type}",     label: "Leave Type",     sample: "Casual Leave" },
  { token: "${From}",           label: "From",           sample: "12 Jun 2026" },
  { token: "${To}",             label: "To",             sample: "13 Jun 2026" },
  { token: "${Number_of_Days}", label: "Number of Days", sample: "1.5" },
  { token: "${Reason}",         label: "Reason",         sample: "Family event" },
  { token: "${Approver_Name}",  label: "Approver Name",  sample: "Priya Sharma" },
  { token: "${Added_By}",       label: "Added By",       sample: "Rahul Mehta" },
  { token: "${Added_Time}",     label: "Added Time",     sample: "10 Jun 2026, 10:32 AM" },
  { token: "${Status}",         label: "Status",         sample: "Approved" },
];

function substitute(text: string): string {
  let out = text;
  for (const v of VARIABLES) {
    out = out.split(v.token).join(v.sample);
  }
  return out;
}

// Replace the visible selection in the textarea with `insert`. Falls back to
// appending at the end if the ref isn't ready. Restores focus + selection so
// the caret sits right after the inserted text.
function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  current: string,
  insert: string,
): string {
  const el = ref.current;
  if (!el) return current + insert;
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  // Restore caret in the next tick (after React commits the value).
  setTimeout(() => {
    el.focus();
    const caret = start + insert.length;
    el.setSelectionRange?.(caret, caret);
  }, 0);
  return next;
}

export default function EmailTemplateEditor({
  open,
  subject,
  body,
  onSave,
  onClose,
}: {
  open: boolean;
  subject: string;
  body: string;
  onSave: (next: { subject: string; body: string }) => void;
  onClose: () => void;
}) {
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(body);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [focusTarget, setFocusTarget] = useState<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Whenever the parent re-opens with different content, reset the draft.
  useEffect(() => {
    if (open) {
      setDraftSubject(subject);
      setDraftBody(body);
      setView("edit");
      setFocusTarget("body");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc closes — same convention as the user-menu logout modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function insertVariable(token: string) {
    if (focusTarget === "subject") {
      setDraftSubject((cur) => insertAtCursor(subjectRef, cur, token));
    } else {
      setDraftBody((cur) => insertAtCursor(bodyRef, cur, token));
    }
  }

  function wrap(prefix: string, suffix: string) {
    const ref = focusTarget === "subject" ? subjectRef : bodyRef;
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = focusTarget === "subject" ? draftSubject : draftBody;
    const selected = current.slice(start, end) || "text";
    const wrapped = `${prefix}${selected}${suffix}`;
    const next = current.slice(0, start) + wrapped + current.slice(end);
    if (focusTarget === "subject") setDraftSubject(next);
    else setDraftBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange?.(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  function save() {
    onSave({ subject: draftSubject, body: draftBody });
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF014F] to-[#eb0249] flex items-center justify-center">
              <PencilLine size={14} className="text-white" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                Edit Email Template
              </h3>
              <p className="text-[12px] text-gray-500 leading-tight">
                Personalise the message sent when this approval fires.
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg p-1 inline-flex">
              <button
                type="button"
                onClick={() => setView("edit")}
                className={[
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-colors",
                  view === "edit"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
              >
                <PencilLine size={12} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setView("preview")}
                className={[
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-colors",
                  view === "preview"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
              >
                <Eye size={12} />
                Preview
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_260px]">
          {/* Left — editor or preview */}
          <div className="flex flex-col min-h-0 border-r border-gray-100">
            {view === "edit" ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50/60">
                  <ToolbarButton
                    icon={Bold}
                    title="Bold (wraps with **)"
                    onClick={() => wrap("**", "**")}
                  />
                  <ToolbarButton
                    icon={Italic}
                    title="Italic (wraps with _)"
                    onClick={() => wrap("_", "_")}
                  />
                  <ToolbarButton
                    icon={LinkIcon}
                    title="Link (wraps with [text](url))"
                    onClick={() => wrap("[", "](https://)")}
                  />
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <ToolbarButton
                    icon={List}
                    title="Bullet line"
                    onClick={() => wrap("\n- ", "")}
                  />
                  <ToolbarButton
                    icon={ListOrdered}
                    title="Numbered line"
                    onClick={() => wrap("\n1. ", "")}
                  />
                  <span className="ml-auto text-[11px] text-gray-400">
                    Markdown-flavored — rendered as HTML when sent.
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-auto p-5 flex flex-col gap-4">
                  {/* Subject */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-gray-700">
                      Subject
                    </label>
                    <input
                      ref={subjectRef}
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      onFocus={() => setFocusTarget("subject")}
                      placeholder="Your request has been approved"
                      className="px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
                    />
                  </div>

                  {/* Body */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[12px] font-semibold text-gray-700">
                      Body
                    </label>
                    <textarea
                      ref={bodyRef}
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      onFocus={() => setFocusTarget("body")}
                      placeholder="Write your message here. Use the side panel to insert variables…"
                      className="flex-1 min-h-[260px] px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af] resize-none font-mono leading-relaxed"
                    />
                  </div>
                </div>
              </>
            ) : (
              // Preview mode — render-ish view with variables substituted.
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-[640px] mx-auto bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                    <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                      Subject
                    </p>
                    <p className="text-[15px] font-bold text-gray-900">
                      {substitute(draftSubject) || (
                        <span className="text-gray-400 font-normal italic">
                          (empty)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="px-5 py-5">
                    <pre className="text-[13.5px] leading-relaxed text-gray-800 whitespace-pre-wrap font-sans">
                      {substitute(draftBody) || (
                        <span className="text-gray-400 italic">
                          The body is empty.
                        </span>
                      )}
                    </pre>
                  </div>
                </div>
                <p className="mt-3 text-center text-[11.5px] text-gray-400 max-w-[640px] mx-auto leading-relaxed">
                  Variables shown above use sample data (e.g. <code>ILD-2847</code>,{" "}
                  <code>Casual Leave</code>). At send time they're replaced with
                  the actual request values.
                </p>
              </div>
            )}
          </div>

          {/* Right — variable picker */}
          <aside className="bg-gray-50/40 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase">
                Insert variable
              </p>
              <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">
                Click a variable to insert it at the cursor position in the{" "}
                <strong>{focusTarget}</strong> field.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(v.token)}
                  className="w-full text-left px-4 py-2 hover:bg-white border-b border-gray-100 last:border-b-0 transition-colors group"
                >
                  <p className="text-[12.5px] font-semibold text-gray-800">
                    {v.label}
                  </p>
                  <code className="text-[10.5px] text-gray-400 group-hover:text-[#be185d]">
                    {v.token}
                  </code>
                </button>
              ))}
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-[12px] text-gray-500">
            {draftBody.length} characters · {draftSubject.length}/100 subject
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
            >
              <Save size={14} />
              Save Template
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-600 hover:text-[#be185d] hover:bg-white hover:shadow-sm transition-all"
    >
      <Icon size={13} />
    </button>
  );
}
