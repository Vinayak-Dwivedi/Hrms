import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { z } from "zod";
import { db } from "@/db/runtime";
import { accounts, users } from "@/db/schema/auth";
import { departments, designations, employees, orgHierarchyStructure, roles } from "@/db/schema/hrms";
import { generatePassword } from "@/lib/generate-password";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { hashPassword } from "@/lib/password";
import { optionalPasswordFieldSchema } from "@/lib/password-policy";
import { mapDbErrorToApiError } from "@/lib/db-error";
import { rbacCodeToAuthRole } from "@/lib/auth-role";
import { CREDENTIAL_PROVIDER } from "@/lib/auth-credentials";
import { formatEmployeeFullName } from "@/lib/employee";
import { userTypeIdFromAuthRole } from "@/lib/user-type";
import * as employeeAdminCtrl from "@/modules/hr-onboarding/controllers/employee-admin.controller";
import * as bankOnboardingCtrl from "@/modules/hr-onboarding/controllers/bank-onboarding.controller";
import * as onBehalfCtrl from "@/modules/hr-onboarding/controllers/employee-on-behalf.controller";
import { documentUpload } from "@/middleware/upload.middleware";
import { employeeListQuerySchema } from "@/modules/hr-onboarding/schemas/employee-list.schema";
import * as employeeAdmin from "@/modules/hr-onboarding/services/employee-admin.service";
import * as invitationService from "@/modules/hr-onboarding/services/invitation.service";
import { ONBOARDING_PERMISSIONS } from "@/modules/hr-onboarding/constants/permissions";
import { requirePermission } from "@/middleware/require-permission";
import { ApiError } from "@/middleware/error";

export const employeesRouter = Router();

const viewEmployees = requirePermission("employees.view", "onboarding.view");
const createEmployees = requirePermission("employees.create");
const editEmployees = requirePermission("employees.edit");
const manageOnboarding = requirePermission(ONBOARDING_PERMISSIONS.MANAGE);
const manageOnboardingBank = requirePermission(
  ONBOARDING_PERMISSIONS.MANAGE_BANK,
  ONBOARDING_PERMISSIONS.MANAGE,
);
const resendInvite = requirePermission(ONBOARDING_PERMISSIONS.RESEND_INVITATION);

employeesRouter.get("/", viewEmployees, async (req, res, next) => {
  try {
    const q = employeeListQuerySchema.parse(req.query);
    const result = await employeeAdmin.listEmployees(q);
    res.json({ data: result.rows, total: result.total, limit: q.limit, offset: q.offset });
  } catch (e) {
    next(e);
  }
});

employeesRouter.get("/:id/onboarding", viewEmployees, employeeAdminCtrl.getEmployeeOnboarding);
employeesRouter.get(
  "/:id/onboarding/profile",
  manageOnboarding,
  onBehalfCtrl.getOnboardingProfile,
);
employeesRouter.put(
  "/:id/onboarding/profile",
  manageOnboarding,
  onBehalfCtrl.putOnboardingProfile,
);
employeesRouter.post(
  "/:id/onboarding/documents",
  manageOnboarding,
  documentUpload.single("file"),
  onBehalfCtrl.uploadOnboardingDocument,
);
employeesRouter.delete(
  "/:id/onboarding/documents/:documentId",
  manageOnboarding,
  onBehalfCtrl.deleteOnboardingDocument,
);
employeesRouter.post(
  "/:id/onboarding/submit",
  manageOnboarding,
  onBehalfCtrl.submitOnboarding,
);
employeesRouter.get(
  "/:id/onboarding/bank",
  viewEmployees,
  bankOnboardingCtrl.getOnboardingBank,
);
employeesRouter.put(
  "/:id/onboarding/bank",
  manageOnboardingBank,
  bankOnboardingCtrl.putOnboardingBank,
);
employeesRouter.post(
  "/:id/onboarding/bank/approve",
  manageOnboardingBank,
  bankOnboardingCtrl.approveOnboardingBank,
);
employeesRouter.get("/:id/documents", viewEmployees, employeeAdminCtrl.getEmployeeDocuments);

employeesRouter.get("/:id", viewEmployees, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const detail = await employeeAdmin.getEmployeeDetail(id);
    res.json({ data: detail });
  } catch (e) {
    next(e);
  }
});

const PHONE_REGEX = /^[0-9]{10}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const optionalMiddleName = z
  .string()
  .trim()
  .max(100)
  .optional()
  .nullable()
  .transform((v) => (v?.trim() ? v.trim() : null));

const nullableId = z.union([z.number().int().positive(), z.null()]);

const updateEmployeeSchema = z
  .object({
    empId: z.string().trim().min(1).max(20),
    firstName: z.string().trim().min(1).max(100),
    middleName: optionalMiddleName,
    lastName: z.string().trim().min(1).max(100),
    personalEmail: z.string().trim().email(),
    workEmail: z.string().trim().email(),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Phone must be exactly 10 digits."),
    dob: z.string().regex(DATE_REGEX),
    gender: z.enum(["Male", "Female", "Other"]),
    joiningDate: z.string().regex(DATE_REGEX),
    employeeStatus: z.enum([
      "Active",
      "Inactive",
      "Probation",
      "Notice",
      "Exited",
    ]),
    departmentId: nullableId.optional(),
    designationId: nullableId.optional(),
    gradeId: nullableId.optional(),
    branchId: nullableId.optional(),
    reportingManagerId: nullableId.optional(),
    reportingChain: z.array(z.number().int().positive()).optional(),
    maritalStatus: z.enum(["Single", "Married"]).optional().nullable(),
    spouseName: z.string().trim().max(200).optional().nullable(),
    password: optionalPasswordFieldSchema,
  })
  .superRefine((data, ctx) => {
    const dob = new Date(`${data.dob}T00:00:00`);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (dob > cutoff) {
      ctx.addIssue({
        code: "custom",
        message: "Employee must be at least 18 years old.",
        path: ["dob"],
      });
    }
    if (data.maritalStatus === "Married" && !data.spouseName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Spouse name is required when marital status is Married.",
        path: ["spouseName"],
      });
    }
  });

employeesRouter.patch("/:id", editEmployees, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }

    const body = updateEmployeeSchema.parse(req.body);
    const { password, reportingChain, ...rest } = body;

    if (
      rest.reportingManagerId != null &&
      rest.reportingManagerId === id
    ) {
      throw new ApiError(
        400,
        "INVALID_MANAGER",
        "Employee cannot be their own reporting manager.",
      );
    }

    if (rest.reportingManagerId) {
      const [manager] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, rest.reportingManagerId))
        .limit(1);
      if (!manager) {
        throw new ApiError(400, "INVALID_MANAGER", "Reporting manager not found.");
      }
    }

    const nextReportingChain =
      reportingChain ??
      (rest.reportingManagerId ? [rest.reportingManagerId] : []);

    const now = new Date();
    const employeePatch = {
      empId: rest.empId,
      firstName: rest.firstName,
      middleName: rest.middleName,
      lastName: rest.lastName,
      personalEmail: rest.personalEmail.toLowerCase(),
      workEmail: rest.workEmail.toLowerCase(),
      phone: rest.phone,
      dob: rest.dob,
      gender: rest.gender,
      joiningDate: rest.joiningDate,
      employeeStatus: rest.employeeStatus,
      departmentId: rest.departmentId ?? null,
      designationId: rest.designationId ?? null,
      gradeId: rest.gradeId ?? null,
      branchId: rest.branchId ?? null,
      reportingManagerId: rest.reportingManagerId ?? null,
      reportingChain: nextReportingChain,
      maritalStatus: rest.maritalStatus ?? null,
      spouseName:
        rest.maritalStatus === "Married"
          ? rest.spouseName?.trim() || null
          : null,
      updatedAt: now,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: employees.id, userId: employees.userId })
        .from(employees)
        .where(eq(employees.id, id))
        .limit(1);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Employee not found.");
      }

      await tx
        .update(employees)
        .set(employeePatch)
        .where(eq(employees.id, id));

      if (existing.userId) {
        await tx
          .update(users)
          .set({
            email: employeePatch.workEmail,
            name: formatEmployeeFullName({
              firstName: employeePatch.firstName,
              middleName: employeePatch.middleName,
              lastName: employeePatch.lastName,
            }),
            updatedAt: now,
          })
          .where(eq(users.id, existing.userId));
      }

      if (password) {
        const passwordHash = await hashPassword(password);
        await tx
          .update(employees)
          .set({ passwordHash, updatedAt: now })
          .where(eq(employees.id, id));

        if (existing.userId) {
          await tx
            .update(accounts)
            .set({ password: passwordHash, updatedAt: now })
            .where(
              and(
                eq(accounts.userId, existing.userId),
                eq(accounts.providerId, CREDENTIAL_PROVIDER),
              ),
            );
        }
      }
    });

    const detail = await employeeAdmin.getEmployeeDetail(id);
    res.json({
      data: stripSensitiveEmployeeFields(detail as Record<string, unknown>),
    });
  } catch (e) {
    if (e instanceof ApiError || e instanceof z.ZodError) {
      next(e);
      return;
    }
    next(mapDbErrorToApiError(e));
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const optionalId = z
  .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? undefined : v));

function formatEmployeeFullName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName]
    .filter((part) => part?.trim())
    .join(" ");
}

const createEmployeeSchema = z
  .object({
    empId: z.string().trim().min(1).max(20),
    firstName: z.string().trim().min(1).max(100),
    middleName: optionalMiddleName,
    lastName: z.string().trim().min(1).max(100),
    personalEmail: z.string().trim().email(),
    workEmail: z.string().trim().email(),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Phone must be exactly 10 digits."),
    dob: z.string().regex(DATE_REGEX),
    gender: z.enum(["Male", "Female", "Other"]),
    joiningDate: z.string().regex(DATE_REGEX),
    password: optionalPasswordFieldSchema,
    roleId: z.coerce.number().int().positive(),
    orgHierarchyStructureId: optionalId,
    departmentId: optionalId,
    designationId: optionalId,
    gradeId: optionalId,
    branchId: optionalId,
    reportingManagerId: optionalId,
    maritalStatus: z.enum(["Single", "Married"]).optional().nullable(),
    spouseName: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const dob = new Date(`${data.dob}T00:00:00`);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (dob > cutoff) {
      ctx.addIssue({
        code: "custom",
        message: "Employee must be at least 18 years old.",
        path: ["dob"],
      });
    }
    if (data.maritalStatus === "Married" && !data.spouseName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Spouse name is required when marital status is Married.",
        path: ["spouseName"],
      });
    }
  });

function stripSensitiveEmployeeFields(row: Record<string, unknown>) {
  const {
    passwordHash: _ph,
    onboardingToken: _ot,
    ...rest
  } = row;
  return rest;
}

async function resolveAuthRole(roleId: number): Promise<string> {
  const [role] = await db
    .select({ code: roles.code, isActive: roles.isActive })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!role) {
    throw new ApiError(400, "INVALID_ROLE", "Selected role not found.");
  }
  if (!role.isActive) {
    throw new ApiError(400, "INVALID_ROLE", "Selected role is inactive.");
  }
  return rbacCodeToAuthRole(role.code);
}

type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>;

function parseExcelDateCell(val: string | number | undefined): string | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (Number.isNaN(d.valueOf())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (DATE_REGEX.test(s)) return s;
  const parsed = new Date(s);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toISOString().slice(0, 10);
}

function cellToString(val: string | number | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function mapDbErrorToMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return mapDbErrorToApiError(e).message;
}

async function defaultEmployeeRoleId(): Promise<number> {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, "employee"))
    .limit(1);
  if (!role) {
    throw new ApiError(
      500,
      "ROLES_NOT_SEEDED",
      "Default employee role is missing. Run npm run seed:rbac.",
    );
  }
  return role.id;
}

async function resolveOrgHierarchyStructure(structureId: number) {
  const [row] = await db
    .select({ id: orgHierarchyStructure.id })
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.id, structureId))
    .limit(1);
  if (!row) {
    throw new ApiError(
      400,
      "INVALID_ORG_ROLE",
      "Selected org role is not defined in department hierarchy.",
    );
  }
  return row;
}

async function insertEmployeeRecord(body: CreateEmployeeBody, options?: { sendInvitation?: boolean }) {
  const workEmail = body.workEmail.toLowerCase();
  const personalEmail = body.personalEmail.toLowerCase();
  const fullName = formatEmployeeFullName(body);
  const plainPassword = body.password ?? generatePassword();
  const passwordHash = await hashPassword(plainPassword);
  const authRole = await resolveAuthRole(body.roleId);
  if (body.orgHierarchyStructureId) {
    await resolveOrgHierarchyStructure(body.orgHierarchyStructureId);
  }

  if (body.reportingManagerId) {
    const [manager] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, body.reportingManagerId))
      .limit(1);
    if (!manager) {
      throw new ApiError(400, "INVALID_MANAGER", "Reporting manager not found.");
    }
  }

  const reportingChain = body.reportingManagerId ? [body.reportingManagerId] : [];

  return db.transaction(async (tx) => {
    const userId = randomUUID();
    const accountId = randomUUID();
    const now = new Date();

    await tx.insert(users).values({
      id: userId,
      name: fullName,
      email: workEmail,
      emailVerified: true,
      role: authRole,
      userTypeId: userTypeIdFromAuthRole(authRole),
      createdAt: now,
      updatedAt: now,
    });

    const [empIdTaken] = await tx
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.empId, body.empId))
      .limit(1);
    if (empIdTaken) {
      throw new ApiError(409, "DUPLICATE_EMP_ID", "Employee ID already exists.");
    }

    await tx.insert(accounts).values({
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const [employee] = await tx
      .insert(employees)
      .values({
        userId,
        empId: body.empId,
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        personalEmail,
        workEmail,
        phone: body.phone,
        dob: body.dob,
        gender: body.gender,
        nationality: "Indian",
        joiningDate: body.joiningDate,
        passwordHash,
        employeeStatus: "Active",
        payrollStatus: "Active",
        departmentId: body.departmentId,
        designationId: body.designationId,
        gradeId: body.gradeId,
        orgHierarchyStructureId: body.orgHierarchyStructureId ?? null,
        branchId: body.branchId,
        reportingManagerId: body.reportingManagerId,
        reportingChain,
        maritalStatus: body.maritalStatus ?? undefined,
        spouseName: body.spouseName?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: employees.id });

    if (!employee) {
      throw new ApiError(500, "INSERT_FAILED", "Failed to create employee.");
    }

    return { employee, plainPassword, workEmail, personalEmail, sendInvitation: options?.sendInvitation !== false };
  });
}

employeesRouter.post("/create", createEmployees, async (req, res, next) => {
  try {
    const body = createEmployeeSchema.parse(req.body);
    const result = await insertEmployeeRecord(body);
    await invitationService.issueOnboardingToken({
      employeeId: result.employee.id,
      plainPassword: result.plainPassword,
      sendEmail: result.sendInvitation,
      issuedBy: req.user?.id,
      issueReason: "CREATE",
      audit: req.auditContext,
    });
    writeAuditLogAsync(
      {
        actorUserId: req.user?.id,
        action: "EMPLOYEE_CREATED",
        entityType: "employee",
        entityId: String(result.employee.id),
      },
      req.auditContext,
    );
    const fresh = await employeeAdmin.getEmployeeAdminById(result.employee.id);
    res.status(201).json({
      data: stripSensitiveEmployeeFields(
        (fresh ?? result.employee) as Record<string, unknown>,
      ),
    });
  } catch (e) {
    if (e instanceof ApiError) {
      next(e);
      return;
    }
    if (e instanceof z.ZodError) {
      next(e);
      return;
    }
    next(mapDbErrorToApiError(e));
  }
});

const uploadRowSchema = z.object({
  "Emp ID": z.union([z.string(), z.number()]),
  "First Name": z.union([z.string(), z.number()]),
  "Middle Name": z.union([z.string(), z.number()]).optional(),
  "Last Name": z.union([z.string(), z.number()]),
  "Personal Email": z.union([z.string(), z.number()]),
  "Work Email": z.union([z.string(), z.number()]),
  Phone: z.union([z.string(), z.number()]),
  DOB: z.union([z.string(), z.number()]),
  Gender: z.union([z.string(), z.number()]),
  "Joining Date": z.union([z.string(), z.number()]),
  Password: z.union([z.string(), z.number()]),
  Department: z.union([z.string(), z.number()]).optional(),
  Designation: z.union([z.string(), z.number()]).optional(),
  Role: z.union([z.string(), z.number()]).optional(),
});

employeesRouter.post("/upload-bulk", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: "No file uploaded" } });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) {
      return res.status(400).json({ error: { message: "Excel file has no readable sheet." } });
    }

    const rawData = xlsx.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    if (rawData.length === 0) {
      return res.status(400).json({
        error: { message: "File is empty or missing header row." },
      });
    }

    const [deptRows, desigRows, roleRows] = await Promise.all([
      db.select({ id: departments.id, name: departments.name }).from(departments),
      db.select({ id: designations.id, name: designations.name }).from(designations),
      db.select({ id: roles.id, code: roles.code, name: roles.name }).from(roles),
    ]);

    const deptByName = new Map(
      deptRows.map((d) => [d.name.trim().toLowerCase(), d.id]),
    );
    const desigByName = new Map(
      desigRows.map((d) => [d.name.trim().toLowerCase(), d.id]),
    );
    const roleByKey = new Map<string, number>();
    for (const r of roleRows) {
      roleByKey.set(r.code.trim().toLowerCase(), r.id);
      roleByKey.set(r.name.trim().toLowerCase(), r.id);
    }

    const defaultRoleId = await defaultEmployeeRoleId();

    const errors: Array<{ row: number; error: string }> = [];
    let inserted = 0;

    for (let i = 0; i < rawData.length; i++) {
      const rowNum = i + 2;
      const row = rawData[i];
      const parsed = uploadRowSchema.safeParse(row);

      if (!parsed.success) {
        const path = parsed.error.issues[0]?.path.join(".") ?? "unknown";
        errors.push({ row: rowNum, error: `Missing or invalid column: ${path}` });
        continue;
      }

      const data = parsed.data;
      const dob = parseExcelDateCell(data.DOB);
      const joiningDate = parseExcelDateCell(data["Joining Date"]);

      if (!dob) {
        errors.push({ row: rowNum, error: "DOB must be YYYY-MM-DD or a valid date." });
        continue;
      }
      if (!joiningDate) {
        errors.push({
          row: rowNum,
          error: "Joining Date must be YYYY-MM-DD or a valid date.",
        });
        continue;
      }

      const deptName = cellToString(data.Department);
      const desigName = cellToString(data.Designation);
      let departmentId: number | undefined;
      let designationId: number | undefined;

      if (deptName) {
        const id = deptByName.get(deptName.toLowerCase());
        if (!id) {
          errors.push({ row: rowNum, error: `Department not found: ${deptName}` });
          continue;
        }
        departmentId = id;
      }

      if (desigName) {
        const id = desigByName.get(desigName.toLowerCase());
        if (!id) {
          errors.push({ row: rowNum, error: `Designation not found: ${desigName}` });
          continue;
        }
        designationId = id;
      }

      const roleCell = cellToString(data.Role);
      let roleId = defaultRoleId;
      if (roleCell) {
        const id = roleByKey.get(roleCell.toLowerCase());
        if (!id) {
          errors.push({ row: rowNum, error: `Role not found: ${roleCell}` });
          continue;
        }
        roleId = id;
      }

      const genderRaw = cellToString(data.Gender);
      const genderNorm =
        genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase();
      if (!["Male", "Female", "Other"].includes(genderNorm)) {
        errors.push({ row: rowNum, error: "Gender must be Male, Female, or Other." });
        continue;
      }

      const payload = {
        empId: cellToString(data["Emp ID"]).slice(0, 20),
        firstName: cellToString(data["First Name"]).slice(0, 100),
        middleName: cellToString(data["Middle Name"]).slice(0, 100) || null,
        lastName: cellToString(data["Last Name"]).slice(0, 100),
        personalEmail: cellToString(data["Personal Email"]),
        workEmail: cellToString(data["Work Email"]),
        phone: cellToString(data.Phone),
        dob,
        gender: genderNorm as "Male" | "Female" | "Other",
        joiningDate,
        password: cellToString(data.Password),
        roleId,
        departmentId,
        designationId,
      };

      const validated = createEmployeeSchema.safeParse(payload);
      if (!validated.success) {
        const msg =
          validated.error.issues.map((issue) => issue.message).join(" ") ||
          "Validation failed.";
        errors.push({ row: rowNum, error: msg });
        continue;
      }

      try {
        // Bulk import skips invitation emails; HR can resend individually.
        const result = await insertEmployeeRecord(validated.data, { sendInvitation: false });
        await invitationService.issueOnboardingToken({
          employeeId: result.employee.id,
          plainPassword: result.plainPassword,
          sendEmail: false,
          issuedBy: req.user?.id,
          issueReason: "CREATE",
          audit: req.auditContext,
        });
        inserted += 1;
      } catch (e) {
        errors.push({ row: rowNum, error: mapDbErrorToMessage(e) });
      }
    }

    if (inserted === 0) {
      return res.status(422).json({
        error: { message: "No employees were imported.", details: errors },
        inserted: 0,
        errors,
      });
    }

    res.status(201).json({ inserted, errors });
  } catch (e) {
    next(e);
  }
});

employeesRouter.post("/:id/resend-invitation", resendInvite, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const { expiresAt } = await invitationService.resendInvitation({
      employeeId: id,
      issuedBy: req.user?.id,
      audit: req.auditContext,
    });
    res.json({
      message: "Invitation sent",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});
