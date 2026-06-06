import { z } from "zod";
import type { LookupItem } from "@/features/employees/api/employees.client";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../api/departments.client";

const optionalSelectId = z.string().refine(
  (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0),
  "Select a valid option or leave blank.",
);

const optionalHeadcount = z.string().refine(
  (v) => {
    if (v.trim() === "") return true;
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
  },
  "Headcount must be a non-negative whole number.",
);

export const departmentFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  managerId: optionalSelectId,
  branchId: optionalSelectId,
  headcount: optionalHeadcount,
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

function resolveBranchName(
  branchId: string,
  branches: LookupItem[],
): string | null {
  if (branchId.trim() === "") return null;
  const branch = branches.find((b) => String(b.id) === branchId.trim());
  return branch?.name ?? null;
}

export function toCreateDepartmentPayload(
  values: DepartmentFormValues,
  branches: LookupItem[],
): CreateDepartmentPayload {
  const managerId =
    values.managerId.trim() !== "" ? Number(values.managerId) : null;
  const payload: CreateDepartmentPayload = {
    name: values.name.trim(),
    managerId,
    locationArea: resolveBranchName(values.branchId, branches),
  };
  if (values.headcount.trim() !== "") {
    payload.headcount = Number(values.headcount);
  }
  return payload;
}

export function toUpdateDepartmentPayload(
  values: DepartmentFormValues,
  branches: LookupItem[],
): UpdateDepartmentPayload {
  return toCreateDepartmentPayload(values, branches);
}

export function detailToDepartmentFormValues(
  dept: {
    name: string;
    managerId: number | null;
    locationArea: string | null;
    headcount: number;
  },
  branches: LookupItem[],
): DepartmentFormValues {
  const branch = branches.find((b) => b.name === dept.locationArea);
  return {
    name: dept.name,
    managerId: dept.managerId != null ? String(dept.managerId) : "",
    branchId: branch ? String(branch.id) : "",
    headcount: dept.headcount === 0 ? "" : String(dept.headcount),
  };
}

export const emptyDepartmentFormValues: DepartmentFormValues = {
  name: "",
  managerId: "",
  branchId: "",
  headcount: "",
};
