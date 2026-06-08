"use client";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createDesignation,
  type DesignationApi,
  type DesignationInput,
  deleteDesignation,
  fetchDesignations,
  fetchGrades,
  type GradeOption,
  updateDesignation,
} from "@/lib/hrms-client";

interface DesignationRow {
  id: number;
  name: string;
  code: string;
  gradeId: number | null;
  gradeLabel: string | null;
  employeeCount: number;
}

const PAGE_SIZE = 10;
const PINK_GRADIENT = "linear-gradient(135deg, #ec4899 0%, #be185d 100%)";
const COLUMNS = ["Designation", "Code", "Grade", "Head Count", "Actions"];

// Combine API designations with the resolved grade options for display. The
// single UI grade lives in gradeMinId (gradeMin/gradeMax are kept in sync).
function toRows(
  designations: DesignationApi[],
  grades: GradeOption[],
): DesignationRow[] {
  const gradeById = new Map(grades.map((g) => [g.id, g]));
  return designations.map((d) => {
    const grade = d.gradeMinId != null ? gradeById.get(d.gradeMinId) : undefined;
    return {
      id: d.id,
      name: d.name,
      code: d.code ?? "",
      gradeId: d.gradeMinId,
      gradeLabel: grade?.code ?? null,
      employeeCount: d.employeeCount,
    };
  });
}

// ── form state ───────────────────────────────────────────────────────────────

interface DesignationFormState {
  name: string;
  code: string;
  gradeId: string; // "" = none
}

const EMPTY_FORM: DesignationFormState = { name: "", code: "", gradeId: "" };

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

function gradeLabel(g: GradeOption) {
  return `${g.code} — ${g.bandName}`;
}

// ── slide-in Add / Edit panel ────────────────────────────────────────────────

function DesignationFormPanel({
  open,
  initial,
  grades,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: DesignationRow | null;
  grades: GradeOption[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: DesignationFormState) => void;
}) {
  const [form, setForm] = useState<DesignationFormState>(EMPTY_FORM);
  const isEdit = initial !== null;

  // Populate (edit) or reset (add) whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name,
            code: initial.code,
            gradeId: initial.gradeId != null ? String(initial.gradeId) : "",
          }
        : EMPTY_FORM,
    );
  }, [open, initial]);

  function set<K extends keyof DesignationFormState>(
    key: K,
    val: DesignationFormState[K],
  ) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.gradeId) {
      toast.error("Designation name, code and grade are required.");
      return;
    }
    onSubmit({
      name: form.name.trim(),
      code: form.code.trim(),
      gradeId: form.gradeId,
    });
  }

  const headCount = initial?.employeeCount ?? 0;

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
              {isEdit ? "Edit Designation" : "Add Designation"}
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>
              Enter designation details
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
              <label htmlFor="desig-name" style={labelStyle}>
                Designation Name
                <Req />
              </label>
              <input
                id="desig-name"
                style={inputStyle}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Enter designation name"
              />
            </div>

            <div>
              <label htmlFor="desig-code" style={labelStyle}>
                Code
                <Req />
              </label>
              <input
                id="desig-code"
                style={inputStyle}
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="Enter designation code"
              />
            </div>

            <div>
              <label htmlFor="desig-grade" style={labelStyle}>
                Grade
                <Req />
              </label>
              <select
                id="desig-grade"
                style={inputStyle}
                value={form.gradeId}
                onChange={(e) => set("gradeId", e.target.value)}
              >
                <option value="">Select grade</option>
                {grades.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {gradeLabel(g)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="desig-headcount" style={labelStyle}>
                Head Count
              </label>
              <div className="relative">
                <input
                  id="desig-headcount"
                  readOnly
                  disabled
                  value={`${headCount} Employees`}
                  style={{
                    ...inputStyle,
                    background: "#f9fafb",
                    color: "#9ca3af",
                    cursor: "not-allowed",
                    paddingRight: 36,
                  }}
                />
                <Lock
                  size={14}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    pointerEvents: "none",
                  }}
                />
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "#9ca3af" }}>
                Automatically calculated based on employees in this designation.
              </p>
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
                  : "Save Designation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function DesignationPage() {
  const [designations, setDesignations] = useState<DesignationRow[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<DesignationRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function reload(gradeList: GradeOption[] = grades) {
    const data = await fetchDesignations();
    setDesignations(toRows(data, gradeList));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, gradeOptions] = await Promise.all([
          fetchDesignations(),
          fetchGrades(),
        ]);
        if (cancelled) return;
        setGrades(gradeOptions);
        setDesignations(toRows(data, gradeOptions));
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
    if (!q) return designations;
    return designations.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.gradeLabel ?? "").toLowerCase().includes(q),
    );
  }, [designations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function openAdd() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(row: DesignationRow) {
    setEditing(row);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  async function handleSubmit(form: DesignationFormState) {
    // Single UI grade → store in both gradeMin/gradeMax (collapsed range).
    const gradeId = form.gradeId ? Number(form.gradeId) : null;
    const input: DesignationInput = {
      name: form.name,
      code: form.code,
      gradeMinId: gradeId,
      gradeMaxId: gradeId,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateDesignation(editing.id, input);
        toast.success("Designation updated");
      } else {
        await createDesignation(input);
        toast.success("Designation added");
        setPage(1);
      }
      await reload();
      setPanelOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(`Failed to save designation: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row: DesignationRow) {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setDeletingId(row.id);
    try {
      await deleteDesignation(row.id);
      setDesignations((prev) => prev.filter((d) => d.id !== row.id));
      toast.success("Designation deleted");
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
          Failed to load designations: {loadError}
        </div>
      )}

      {/* Stat card */}
      <div className="mb-4">
        <div
          className="inline-flex items-center gap-4 rounded-2xl bg-white px-5 py-4"
          style={{ border: "1px solid #e5e7eb", minWidth: 280 }}
        >
          <span
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{ width: 48, height: 48, background: "#fce7f3" }}
          >
            <ClipboardList size={22} style={{ color: "#db2777" }} />
          </span>
          <div>
            <p className="text-[12px]" style={{ color: "#6b7280" }}>
              Total Designations
            </p>
            <p className="text-[24px] font-bold text-gray-900 mt-1 leading-none">
              {designations.length}
            </p>
          </div>
        </div>
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
              placeholder="Search designations..."
              className="flex-1 text-[13px] text-gray-700"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
              }}
            />
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
            Add Designation
          </button>
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
            <col style={{ width: "32%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "16%" }} />
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
                  Loading designations…
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
                    ? "No designations match your search."
                    : "No designations yet. Click “Add Designation” to create one."}
                </td>
              </tr>
            ) : (
              pageRows.map((desig) => (
                <tr key={desig.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">
                    {desig.name}
                  </td>
                  <td
                    className="px-5 py-3.5 text-[13px] font-medium"
                    style={{ color: "#be185d" }}
                  >
                    {desig.code || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">
                    {desig.gradeLabel ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">
                    {desig.employeeCount}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(desig)}
                        aria-label={`Edit ${desig.name}`}
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
                        onClick={() => handleDelete(desig)}
                        disabled={deletingId === desig.id}
                        aria-label={`Delete ${desig.name}`}
                        className="flex items-center justify-center rounded-lg bg-white"
                        style={{
                          width: 32,
                          height: 32,
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          cursor: deletingId === desig.id ? "wait" : "pointer",
                          opacity: deletingId === desig.id ? 0.5 : 1,
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
              ? "Showing 0 designations"
              : `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} designations`}
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

      <DesignationFormPanel
        open={panelOpen}
        initial={editing}
        grades={grades}
        submitting={submitting}
        onClose={closePanel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
