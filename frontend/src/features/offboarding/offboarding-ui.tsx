"use client";

import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

// Shared visual primitives for the Offboarding hub — kept consistent with the
// leave-approvals tables and the employee portal theme (brand pink #FF014F).

export const cellStyle: CSSProperties = {
  padding: "14px 16px",
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid #f1f3f5",
  verticalAlign: "middle",
};

export const headStyle: CSSProperties = {
  padding: "13px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  textAlign: "left",
  whiteSpace: "nowrap",
  borderBottom: "1px solid #eef0f3",
  userSelect: "none",
};

export const labelClass =
  "block text-xs font-medium text-gray-500 uppercase mb-1.5 tracking-wide";
export const inputClass =
  "w-full h-[38px] px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#ffb9ce] focus:border-transparent";
export const primaryBtn =
  "inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF014F] hover:bg-[#eb0249] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60";
export const ghostBtn =
  "inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors text-xs";

export function StatusPill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span
      className="font-semibold"
      style={{ background: bg, color, padding: "3px 10px", borderRadius: 6, fontSize: 12 }}
    >
      {label}
    </span>
  );
}

export function TableShell({ minWidth, children }: { minWidth?: number; children: ReactNode }) {
  return (
    <div
      style={{ background: "#fff", borderRadius: 16, border: "1px solid #eef0f3", overflow: "hidden" }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: minWidth ?? 800 }}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td style={{ ...cellStyle, textAlign: "center", color: "#9ca3af", padding: 40 }} colSpan={colSpan}>
        {text}
      </td>
    </tr>
  );
}

export function ActionBtn({
  title,
  border,
  color,
  onClick,
  children,
}: {
  title: string;
  border: string;
  color: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      type="button"
      className="flex items-center justify-center rounded-lg transition-colors"
      style={{ width: 34, height: 34, border: `1.5px solid ${border}`, color, background: "#fff" }}
    >
      {children}
    </button>
  );
}

export function DialogShell({
  title,
  subtitle,
  maxWidth = "max-w-lg",
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/50 border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full ${maxWidth} px-4 max-h-[90vh]`}>
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="text-base font-semibold text-gray-900 m-0">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-1 mb-0">{subtitle}</p>}
            </div>
            <button
              aria-label="Close"
              className="p-2 rounded-lg hover:bg-gray-100 border-0 bg-transparent cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function initials(a: string, b: string) {
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
}

export function avatarColor(seed: string) {
  const palette = ["#FF014F", "#7c3aed", "#0ea5e9", "#16a34a", "#d97706", "#db2777"];
  let h = 0;
  for (let i = 0; i < (seed?.length ?? 0); i++) h = (h * 31 + seed.charCodeAt(i)) % palette.length;
  return palette[h];
}
