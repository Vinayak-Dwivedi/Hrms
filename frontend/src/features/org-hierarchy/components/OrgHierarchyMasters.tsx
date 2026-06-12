"use client";

import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import { MasterTabBar, type MasterTabId } from "@/features/org-hierarchy/components/HierarchyTabBar";
import {
  createOrgDepartment,
  createOrgDesignation,
  createOrgLevel,
  createOrgSubDepartment,
  deleteOrgDepartment,
  deleteOrgDesignation,
  deleteOrgLevel,
  deleteOrgSubDepartment,
  fetchOrgDepartments,
  fetchOrgDesignations,
  fetchOrgLevels,
  fetchOrgSubDepartments,
  type OrgDepartment,
  type OrgDesignation,
  type OrgLevel,
  type OrgSubDepartment,
  updateOrgDepartment,
  updateOrgDesignation,
  updateOrgLevel,
  updateOrgSubDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  departmentFormSchema,
  designationFormSchema,
  emptyDepartmentForm,
  emptyDesignationForm,
  emptyLevelForm,
  emptySubDepartmentForm,
  levelFormSchema,
  subDepartmentFormSchema,
  type DepartmentFormValues,
  type DesignationFormValues,
  type LevelFormValues,
  type SubDepartmentFormValues,
} from "@/features/org-hierarchy/schemas/org-hierarchy.schema";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeBtnSmClass,
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeIconSm,
  employeeIconXs,
  employeeInputClass,
  employeeListTableBadgeClass,
  employeeListTableCellClass,
  employeeListTableEmptyClass,
  employeeListTableFooterClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
  employeeListTableSummaryClass,
  employeeListPaginationBtnClass,
  employeeListPaginationBtnActiveClass,
  employeeListPaginationBtnInactiveClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";

type Props = {
  onChanged: () => void;
};

export default function OrgHierarchyMasters({ onChanged }: Props) {
  const [tab, setTab] = useState<MasterTabId>("departments");
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [subDepartments, setSubDepartments] = useState<OrgSubDepartment[]>([]);
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [designations, setDesignations] = useState<OrgDesignation[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deptForm, setDeptForm] = useState<DepartmentFormValues>(emptyDepartmentForm);
  const [subForm, setSubForm] = useState<SubDepartmentFormValues>(emptySubDepartmentForm);
  const [levelForm, setLevelForm] = useState<LevelFormValues>(emptyLevelForm);
  const [desigForm, setDesigForm] = useState<DesignationFormValues>(emptyDesignationForm);

  const reload = useCallback(async () => {
    try {
      const [d, sub, lvl, des] = await Promise.all([
        fetchOrgDepartments(),
        fetchOrgSubDepartments(),
        fetchOrgLevels(),
        fetchOrgDesignations(),
      ]);
      setDepartments(d);
      setSubDepartments(sub);
      setLevels(lvl);
      setDesignations(des);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openAdd() {
    setEditId(null);
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setDeptForm(emptyDepartmentForm);
    setSubForm(emptySubDepartmentForm);
    setLevelForm(emptyLevelForm);
    setDesigForm(emptyDesignationForm);
  }

  async function handleDelete(kind: MasterTabId, id: number) {
    if (!window.confirm("Delete this record?")) return;
    try {
      if (kind === "departments") await deleteOrgDepartment(id);
      else if (kind === "sub-departments") await deleteOrgSubDepartment(id);
      else if (kind === "levels") await deleteOrgLevel(id);
      else await deleteOrgDesignation(id);
      toast.success("Deleted.");
      await reload();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "departments") {
        const parsed = departmentFormSchema.safeParse(deptForm);
        if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
        if (editId != null) {
          await updateOrgDepartment(editId, parsed.data);
        } else {
          await createOrgDepartment(parsed.data);
        }
      } else if (tab === "sub-departments") {
        const parsed = subDepartmentFormSchema.safeParse(subForm);
        if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
        const payload = {
          departmentId: Number(parsed.data.departmentId),
          name: parsed.data.name,
          status: parsed.data.status,
        };
        if (editId != null) await updateOrgSubDepartment(editId, payload);
        else await createOrgSubDepartment(payload);
      } else if (tab === "levels") {
        const parsed = levelFormSchema.safeParse(levelForm);
        if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
        const payload = {
          code: parsed.data.code,
          name: parsed.data.name,
          sortOrder: parsed.data.sortOrder.trim()
            ? Number(parsed.data.sortOrder)
            : undefined,
        };
        if (editId != null) await updateOrgLevel(editId, payload);
        else await createOrgLevel(payload);
      } else if (tab === "designations") {
        const parsed = designationFormSchema.safeParse(desigForm);
        if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
        const payload = {
          name: parsed.data.name,
          code: parsed.data.code.trim() || undefined,
          levelId: Number(parsed.data.levelId),
          status: parsed.data.status,
        };
        if (editId != null) await updateOrgDesignation(editId, payload);
        else await createOrgDesignation(payload);
      }
      toast.success(editId != null ? "Updated." : "Created.");
      closeModal();
      await reload();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const modalTitle =
    tab === "departments"
      ? editId != null
        ? "Edit Department"
        : "Add Department"
      : tab === "sub-departments"
        ? editId != null
          ? "Edit Sub Department"
          : "Add Sub Department"
        : tab === "levels"
          ? editId != null
            ? "Edit Level / Grade"
            : "Add Level / Grade"
          : editId != null
            ? "Edit Designation"
            : "Add Designation";

  const addLabel =
    tab === "departments"
      ? "Add Department"
      : tab === "sub-departments"
        ? "Add Sub Department"
        : tab === "designations"
          ? "Add Designation"
          : "Add Level / Grade";

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <MasterTabBar active={tab} onChange={setTab} />
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100">
          <button className={employeeBtnSmClass} onClick={openAdd} type="button">
            <PlusCircle className={employeeIconXs} />
            {addLabel}
          </button>
        </div>
      </div>

      {tab === "departments" && (
        <MasterTable
          emptyMessage="No departments found."
          headers={["Department Name", "Department Code", "Status", "Action"]}
          rows={departments.map((d) => ({
            id: d.id,
            cells: [d.name, d.code, d.status],
          }))}
          onDelete={(id) => void handleDelete("departments", id)}
          onEdit={(id) => {
            const row = departments.find((d) => d.id === id);
            if (!row) return;
            setEditId(id);
            setDeptForm({ name: row.name, code: row.code, status: row.status });
            setModalOpen(true);
          }}
        />
      )}

      {tab === "sub-departments" && (
        <MasterTable
          emptyMessage="No sub-departments found."
          headers={["Department", "Sub Department Name", "Status", "Action"]}
          rows={subDepartments.map((s) => ({
            id: s.id,
            cells: [
              departments.find((d) => d.id === s.departmentId)?.name ??
                String(s.departmentId),
              s.name,
              s.status,
            ],
          }))}
          onDelete={(id) => void handleDelete("sub-departments", id)}
          onEdit={(id) => {
            const row = subDepartments.find((s) => s.id === id);
            if (!row) return;
            setEditId(id);
            setSubForm({
              departmentId: String(row.departmentId),
              name: row.name,
              status: row.status,
            });
            setModalOpen(true);
          }}
        />
      )}

      {tab === "designations" && (
        <MasterTable
          emptyMessage="No designations found."
          headers={["Designation Name", "Designation Code", "Level / Grade", "Status", "Action"]}
          rows={designations.map((d) => ({
            id: d.id,
            cells: [
              d.name,
              d.code ?? "—",
              levels.find((l) => l.id === d.levelId)?.code ?? String(d.levelId),
              d.status,
            ],
          }))}
          onDelete={(id) => void handleDelete("designations", id)}
          onEdit={(id) => {
            const row = designations.find((d) => d.id === id);
            if (!row) return;
            setEditId(id);
            setDesigForm({
              name: row.name,
              code: row.code ?? "",
              levelId: String(row.levelId),
              status: row.status,
            });
            setModalOpen(true);
          }}
        />
      )}

      {tab === "levels" && (
        <MasterTable
          emptyMessage="No levels found."
          headers={["Levels / Grades", "Name", "Sort", "Action"]}
          rows={levels.map((l) => ({
            id: l.id,
            cells: [l.code, l.name, l.sortOrder],
          }))}
          onDelete={(id) => void handleDelete("levels", id)}
          onEdit={(id) => {
            const row = levels.find((l) => l.id === id);
            if (!row) return;
            setEditId(id);
            setLevelForm({
              code: row.code,
              name: row.name,
              sortOrder: String(row.sortOrder),
            });
            setModalOpen(true);
          }}
        />
      )}

      <EmployeeModalShell open={modalOpen} onClose={closeModal} title={modalTitle}>
        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          {error && <div className={employeeErrorBannerClass}>{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tab === "departments" && (
              <>
                <Field label="Department Name" value={deptForm.name} onChange={(v) => setDeptForm((f) => ({ ...f, name: v }))} />
                <Field label="Department Code" value={deptForm.code} onChange={(v) => setDeptForm((f) => ({ ...f, code: v }))} />
                <SelectField
                  label="Status"
                  value={deptForm.status}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                  onChange={(v) => setDeptForm((f) => ({ ...f, status: v as DepartmentFormValues["status"] }))}
                />
              </>
            )}

            {tab === "sub-departments" && (
              <>
                <SelectField
                  label="Department"
                  value={subForm.departmentId}
                  options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                  onChange={(v) => setSubForm((f) => ({ ...f, departmentId: v }))}
                  placeholder="Select department"
                />
                <Field label="Sub Department Name" value={subForm.name} onChange={(v) => setSubForm((f) => ({ ...f, name: v }))} />
                <SelectField
                  label="Status"
                  value={subForm.status}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                  onChange={(v) => setSubForm((f) => ({ ...f, status: v as SubDepartmentFormValues["status"] }))}
                />
              </>
            )}

            {tab === "levels" && (
              <>
                <Field label="Code" value={levelForm.code} onChange={(v) => setLevelForm((f) => ({ ...f, code: v }))} />
                <Field label="Name" value={levelForm.name} onChange={(v) => setLevelForm((f) => ({ ...f, name: v }))} />
                <Field label="Sort Order" value={levelForm.sortOrder} onChange={(v) => setLevelForm((f) => ({ ...f, sortOrder: v }))} />
              </>
            )}

            {tab === "designations" && (
              <>
                <Field label="Designation Name" value={desigForm.name} onChange={(v) => setDesigForm((f) => ({ ...f, name: v }))} />
                <Field label="Designation Code" value={desigForm.code} onChange={(v) => setDesigForm((f) => ({ ...f, code: v }))} />
                <SelectField
                  label="Level / Grade"
                  value={desigForm.levelId}
                  options={levels.map((l) => ({ value: String(l.id), label: `${l.code} — ${l.name}` }))}
                  onChange={(v) => setDesigForm((f) => ({ ...f, levelId: v }))}
                  placeholder="Select level"
                />
                <SelectField
                  label="Status"
                  value={desigForm.status}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                  onChange={(v) => setDesigForm((f) => ({ ...f, status: v as DesignationFormValues["status"] }))}
                />
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
            <button type="button" className={employeeBtnOutlineSmClass} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className={employeeBtnClass} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </EmployeeModalShell>
    </>
  );
}

function MasterTable({
  headers,
  rows,
  emptyMessage,
  onEdit,
  onDelete,
}: {
  headers: string[];
  rows: { id: number; cells: (string | number)[] }[];
  emptyMessage: string;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = useMemo(
    () => rows.slice(start, start + pageSize),
    [rows, start],
  );
  const rangeStart = rows.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + pageSize, rows.length);

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-nowrap">
              {headers.map((h) => (
                <th key={h} className={employeeListTableHeadClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className={employeeListTableEmptyClass}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className={employeeListTableRowClass}>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={employeeListTableCellClass}>
                      {cell === "Active" || cell === "Inactive" ? (
                        <StatusBadge status={String(cell)} />
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                  <td className={employeeListTableCellClass}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className={employeeEditIconBtnClass}
                        onClick={() => onEdit(row.id)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className={employeeIconSm} />
                      </button>
                      <button
                        type="button"
                        className={employeeEditIconBtnClass}
                        onClick={() => onDelete(row.id)}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className={employeeIconSm} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className={employeeListTableFooterClass}>
          <p className={employeeListTableSummaryClass}>
            Showing <span className="font-medium">{rangeStart}</span> to{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{rows.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className={employeeListPaginationBtnClass}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              type="button"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  className={
                    p === safePage
                      ? employeeListPaginationBtnActiveClass
                      : employeeListPaginationBtnInactiveClass
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            <button
              className={employeeListPaginationBtnClass}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "Active";
  return (
    <span
      className={`${employeeListTableBadgeClass} ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={employeeFilterLabelClass}>{label}</label>
      <input
        className={employeeInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={employeeFilterLabelClass}>{label}</label>
      <select
        className={employeeSelectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}