import { z } from "zod";



export const orgStatusSchema = z.enum(["Active", "Inactive"]);



export const departmentFormSchema = z.object({

  name: z.string().trim().min(1, "Department name is required.").max(100),

  code: z.string().trim().min(1, "Department code is required.").max(20),

  status: orgStatusSchema,

});



export const subDepartmentFormSchema = z.object({

  departmentId: z.string().min(1, "Department is required."),

  name: z.string().trim().min(1, "Sub department name is required.").max(100),

  status: orgStatusSchema,

});



export const levelFormSchema = z.object({

  code: z.string().trim().min(1, "Code is required.").max(10),

  name: z.string().trim().min(1, "Name is required.").max(100),

  sortOrder: z.string().refine(

    (v) => {

      if (v.trim() === "") return true;

      const n = Number(v);

      return Number.isFinite(n) && Number.isInteger(n) && n >= 0;

    },

    "Sort order must be a non-negative whole number.",

  ),

});



export const designationFormSchema = z.object({

  name: z.string().trim().min(1, "Designation name is required.").max(150),

  code: z.string().trim().max(20, "Designation code must be at most 20 characters."),

  levelId: z.string().min(1, "Level / grade is required."),

  status: orgStatusSchema,

});



export const structureFormSchema = z.object({

  departmentId: z.string().min(1, "Department is required."),

  subDepartmentId: z.string().min(1, "Sub-department is required."),

  designationId: z.string().min(1, "Designation is required."),

});



export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export type SubDepartmentFormValues = z.infer<typeof subDepartmentFormSchema>;

export type LevelFormValues = z.infer<typeof levelFormSchema>;

export type DesignationFormValues = z.infer<typeof designationFormSchema>;

export type StructureFormValues = z.infer<typeof structureFormSchema>;



export const emptyDepartmentForm: DepartmentFormValues = {

  name: "",

  code: "",

  status: "Active",

};



export const emptySubDepartmentForm: SubDepartmentFormValues = {

  departmentId: "",

  name: "",

  status: "Active",

};



export const emptyLevelForm: LevelFormValues = {

  code: "",

  name: "",

  sortOrder: "",

};



export const emptyDesignationForm: DesignationFormValues = {

  name: "",

  code: "",

  levelId: "",

  status: "Active",

};



export const emptyStructureForm: StructureFormValues = {

  departmentId: "",

  subDepartmentId: "",

  designationId: "",

};

