"use client";

import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import { fetchBranches } from "@/features/employees/api/employees.client";
import {
  createOrgStructure,
  deleteOrgStructure,
  fetchOrgDepartments,
  fetchOrgDesignations,
  fetchOrgStructure,
  fetchOrgSubDepartments,
  type OrgDepartment,
  type OrgDesignation,
  type OrgLevel,
  type OrgStructure,
  type OrgSubDepartment,
  updateOrgStructure,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  emptyStructureForm,
  structureFormSchema,
  type StructureFormValues,
} from "@/features/org-hierarchy/schemas/org-hierarchy.schema";
import {
  filterDepartmentsByLocation,
  filterDesignationsByLocation,
  filterSubDepartmentsByDepartmentAndLocation,
} from "@/features/org-hierarchy/lib/org-hierarchy-location";
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
  levels: OrgLevel[];
  onChanged: () => void;
  editStructureId: number | null;
  onEditClose: () => void;
};

export default function StructureMappingPanel({
  levels,
  onChanged,
  editStructureId,
  onEditClose,
}: Props) {
  const [structures, setStructures] = useState<OrgStructure[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [allSubDepartments, setAllSubDepartments] = useState<OrgSubDepartment[]>([]);
  const [formSubDepartments, setFormSubDepartments] = useState<OrgSubDepartment[]>([]);
  const [designations, setDesignations] = useState<OrgDesignation[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [values, setValues] = useState<StructureFormValues>(emptyStructureForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(structures.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = useMemo(
    () => structures.slice(start, start + pageSize),
    [structures, start],
  );
  const rangeStart = structures.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + pageSize, structures.length);

  async function reload() {
    try {
      const [s, d, sub, des, brs] = await Promise.all([
        fetchOrgStructure(),
        fetchOrgDepartments(),
        fetchOrgSubDepartments(),
        fetchOrgDesignations(),
        fetchBranches(),
      ]);
      setStructures(s);
      setDepartments(d);
      setAllSubDepartments(sub);
      setDesignations(des);
      setBranches(brs);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!values.departmentId) {
      setFormSubDepartments([]);
      return;
    }
    void fetchOrgSubDepartments(Number(values.departmentId)).then(setFormSubDepartments);
  }, [values.departmentId]);

  const parsedLocationId = useMemo(() => {
    if (!locationId.trim()) return null;
    const id = Number(locationId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [locationId]);

  const visibleDepartments = useMemo(() => {
    if (parsedLocationId == null) return [];
    return filterDepartmentsByLocation(departments, parsedLocationId);
  }, [departments, parsedLocationId]);

  const visibleSubDepartments = useMemo(() => {
    if (parsedLocationId == null) return [];
    return filterSubDepartmentsByDepartmentAndLocation(
      formSubDepartments,
      values.departmentId ? Number(values.departmentId) : null,
      parsedLocationId,
    );
  }, [formSubDepartments, values.departmentId, parsedLocationId]);

  const visibleDesignations = useMemo(() => {
    if (
      parsedLocationId == null ||
      !values.departmentId ||
      !values.subDepartmentId
    ) {
      return [];
    }
    return filterDesignationsByLocation(designations, parsedLocationId);
  }, [
    designations,
    parsedLocationId,
    values.departmentId,
    values.subDepartmentId,
  ]);

  useEffect(() => {
    if (
      values.departmentId &&
      !visibleDepartments.some((row) => String(row.id) === values.departmentId)
    ) {
      setValues((current) => ({
        ...current,
        departmentId: "",
        subDepartmentId: "",
        designationId: "",
      }));
      return;
    }
    if (
      values.subDepartmentId &&
      !visibleSubDepartments.some(
        (row) => String(row.id) === values.subDepartmentId,
      )
    ) {
      setValues((current) => ({
        ...current,
        subDepartmentId: "",
        designationId: "",
      }));
      return;
    }
    if (
      values.designationId &&
      !visibleDesignations.some(
        (row) => String(row.id) === values.designationId,
      )
    ) {
      setValues((current) => ({
        ...current,
        designationId: "",
      }));
    }
  }, [
    values.departmentId,
    values.subDepartmentId,
    values.designationId,
    visibleDepartments,
    visibleSubDepartments,
    visibleDesignations,
  ]);

  useEffect(() => {
    if (editStructureId == null) return;
    void (async () => {
      const rows = await fetchOrgStructure();
      const row = rows.find((r) => r.id === editStructureId);
      if (!row) return;
      setEditId(row.id);
      setValues({
        departmentId: String(row.departmentId),
        subDepartmentId: String(row.subDepartmentId),
        designationId: String(row.designationId),
      });
      setModalOpen(true);
      onEditClose();
    })();
  }, [editStructureId, onEditClose]);

  const selectedDesignation = useMemo(
    () => designations.find((d) => String(d.id) === values.designationId),
    [designations, values.designationId],
  );

  const levelLabel = useMemo(() => {
    if (!selectedDesignation) return "";
    const level = levels.find((l) => l.id === selectedDesignation.levelId);
    return level ? `${level.code} — ${level.name}` : "";
  }, [selectedDesignation, levels]);

  function openAdd() {
    setEditId(null);
    setValues(emptyStructureForm);
    setLocationId("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: OrgStructure) {
    setEditId(row.id);
    setLocationId("");
    setValues({
      departmentId: String(row.departmentId),
      subDepartmentId: String(row.subDepartmentId),
      designationId: String(row.designationId),
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this hierarchy mapping?")) return;
    try {
      await deleteOrgStructure(id);
      toast.success("Mapping deleted.");
      await reload();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!locationId.trim()) {
      setError("Select a location first.");
      return;
    }
    const parsed = structureFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    const payload = {
      departmentId: Number(parsed.data.departmentId),
      subDepartmentId: Number(parsed.data.subDepartmentId),
      designationId: Number(parsed.data.designationId),
    };
    setSubmitting(true);
    try {
      if (editId != null) {
        await updateOrgStructure(editId, payload);
        toast.success("Mapping updated.");
      } else {
        await createOrgStructure(payload);
        toast.success("Mapping created.");
      }
      setModalOpen(false);
      await reload();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const deptName = (id: number) => departments.find((d) => d.id === id)?.name ?? id;
  const subName = (id: number) =>
    allSubDepartments.find((s) => s.id === id)?.name ?? id;
  const desigName = (id: number) =>
    designations.find((d) => d.id === id)?.name ?? id;
  const levelCode = (id: number) => levels.find((l) => l.id === id)?.code ?? id;

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="flex items-center justify-end pt-2">
          <button className={employeeBtnSmClass} onClick={openAdd} type="button">
            <PlusCircle className={employeeIconXs} />
            Add Mapping
          </button>
        </div>
      </div>

      <div className={`${employeeCardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-nowrap">
                {["Department", "Sub Department", "Designation", "Level / Grade", "Action"].map(
                  (h) => (
                    <th key={h} className={employeeListTableHeadClass}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={employeeListTableEmptyClass}>
                    No structure mappings found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className={employeeListTableRowClass}>
                    <td className={`${employeeListTableCellClass} font-medium`}>
                      {deptName(row.departmentId)}
                    </td>
                    <td className={employeeListTableCellClass}>
                      {subName(row.subDepartmentId)}
                    </td>
                    <td className={employeeListTableCellClass}>
                      {desigName(row.designationId)}
                    </td>
                    <td className={employeeListTableCellClass}>
                      {levelCode(row.levelId)}
                    </td>
                    <td className={employeeListTableCellClass}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={employeeEditIconBtnClass}
                          onClick={() => openEdit(row)}
                          aria-label="Edit mapping"
                          title="Edit"
                        >
                          <Pencil className={employeeIconSm} />
                        </button>
                        <button
                          type="button"
                          className={employeeEditIconBtnClass}
                          onClick={() => void handleDelete(row.id)}
                          aria-label="Delete mapping"
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

        {structures.length > 0 && (
          <div className={employeeListTableFooterClass}>
            <p className={employeeListTableSummaryClass}>
              Showing <span className="font-medium">{rangeStart}</span> to{" "}
              <span className="font-medium">{rangeEnd}</span> of{" "}
              <span className="font-medium">{structures.length}</span> results
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

      <EmployeeModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId != null ? "Edit Structure Mapping" : "Add Structure Mapping"}
      >
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && <div className={employeeErrorBannerClass}>{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={employeeFilterLabelClass} htmlFor="struct-location">
                Location
              </label>
              <select
                id="struct-location"
                className={employeeSelectClass}
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setValues((current) => ({
                    ...current,
                    departmentId: "",
                    subDepartmentId: "",
                    designationId: "",
                  }));
                }}
              >
                <option value="">Select location</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={employeeFilterLabelClass} htmlFor="struct-dept">
                Department
              </label>
              <select
                id="struct-dept"
                className={employeeSelectClass}
                value={values.departmentId}
                disabled={!locationId}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    departmentId: e.target.value,
                    subDepartmentId: "",
                    designationId: "",
                  }))
                }
              >
                <option value="">
                  {locationId ? "Select department" : "Select location first"}
                </option>
                {visibleDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={employeeFilterLabelClass} htmlFor="struct-sub">
                Sub Department
              </label>
              <select
                id="struct-sub"
                className={employeeSelectClass}
                value={values.subDepartmentId}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    subDepartmentId: e.target.value,
                    designationId: "",
                  }))
                }
                disabled={!locationId || !values.departmentId}
              >
                <option value="">
                  {!locationId
                    ? "Select location first"
                    : !values.departmentId
                      ? "Select department first"
                      : "Select sub-department"}
                </option>
                {visibleSubDepartments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={employeeFilterLabelClass} htmlFor="struct-desig">
                Designation
              </label>
              <select
                id="struct-desig"
                className={employeeSelectClass}
                value={values.designationId}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    designationId: e.target.value,
                  }))
                }
                disabled={
                  !locationId || !values.departmentId || !values.subDepartmentId
                }
              >
                <option value="">
                  {!locationId
                    ? "Select location first"
                    : !values.departmentId
                      ? "Select department first"
                      : !values.subDepartmentId
                        ? "Select sub-department first"
                        : "Select designation"}
                </option>
                {visibleDesignations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={employeeFilterLabelClass} htmlFor="struct-level">
                Level / Grade (auto-filled)
              </label>
              <input
                id="struct-level"
                className={employeeInputClass}
                value={levelLabel}
                readOnly
                placeholder="Select a designation"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              className={employeeBtnOutlineSmClass}
              onClick={() => setModalOpen(false)}
            >
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
