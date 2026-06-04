"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createDepartment,
  type DepartmentApi,
  type DepartmentInput,
  type DeptLeadOption,
  deleteDepartment,
  fetchDepartments,
  fetchDeptLeadOptions,
  updateDepartment,
} from "@/lib/hrms-client";

interface DepartmentRow {
  id: number;
  name: string;
  code: string;
  leadId: number | null;
  leadName: string | null;
  leadRole: string | null;
}

const PAGE_SIZE = 10;
const PINK_GRADIENT = "linear-gradient(135deg, #ec4899 0%, #be185d 100%)";
const COLUMNS = ["Department", "Code", "Department Lead", "Actions"];

// Combine API departments with the resolved lead options for display.
function toRows(
  depts: DepartmentApi[],
  leads: DeptLeadOption[],
): DepartmentRow[] {
  const leadById = new Map(leads.map((l) => [l.id, l]));
  return depts.map((d) => {
    const lead = d.managerId != null ? leadById.get(d.managerId) : undefined;
    return {
      id: d.id,
      name: d.name,
      code: d.code ?? "",
      leadId: d.managerId,
      leadName: lead?.name ?? null,
      leadRole: lead?.role ?? null,
    };
  });
}

// ── form state ───────────────────────────────────────────────────────────────

interface DepartmentFormState {
  name: string;
  code: string;
  leadId: string; // "" = no lead
}

const EMPTY_FORM: DepartmentFormState = { name: "", code: "", leadId: "" };

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "block",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

function Req() {
  return <span style={{ color: "#dc2626" }}> *</span>;
}

function leadLabel(l: DeptLeadOption) {
  return l.role ? `${l.name} — ${l.role}` : `${l.name} (${l.empCode})`;
}

// ── slide-in Add / Edit panel ────────────────────────────────────────────────

function DepartmentFormPanel({
  open,
  initial,
  leads,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: DepartmentRow | null;
  leads: DeptLeadOption[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: DepartmentFormState) => void;
}) {
  const [form, setForm] = useState<DepartmentFormState>(EMPTY_FORM);
  const isEdit = initial !== null;

  // Populate (edit) or reset (add) whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name,
            code: initial.code,
            leadId: initial.leadId != null ? String(initial.leadId) : "",
          }
        : EMPTY_FORM,
    );
  }, [open, initial]);

  function set<K extends keyof DepartmentFormState>(
    key: K,
    val: DepartmentFormState[K],
  ) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Department name and code are required.");
      return;
    }
    onSubmit({
      name: form.name.trim(),
      code: form.code.trim(),
      leadId: form.leadId,
    });
  }

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close; panel has an explicit ✕ button */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.45)",
          opacity: open ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* Panel */}
      <div
        className="flex flex-col"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: 440,
          maxWidth: "100%",
          background: "#fff",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div>
            <h2 className="text-[17px] font-bold text-gray-900">
              {isEdit ? "Edit Department" : "Add Department"}
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>
              Enter department details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              border: "1px solid #e5e7eb",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-auto"
        >
          <div className="flex flex-col gap-4 px-6 py-5 flex-1">
            <div>
              <label htmlFor="dept-name" style={labelStyle}>
                Department Name
                <Req />
              </label>
              <input
                id="dept-name"
                style={inputStyle}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Enter department name"
              />
            </div>

            <div>
              <label htmlFor="dept-code" style={labelStyle}>
                Department Code
                <Req />
              </label>
              <input
                id="dept-code"
                style={inputStyle}
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="Enter department code"
              />
            </div>

            <div>
              <label htmlFor="dept-lead" style={labelStyle}>
                Department Lead
              </label>
              <select
                id="dept-lead"
                style={inputStyle}
                value={form.leadId}
                onChange={(e) => set("leadId", e.target.value)}
              >
                <option value="">Select department lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {leadLabel(l)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: "1px solid #f3f4f6" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl text-[13px] font-semibold px-5 py-2.5 bg-white"
              style={{
                border: "1px solid #e5e7eb",
                color: "#374151",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl text-[13px] font-bold text-white px-6 py-2.5"
              style={{
                background: PINK_GRADIENT,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Save Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function DepartmentPage() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [leads, setLeads] = useState<DeptLeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function reload(leadList: DeptLeadOption[] = leads) {
    const depts = await fetchDepartments();
    setDepartments(toRows(depts, leadList));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [depts, leadOptions] = await Promise.all([
          fetchDepartments(),
          fetchDeptLeadOptions(),
        ]);
        if (cancelled) return;
        setLeads(leadOptions);
        setDepartments(toRows(depts, leadOptions));
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.leadName ?? "").toLowerCase().includes(q),
    );
  }, [departments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const withLead = departments.filter((d) => d.leadId != null).length;
  const withoutLead = departments.length - withLead;

  const stats = [
    {
      label: "Total Departments",
      value: departments.length,
      icon: Building2,
      iconBg: "#fce7f3",
      iconColor: "#db2777",
    },
    {
      label: "Departments With Lead",
      value: withLead,
      icon: UserCheck,
      iconBg: "#ede9fe",
      iconColor: "#7c3aed",
    },
    {
      label: "Departments Without Lead",
      value: withoutLead,
      icon: UserX,
      iconBg: "#ffedd5",
      iconColor: "#d97706",
    },
  ];

  function openAdd() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(row: DepartmentRow) {
    setEditing(row);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  async function handleSubmit(form: DepartmentFormState) {
    const input: DepartmentInput = {
      name: form.name,
      code: form.code,
      managerId: form.leadId ? Number(form.leadId) : null,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, input);
        toast.success("Department updated");
      } else {
        await createDepartment(input);
        toast.success("Department added");
        setPage(1);
      }
      await reload();
      setPanelOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(`Failed to save department: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row: DepartmentRow) {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setDeletingId(row.id);
    try {
      await deleteDepartment(row.id);
      setDepartments((prev) => prev.filter((d) => d.id !== row.id));
      toast.success("Department deleted");
    } catch (e) {
      toast.error(`Failed to delete: ${(e as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="pt-2">
      {loadError && (
        <div
          className="mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Failed to load departments: {loadError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Departments</h1>
          <p className="text-[13px] mt-1" style={{ color: "#6b7280" }}>
            Manage organization departments and department owners
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl text-[13px] font-bold text-white px-4 py-2.5"
          style={{
            background: PINK_GRADIENT,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          Add Department
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 48, height: 48, background: s.iconBg }}
              >
                <Icon size={22} style={{ color: s.iconColor }} />
              </span>
              <div>
                <p className="text-[12px]" style={{ color: "#6b7280" }}>
                  {s.label}
                </p>
                <p className="text-[24px] font-bold text-gray-900 mt-1 leading-none">
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ border: "1px solid #e5e7eb" }}
      >
        {/* Controls */}
        <div className="flex items-center justify-between gap-3 p-4">
          <div
            className="flex items-center gap-2 rounded-xl px-3 flex-1"
            style={{ border: "1px solid #e5e7eb", maxWidth: 360, height: 40 }}
          >
            <Search size={16} style={{ color: "#9ca3af" }} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search departments..."
              className="flex-1 text-[13px] text-gray-700"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <table
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
          }}
        >
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr
              style={{
                background: "#f9fafb",
                borderTop: "1px solid #f3f4f6",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              {COLUMNS.map((c) => {
                const isActions = c === "Actions";
                return (
                  <th
                    key={c}
                    className="px-5 py-3 text-[10px] font-bold tracking-wider"
                    style={{
                      color: "#9ca3af",
                      textAlign: isActions ? "right" : "left",
                    }}
                  >
                    {c.toUpperCase()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-5 py-10 text-center text-[13px]"
                  style={{ color: "#9ca3af" }}
                >
                  Loading departments…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-5 py-10 text-center text-[13px]"
                  style={{ color: "#9ca3af" }}
                >
                  {search.trim()
                    ? "No departments match your search."
                    : "No departments yet. Click “Add Department” to create one."}
                </td>
              </tr>
            ) : (
              pageRows.map((dept) => (
                <tr key={dept.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">
                    {dept.name}
                  </td>
                  <td
                    className="px-5 py-3.5 text-[13px] font-medium"
                    style={{ color: "#be185d" }}
                  >
                    {dept.code || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {dept.leadName ? (
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-gray-900">
                          {dept.leadName}
                        </span>
                        {dept.leadRole && (
                          <span
                            className="text-[11px]"
                            style={{ color: "#9ca3af" }}
                          >
                            {dept.leadRole}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className="text-[13px]"
                        style={{ color: "#9ca3af" }}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(dept)}
                        aria-label={`Edit ${dept.name}`}
                        className="flex items-center justify-center rounded-lg bg-white"
                        style={{
                          width: 32,
                          height: 32,
                          border: "1px solid #e5e7eb",
                          color: "#374151",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dept)}
                        disabled={deletingId === dept.id}
                        aria-label={`Delete ${dept.name}`}
                        className="flex items-center justify-center rounded-lg bg-white"
                        style={{
                          width: 32,
                          height: 32,
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          cursor: deletingId === dept.id ? "wait" : "pointer",
                          opacity: deletingId === dept.id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid #f3f4f6" }}
        >
          <span className="text-[12px]" style={{ color: "#6b7280" }}>
            {filtered.length === 0
              ? "Showing 0 departments"
              : `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} departments`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg bg-white"
              style={{
                width: 32,
                height: 32,
                border: "1px solid #e5e7eb",
                color: safePage === 1 ? "#d1d5db" : "#374151",
                cursor: safePage === 1 ? "default" : "pointer",
              }}
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className="flex items-center justify-center rounded-lg text-[12px] font-semibold"
                style={{
                  width: 32,
                  height: 32,
                  border:
                    n === safePage ? "1px solid #db2777" : "1px solid #e5e7eb",
                  background: n === safePage ? "#fdf2f8" : "#fff",
                  color: n === safePage ? "#be185d" : "#374151",
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg bg-white"
              style={{
                width: 32,
                height: 32,
                border: "1px solid #e5e7eb",
                color: safePage === totalPages ? "#d1d5db" : "#374151",
                cursor: safePage === totalPages ? "default" : "pointer",
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <DepartmentFormPanel
        open={panelOpen}
        initial={editing}
        leads={leads}
        submitting={submitting}
        onClose={closePanel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
