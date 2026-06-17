import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// Requires the `citext` extension. Case-insensitive text used for email columns.
const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

// ───────────────────────────────────────────────────────────────────────────
// ENUMS
// ───────────────────────────────────────────────────────────────────────────
export const genderEnum = pgEnum("gender_enum", ["Male", "Female", "Other"]);
export const maritalStatusEnum = pgEnum("marital_status_enum", [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
  "Prefer Not to Say",
]);
export const employeeStatusEnum = pgEnum("employee_status_enum", [
  "Active",
  "Inactive",
  "Probation",
  "Notice",
  "Exited",
]);
export const payrollStatusEnum = pgEnum("payroll_status_enum", [
  "Active",
  "Hold",
  "Closed",
]);
export const attStatusEnum = pgEnum("att_status_enum", [
  "Present",
  "Absent",
  "Half Day",
  "Leave",
  "Holiday",
  "Weekend",
]);
export const regulariseStatusEnum = pgEnum("regularise_status_enum", [
  "Pending",
  "Approved",
  "Rejected",
]);
export const durationTypeEnum = pgEnum("duration_type_enum", [
  "Full Day",
  "First Half",
  "Second Half",
]);
export const leaveReqStatusEnum = pgEnum("leave_req_status_enum", [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
  "Forwarded",
]);
export const leaveDecisionEnum = pgEnum("leave_decision_enum", [
  "Pending",
  "Approved",
  "Rejected",
  "Forwarded",
]);
export const hrDecisionEnum = pgEnum("hr_decision_enum", [
  "Pending",
  "Approved",
  "Rejected",
  "Override",
]);
export const encashmentStatusEnum = pgEnum("encashment_status_enum", [
  "Pending",
  "Approved",
  "Rejected",
]);
export const holidayTypeEnum = pgEnum("holiday_type_enum", [
  "National",
  "Regional",
  "Optional",
  "Restricted",
  "Festival",
]);
export const dayTypeEnum = pgEnum("day_type_enum", ["Full", "Half", "Off"]);
export const documentTypeEnum = pgEnum("document_type_enum", [
  "Offer Letter",
  "Appointment Letter",
  "Aadhaar Card",
  "PAN Card",
  "Educational Certificates",
  "Academic Certificates",
  "Profile Photo",
  "Pay Slip",
  "Salary Slip",
  "Resume",
  "Experience Letter",
  "Relieving Letter",
  "Passport",
]);
export const onboardingStatusEnum = pgEnum("onboarding_status_enum", [
  "PENDING",
  "INVITATION_SENT",
  "IN_PROGRESS",
  "COMPLETED",
  "EXPIRED",
]);
export const tokenIssueReasonEnum = pgEnum("token_issue_reason_enum", [
  "CREATE",
  "RESEND",
  "REGENERATE",
  "INVALIDATE",
]);
export const auditEntityTypeEnum = pgEnum("audit_entity_type_enum", [
  "employee",
  "document",
  "invitation",
  "auth",
  "leave_request",
  "resignation",
  "offboarding_case",
]);
export const auditActionEnum = pgEnum("audit_action_enum", [
  "EMPLOYEE_CREATED",
  "INVITATION_SENT",
  "INVITATION_RESENT",
  "INVITATION_REGENERATED",
  "INVITATION_INVALIDATED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "PROFILE_UPDATED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_DELETED",
  "DOCUMENT_VERIFIED",
  "DOCUMENT_REJECTED",
  "ONBOARDING_SUBMITTED",
  "ONBOARDING_COMPLETED",
  // Leave lifecycle (M5)
  "LEAVE_SUBMITTED",
  "LEAVE_AUTO_APPROVED",
  "LEAVE_AUTO_REJECTED",
  "LEAVE_APPROVED_BY_MANAGER",
  "LEAVE_REJECTED_BY_MANAGER",
  "LEAVE_FORWARDED_BY_MANAGER",
  "LEAVE_APPROVED_BY_HR",
  "LEAVE_REJECTED_BY_HR",
  "LEAVE_CANCELLED",
  "ONBOARDING_PROFILE_UPDATED_ON_BEHALF",
  "ONBOARDING_SUBMITTED_ON_BEHALF",
  // Offboarding / resignation lifecycle (Phase 1)
  "RESIGNATION_SUBMITTED",
  "RESIGNATION_WITHDRAWN",
  "RESIGNATION_APPROVED_BY_MANAGER",
  "RESIGNATION_REJECTED_BY_MANAGER",
  "RESIGNATION_APPROVED_BY_HR",
  "RESIGNATION_REJECTED_BY_HR",
  "RESIGNATION_ON_HOLD",
  "OFFBOARDING_CASE_CREATED",
  // Clearance workflow (Phase 2)
  "OFFBOARDING_CLEARANCE_UPDATED",
  "OFFBOARDING_CLEARANCES_COMPLETE",
  // Exit interview (Phase 3)
  "EXIT_INTERVIEW_SUBMITTED",
  // Full & Final settlement (Phase 4)
  "OFFBOARDING_FNF_UPDATED",
  "OFFBOARDING_FNF_APPROVED",
  "OFFBOARDING_FNF_PAID",
  // Exit documents (Phase 5)
  "OFFBOARDING_DOCUMENT_GENERATED",
  "OFFBOARDING_DOCUMENT_SENT",
  // Access revocation + final closure (Phase 6)
  "OFFBOARDING_ACCESS_REVOKED",
  "OFFBOARDING_CASE_CLOSED",
]);
export const documentStatusEnum = pgEnum("document_status_enum", [
  "Pending",
  "Uploaded",
  "Verified",
  "Rejected",
]);
export const actionTypeEnum = pgEnum("action_type_enum", [
  "Promotion",
  "Demotion",
  "Transfer",
]);
export const transferStatusEnum = pgEnum("transfer_status_enum", [
  "Pending",
  "Approved",
]);
export const resignationStatusEnum = pgEnum("resignation_status_enum", [
  // Legacy values (kept for backward compatibility with existing rows).
  "Pending",
  "Approved",
  "Withdrawn",
  // Offboarding lifecycle (Phase 1).
  "Submitted",
  "ManagerApproved",
  "ManagerRejected",
  "HRApproved",
  "OnHold",
  "Rejected",
]);
// Manager / HR decision recorded on a resignation.
export const resignationDecisionEnum = pgEnum("resignation_decision_enum", [
  "Approved",
  "Rejected",
]);
// Runtime offboarding-case lifecycle.
export const offboardingCaseStatusEnum = pgEnum("offboarding_case_status_enum", [
  "OffboardingInitiated",
  "ClearancesComplete",
  "FnFComplete",
  "Closed",
  "OnHold",
]);
// Clearance teams (Phase 2).
export const clearanceTeamEnum = pgEnum("clearance_team_enum", [
  "ReportingManager",
  "IT",
  "Admin",
  "Finance",
  "HR",
  "Operations",
]);
// Per-task clearance status.
export const clearanceTaskStatusEnum = pgEnum("clearance_task_status_enum", [
  "Pending",
  "Completed",
  "NA",
]);
// Exit-interview response status (Phase 3).
export const exitInterviewStatusEnum = pgEnum("exit_interview_status_enum", [
  "Pending",
  "Completed",
]);
// Full & Final settlement status (Phase 4).
export const fnfStatusEnum = pgEnum("fnf_status_enum", [
  "Processing",
  "Approved",
  "Paid",
]);
// FnF line-item kind.
export const fnfLineKindEnum = pgEnum("fnf_line_kind_enum", [
  "Earning",
  "Deduction",
]);
// Exit-document category + status (Phase 5).
export const exitDocumentCategoryEnum = pgEnum("exit_document_category_enum", [
  "HR",
  "Finance",
  "Employee",
]);
export const exitDocumentStatusEnum = pgEnum("exit_document_status_enum", [
  "Generated",
  "Sent",
]);
// Access revocation systems + status (Phase 6).
export const accessSystemEnum = pgEnum("access_system_enum", [
  "HRMSLogin",
  "Email",
  "VPN",
  "CRM",
  "ERP",
  "AttendanceSystem",
  "BankingApplication",
]);
export const accessStatusEnum = pgEnum("access_status_enum", [
  "Active",
  "Disabled",
]);
export const perfLabelEnum = pgEnum("perf_label_enum", [
  "Good",
  "Excellent",
  "Needs Attention",
]);
export const orgHierarchyStatusEnum = pgEnum("org_hierarchy_status_enum", [
  "Active",
  "Inactive",
]);
export const notifKindEnum = pgEnum("notif_kind_enum", [
  "leave",
  "team",
  "hr",
  "holiday",
  "event",
]);
export const broadcastTargetEnum = pgEnum("broadcast_target_enum", [
  "all",
  "department",
  "individual",
]);

// ───────────────────────────────────────────────────────────────────────────
// GROUP 1 — ORG STRUCTURE
// ───────────────────────────────────────────────────────────────────────────

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    address: text("address"),
    headcount: integer("headcount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("branches_headcount_chk", sql`${table.headcount} >= 0`),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    // short code shown in Org Setup → Department (e.g. HR, IT). Nullable so
    // pre-existing rows remain valid; unique when present.
    code: varchar("code", { length: 20 }).unique(),
    // forward ref to employees.id — resolved lazily at runtime; also serves as
    // the "department lead" in the Org Setup UI.
    managerId: integer("manager_id").references(
      (): AnyPgColumn => employees.id,
      { onDelete: "set null" },
    ),
    locationArea: varchar("location_area", { length: 200 }),
    headcount: integer("headcount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("dept_headcount_chk", sql`${table.headcount} >= 0`),
  ],
);

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 5 }).notNull().unique(),
  bandName: varchar("band_name", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const employmentTypes = pgTable(
  "employment_types",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    noticePeriodDays: integer("notice_period_days"),
    activeEmployeeCount: integer("active_employee_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "emp_type_notice_period_chk",
      sql`${table.noticePeriodDays} IS NULL OR ${table.noticePeriodDays} >= 0`,
    ),
    check(
      "emp_type_active_count_chk",
      sql`${table.activeEmployeeCount} >= 0`,
    ),
  ],
);

export const designations = pgTable(
  "designations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull().unique(),
    // short code shown in Org Setup → Designation (e.g. MGR, CEO). Nullable so
    // pre-existing rows remain valid; unique when present.
    code: varchar("code", { length: 20 }).unique(),
    departmentId: integer("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    gradeMinId: integer("grade_min_id").references(() => grades.id, {
      onDelete: "set null",
    }),
    gradeMaxId: integer("grade_max_id").references(() => grades.id, {
      onDelete: "set null",
    }),
    employeeCount: integer("employee_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("designation_emp_count_chk", sql`${table.employeeCount} >= 0`),
  ],
);

// Sub-departments (a.k.a. processes / campaigns in a BPO) — e.g. Beetel,
// Credit B — sitting under a Department. Distinct from designations (job
// titles). Currently used for holiday-team scoping; employees aren't linked
// to a sub-department yet.
export const subDepartments = pgTable("sub_departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  code: varchar("code", { length: 20 }).unique(),
  departmentId: integer("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ───────────────────────────────────────────────────────────────────────────
// GROUP 1b — ORG HIERARCHY (parallel to flat org setup tables)
// ───────────────────────────────────────────────────────────────────────────

export const orgHierarchyDepartments = pgTable(
  "org_hierarchy_departments",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id"),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    status: orgHierarchyStatusEnum("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_hierarchy_dept_company_name_uq").on(
      sql`COALESCE(${table.companyId}, -1)`,
      table.name,
    ),
    uniqueIndex("org_hierarchy_dept_company_code_uq").on(
      sql`COALESCE(${table.companyId}, -1)`,
      table.code,
    ),
    index("idx_org_hierarchy_dept_company").on(table.companyId),
  ],
);

export const orgHierarchyLevels = pgTable(
  "org_hierarchy_levels",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("org_hierarchy_levels_code_uq").on(table.code)],
);

export const orgHierarchySubDepartments = pgTable(
  "org_hierarchy_sub_departments",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => orgHierarchyDepartments.id, { onDelete: "restrict" }),
    companyId: integer("company_id"),
    name: varchar("name", { length: 100 }).notNull(),
    status: orgHierarchyStatusEnum("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_hierarchy_sub_dept_name_uq").on(
      table.departmentId,
      table.name,
    ),
    index("idx_org_hierarchy_sub_dept_dept").on(table.departmentId),
  ],
);

export const orgHierarchyDesignations = pgTable(
  "org_hierarchy_designations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    code: varchar("code", { length: 20 }),
    levelId: integer("level_id")
      .notNull()
      .references(() => orgHierarchyLevels.id, { onDelete: "restrict" }),
    status: orgHierarchyStatusEnum("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_hierarchy_designations_name_uq").on(table.name),
    uniqueIndex("org_hierarchy_designations_code_uq").on(table.code),
    index("idx_org_hierarchy_designations_level").on(table.levelId),
  ],
);

export const orgHierarchyStructure = pgTable(
  "org_hierarchy_structure",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => orgHierarchyDepartments.id, { onDelete: "restrict" }),
    subDepartmentId: integer("sub_department_id")
      .notNull()
      .references(() => orgHierarchySubDepartments.id, { onDelete: "restrict" }),
    designationId: integer("designation_id")
      .notNull()
      .references(() => orgHierarchyDesignations.id, { onDelete: "restrict" }),
    levelId: integer("level_id")
      .notNull()
      .references(() => orgHierarchyLevels.id, { onDelete: "restrict" }),
    companyId: integer("company_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_hierarchy_structure_uq").on(
      table.departmentId,
      table.subDepartmentId,
      table.designationId,
    ),
    index("idx_org_hierarchy_structure_dept").on(table.departmentId),
    index("idx_org_hierarchy_structure_sub_dept").on(table.subDepartmentId),
  ],
);

// ───────────────────────────────────────────────────────────────────────────
// GROUP 2 — CORE EMPLOYEE
// ───────────────────────────────────────────────────────────────────────────

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    empId: varchar("emp_id", { length: 20 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    personalEmail: citext("personal_email").notNull().unique(),
    personalEmailVerified: boolean("personal_email_verified")
      .notNull()
      .default(false),
    personalEmailVerifiedAt: timestamp("personal_email_verified_at", {
      withTimezone: true,
    }),
    workEmail: citext("work_email").unique(),
    phone: varchar("phone", { length: 20 }).notNull(),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    dob: date("dob").notNull(),
    gender: genderEnum("gender").notNull(),
    bloodGroup: varchar("blood_group", { length: 5 }),
    nationality: varchar("nationality", { length: 50 })
      .notNull()
      .default("Indian"),
    maritalStatus: maritalStatusEnum("marital_status"),
    spouseName: varchar("spouse_name", { length: 200 }),
    fatherName: varchar("father_name", { length: 200 }),
    motherName: varchar("mother_name", { length: 200 }),
    currentAddress: text("current_address"),
    permanentAddress: text("permanent_address"),
    emergencyContactName: varchar("emergency_contact_name", { length: 200 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),

    panNo: text("pan_no"),
    panNoHash: text("pan_no_hash").unique(),
    uanNo: text("uan_no"),
    uanNoHash: text("uan_no_hash").unique(),
    aadhaarNo: text("aadhaar_no"),
    aadhaarNoHash: text("aadhaar_no_hash").unique(),
    esicNo: text("esic_no"),
    esicNoHash: text("esic_no_hash").unique(),

    linkedinUrl: varchar("linkedin_url", { length: 255 }),
    profilePhotoUrl: varchar("profile_photo_url", { length: 500 }),

    // ordered ancestor employee IDs from direct manager → root (replaces hierarchy table)
    reportingChain: integer("reporting_chain")
      .array()
      .notNull()
      .default(sql`'{}'::int[]`),

    departmentId: integer("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    // Optional sub-department (process/campaign) the employee belongs to.
    // Enables sub-department scoping for policies / approval workflows.
    subDepartmentId: integer("sub_department_id").references(
      () => subDepartments.id,
      { onDelete: "set null" },
    ),
    designationId: integer("designation_id").references(() => designations.id, {
      onDelete: "set null",
    }),
    gradeId: integer("grade_id").references(() => grades.id, {
      onDelete: "set null",
    }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    employmentTypeId: integer("employment_type_id").references(
      () => employmentTypes.id,
      { onDelete: "set null" },
    ),
    reportingManagerId: integer("reporting_manager_id").references(
      (): AnyPgColumn => employees.id,
      { onDelete: "set null" },
    ),
    orgHierarchyStructureId: integer("org_hierarchy_structure_id").references(
      () => orgHierarchyStructure.id,
      { onDelete: "set null" },
    ),

    joiningDate: date("joining_date").notNull(),
    dateOfExit: date("date_of_exit"),
    employeeStatus: employeeStatusEnum("employee_status")
      .notNull()
      .default("Active"),
    payrollStatus: payrollStatusEnum("payroll_status")
      .notNull()
      .default("Active"),

    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    onboardingToken: varchar("onboarding_token", { length: 128 }),
    onboardingTokenExpiry: timestamp("onboarding_token_expiry", {
      withTimezone: true,
    }),
    onboardingTokenUsed: boolean("onboarding_token_used").notNull().default(false),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    onboardingStatus: onboardingStatusEnum("onboarding_status")
      .notNull()
      .default("PENDING"),
    onboardingSubmittedAt: timestamp("onboarding_submitted_at", {
      withTimezone: true,
    }),
    onboardingReviewedBy: integer("onboarding_reviewed_by").references(
      (): AnyPgColumn => employees.id,
      { onDelete: "set null" },
    ),
    onboardingReviewedAt: timestamp("onboarding_reviewed_at", {
      withTimezone: true,
    }),
    onboardingReviewNotes: text("onboarding_review_notes"),
    onboardingBankApprovedAt: timestamp("onboarding_bank_approved_at", {
      withTimezone: true,
    }),
    onboardingBankApprovedBy: integer("onboarding_bank_approved_by").references(
      (): AnyPgColumn => employees.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_emp_dept").on(table.departmentId),
    index("idx_emp_desig").on(table.designationId),
    index("idx_emp_grade").on(table.gradeId),
    index("idx_emp_branch").on(table.branchId),
    index("idx_emp_emp_type").on(table.employmentTypeId),
    index("idx_emp_manager").on(table.reportingManagerId),
    index("idx_emp_org_hierarchy_structure").on(table.orgHierarchyStructureId),
    index("idx_emp_status").on(table.employeeStatus),
    index("idx_emp_onboarding_token").on(table.onboardingToken),
    index("idx_emp_join_date").on(table.joiningDate),
    index("idx_emp_reporting_chain").using("gin", table.reportingChain),
    check("emp_phone_chk", sql`${table.phone} ~ '^\\+?[0-9]{7,15}$'`),
    check(
      "emp_emergency_phone_chk",
      sql`${table.emergencyContactPhone} IS NULL OR ${table.emergencyContactPhone} ~ '^\\+?[0-9]{7,15}$'`,
    ),
    check(
      "emp_dob_18yrs_chk",
      sql`${table.dob} <= CURRENT_DATE - INTERVAL '18 years'`,
    ),
    check(
      "emp_exit_after_join_chk",
      sql`${table.dateOfExit} IS NULL OR ${table.dateOfExit} >= ${table.joiningDate}`,
    ),
    check(
      "emp_no_self_manager_chk",
      sql`${table.reportingManagerId} <> ${table.id}`,
    ),
    check(
      "emp_spouse_when_married_chk",
      sql`${table.maritalStatus} <> 'Married' OR ${table.spouseName} IS NOT NULL`,
    ),
  ],
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    accountNumber: varchar("account_number", { length: 25 }).notNull(),
    accountName: varchar("account_name", { length: 100 }).notNull(),
    bankName: varchar("bank_name", { length: 100 }).notNull(),
    branchName: varchar("branch_name", { length: 100 }).notNull(),
    ifscCode: varchar("ifsc_code", { length: 11 }).notNull(),
    passbookUrl: varchar("passbook_url", { length: 500 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "bank_accounts_pkey",
      columns: [table.employeeId, table.accountNumber],
    }),
    uniqueIndex("uq_one_primary_bank_account")
      .on(table.employeeId)
      .where(sql`${table.isPrimary} = TRUE`),
    check(
      "bank_ifsc_chk",
      sql`${table.ifscCode} ~ '^[A-Z]{4}0[A-Z0-9]{6}$'`,
    ),
  ],
);

export const employeeAcademicDetails = pgTable("employee_academic_details", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  qualification: varchar("qualification", { length: 100 }).notNull(),
  institution: varchar("institution", { length: 200 }).notNull(),
  boardUniversity: varchar("board_university", { length: 200 }),
  fieldOfStudy: varchar("field_of_study", { length: 100 }),
  yearFrom: smallint("year_from"),
  yearTo: smallint("year_to"),
  gradeOrPercentage: varchar("grade_or_percentage", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const employeeProfessionalDetails = pgTable(
  "employee_professional_details",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    companyName: varchar("company_name", { length: 200 }).notNull(),
    designation: varchar("designation", { length: 100 }).notNull(),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date"),
    isCurrent: boolean("is_current").notNull().default(false),
    responsibilities: text("responsibilities"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

export const employeeIdentityDetails = pgTable("employee_identity_details", {
  employeeId: integer("employee_id")
    .primaryKey()
    .references(() => employees.id, { onDelete: "cascade" }),
  panNumber: text("pan_number"),
  panNumberHash: text("pan_number_hash").unique(),
  aadhaarNumber: text("aadhaar_number"),
  aadhaarNumberHash: text("aadhaar_number_hash").unique(),
  passportNumber: text("passport_number"),
  passportNumberHash: text("passport_number_hash"),
  passportExpiry: date("passport_expiry"),
  uanNumber: text("uan_number"),
  uanNumberHash: text("uan_number_hash").unique(),
  esicNumber: text("esic_number"),
  esicNumberHash: text("esic_number_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const employeeDocuments = pgTable(
  "employee_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    documentType: documentTypeEnum("document_type").notNull(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    storedFilename: varchar("stored_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: varchar("storage_path", { length: 500 }).notNull(),
    status: documentStatusEnum("status").notNull().default("Uploaded"),
    verifiedBy: integer("verified_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectedBy: integer("rejected_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_employee_documents_employee_id").on(table.employeeId),
    index("idx_employee_documents_type").on(
      table.employeeId,
      table.documentType,
    ),
    check(
      "employee_documents_size_bytes_chk",
      sql`${table.sizeBytes} >= 0`,
    ),
    check(
      "doc_verified_at_requires_by_chk",
      sql`${table.verifiedAt} IS NULL OR ${table.verifiedBy} IS NOT NULL`,
    ),
  ],
);

export const employeeBankDetails = pgTable(
  "employee_bank_details",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    accountNumber: text("account_number").notNull(),
    accountNumberHash: text("account_number_hash"),
    accountName: varchar("account_name", { length: 100 }).notNull(),
    bankName: varchar("bank_name", { length: 100 }).notNull(),
    branchName: varchar("branch_name", { length: 100 }).notNull(),
    ifscCode: varchar("ifsc_code", { length: 11 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    passbookDocumentId: uuid("passbook_document_id").references(
      () => employeeDocuments.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("employee_bank_details_employee_account_uq").on(
      table.employeeId,
      table.accountNumberHash,
    ),
    uniqueIndex("uq_one_primary_bank_detail")
      .on(table.employeeId)
      .where(sql`${table.isPrimary} = TRUE`),
    check(
      "bank_detail_ifsc_chk",
      sql`${table.ifscCode} ~ '^[A-Z]{4}0[A-Z0-9]{6}$'`,
    ),
  ],
);

export const employeeOnboardingTokens = pgTable(
  "employee_onboarding_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    issuedBy: text("issued_by"),
    issueReason: tokenIssueReasonEnum("issue_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_onboarding_tokens_employee").on(table.employeeId),
    index("idx_onboarding_tokens_hash").on(table.tokenHash),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorEmployeeId: integer("actor_employee_id").references(
      () => employees.id,
      { onDelete: "set null" },
    ),
    action: auditActionEnum("action").notNull(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_audit_entity").on(table.entityType, table.entityId),
    index("idx_audit_actor").on(table.actorUserId, table.createdAt),
    index("idx_audit_action").on(table.action, table.createdAt),
  ],
);

export const resignations = pgTable(
  "resignations",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    lastWorkingDate: date("last_working_date").notNull(),
    reason: text("reason").notNull(),
    status: resignationStatusEnum("status").notNull().default("Submitted"),
    submittedOn: date("submitted_on").notNull().default(sql`CURRENT_DATE`),
    approvedBy: integer("approved_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    // ── Offboarding Phase 1 additions ──
    // Resolved resignation flow + its snapshotted notice period.
    flowId: integer("flow_id").references(() => resignationFlows.id, {
      onDelete: "set null",
    }),
    noticePeriodDays: integer("notice_period_days"),
    detailedRemark: text("detailed_remark"),
    // Stored relative path returned by private-file-storage (nullable).
    attachmentPath: varchar("attachment_path", { length: 500 }),
    buyoutRequested: boolean("buyout_requested").notNull().default(false),
    // Non-blocking system-validation snapshot: array of { code, level, message }.
    validation: jsonb("validation").notNull().default([]),

    // Manager stage.
    managerId: integer("manager_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    managerDecision: resignationDecisionEnum("manager_decision"),
    managerDecidedAt: timestamp("manager_decided_at", { withTimezone: true }),
    managerRemarks: text("manager_remarks"),
    recommendedLwd: date("recommended_lwd"),
    knowledgeTransferRequired: boolean("knowledge_transfer_required"),
    replacementRequired: boolean("replacement_required"),
    criticalResource: boolean("critical_resource"),

    // HR stage.
    hrId: integer("hr_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    hrDecision: resignationDecisionEnum("hr_decision"),
    hrDecidedAt: timestamp("hr_decided_at", { withTimezone: true }),
    hrRemarks: text("hr_remarks"),
    modifiedLwd: date("modified_lwd"),
    leaveEncashmentEligible: boolean("leave_encashment_eligible"),
    recoveryAmount: numeric("recovery_amount", { precision: 12, scale: 2 }),
    gratuityEligible: boolean("gratuity_eligible"),
    finalSettlementEligible: boolean("final_settlement_eligible"),

    // Multi-stage approval snapshot (mirrors leaveRequests).
    workflowStages: jsonb("workflow_stages"),
    currentStage: integer("current_stage").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "resignation_lwd_future_chk",
      sql`${table.lastWorkingDate} >= ${table.submittedOn}`,
    ),
    check(
      "resignation_approved_needs_approver_chk",
      sql`${table.approvedAt} IS NULL OR ${table.approvedBy} IS NOT NULL`,
    ),
    index("idx_resignation_employee").on(table.employeeId),
    index("idx_resignation_status").on(table.status),
    index("idx_resignation_manager").on(table.managerId),
  ],
);

// ── Offboarding admin config + runtime cases (Phase 1) ──

// Admin template: a resignation flow defines the notice period + buyout policy
// and is scoped to org units (dept / sub-dept / …) via resignationFlowScope.
export const resignationFlows = pgTable("resignation_flows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  noticePeriodDays: integer("notice_period_days").notNull().default(30),
  buyoutAllowed: boolean("buyout_allowed").notNull().default(true),
  settings: jsonb("settings").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: integer("created_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Scope rows for a resignation flow (mirrors leavePolicyScope).
export const resignationFlowScope = pgTable("resignation_flow_scope", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id")
    .notNull()
    .references(() => resignationFlows.id, { onDelete: "cascade" }),
  // 'Company' | 'Branch' | 'Department' | 'SubDepartment' | 'Designation'
  // | 'Grade' | 'EmploymentType' | 'Employee'
  scopeType: varchar("scope_type", { length: 30 }).notNull(),
  scopeId: integer("scope_id"),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Admin master list of resignation reasons (replaces the hardcoded constant).
export const exitReasons = pgTable("exit_reasons", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Runtime offboarding case, auto-created when HR approves a resignation.
export const offboardingCases = pgTable(
  "offboarding_cases",
  {
    id: serial("id").primaryKey(),
    caseNumber: varchar("case_number", { length: 30 }).notNull().unique(),
    resignationId: integer("resignation_id")
      .notNull()
      .references(() => resignations.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    departmentId: integer("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    reportingManagerId: integer("reporting_manager_id").references(
      () => employees.id,
      { onDelete: "set null" },
    ),
    dateOfJoining: date("date_of_joining"),
    resignationDate: date("resignation_date").notNull(),
    lastWorkingDate: date("last_working_date").notNull(),
    noticePeriodDays: integer("notice_period_days"),
    status: offboardingCaseStatusEnum("status")
      .notNull()
      .default("OffboardingInitiated"),
    // Clearance checklist snapshot (Phase 2 fills this with team tasks).
    clearanceChecklist: jsonb("clearance_checklist").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_offboarding_case_employee").on(table.employeeId),
    index("idx_offboarding_case_status").on(table.status),
  ],
);

// Admin-configurable default task list per clearance team (Phase 2). One row
// per team; `tasks` is an ordered array of task labels seeded into each case.
export const clearanceTemplates = pgTable("clearance_templates", {
  id: serial("id").primaryKey(),
  team: clearanceTeamEnum("team").notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  tasks: jsonb("tasks").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Runtime clearance tasks for an offboarding case, snapshotted from the
// templates at case creation and checked off by each team.
export const clearanceTasks = pgTable(
  "clearance_tasks",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => offboardingCases.id, { onDelete: "cascade" }),
    team: clearanceTeamEnum("team").notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    status: clearanceTaskStatusEnum("status").notNull().default("Pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedBy: integer("completed_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_clearance_tasks_case").on(table.caseId)],
);

// Exit-interview templates (Phase 3). `questions` is an ordered array of
// question objects: { id, type, label, required, options?, scaleMax? } where
// type ∈ yes_no | nps | star | rating_scale | single_choice | multiple_choice
// | comments | date.
export const exitInterviewTemplates = pgTable("exit_interview_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: integer("created_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// One exit-interview response per offboarding case. `answers` is a map of
// questionId → value (string | number | string[] | boolean).
export const exitInterviewResponses = pgTable(
  "exit_interview_responses",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .unique()
      .references(() => offboardingCases.id, { onDelete: "cascade" }),
    templateId: integer("template_id").references(
      () => exitInterviewTemplates.id,
      { onDelete: "set null" },
    ),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    status: exitInterviewStatusEnum("status").notNull().default("Pending"),
    answers: jsonb("answers").notNull().default({}),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_exit_interview_employee").on(table.employeeId),
  ],
);

// Full & Final settlement, one per offboarding case (Phase 4). Totals are
// computed from the line items; only workflow state is stored here.
export const fnfSettlements = pgTable("fnf_settlements", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .unique()
    .references(() => offboardingCases.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  status: fnfStatusEnum("status").notNull().default("Processing"),
  notes: text("notes"),
  approvedBy: integer("approved_by").references(() => employees.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  paidBy: integer("paid_by").references(() => employees.id, {
    onDelete: "set null",
  }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Earning / deduction line items for a settlement.
export const fnfLineItems = pgTable(
  "fnf_line_items",
  {
    id: serial("id").primaryKey(),
    settlementId: integer("settlement_id")
      .notNull()
      .references(() => fnfSettlements.id, { onDelete: "cascade" }),
    kind: fnfLineKindEnum("kind").notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_fnf_line_settlement").on(table.settlementId)],
);

// Exit-document templates (Phase 5). `htmlTemplate` holds HTML with {{tokens}}
// substituted at generation time. Categorised HR / Finance / Employee.
export const exitDocumentTemplates = pgTable("exit_document_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  category: exitDocumentCategoryEnum("category").notNull(),
  htmlTemplate: text("html_template").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Generated exit documents per case (one per template). `renderedHtml` is the
// filled snapshot at generation time.
export const exitDocuments = pgTable(
  "exit_documents",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => offboardingCases.id, { onDelete: "cascade" }),
    templateId: integer("template_id").references(
      () => exitDocumentTemplates.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 150 }).notNull(),
    category: exitDocumentCategoryEnum("category").notNull(),
    renderedHtml: text("rendered_html").notNull(),
    status: exitDocumentStatusEnum("status").notNull().default("Generated"),
    generatedBy: integer("generated_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("exit_documents_case_template_uq").on(
      table.caseId,
      table.templateId,
    ),
    index("idx_exit_documents_case").on(table.caseId),
  ],
);

// Access revocation checklist per case (Phase 6). One row per system. HRMS
// login is the only auto-actioned one (disables the employee account); the
// rest are tracked as manual revocations.
export const accessRevocations = pgTable(
  "access_revocations",
  {
    id: serial("id").primaryKey(),
    caseId: integer("case_id")
      .notNull()
      .references(() => offboardingCases.id, { onDelete: "cascade" }),
    system: accessSystemEnum("system").notNull(),
    status: accessStatusEnum("status").notNull().default("Active"),
    isAuto: boolean("is_auto").notNull().default(false),
    revokedBy: integer("revoked_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("access_revocations_case_system_uq").on(table.caseId, table.system),
    index("idx_access_revocations_case").on(table.caseId),
  ],
);

// ───────────────────────────────────────────────────────────────────────────
// GROUP 3 — ATTENDANCE
// ───────────────────────────────────────────────────────────────────────────

export const regularisationRequests = pgTable(
  "regularisation_requests",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    originalIssue: varchar("original_issue", { length: 255 }),
    requestedPunchIn: time("requested_punch_in").notNull(),
    requestedPunchOut: time("requested_punch_out").notNull(),
    reason: text("reason").notNull(),
    proofDocumentUrls: varchar("proof_document_urls", { length: 500 })
      .array()
      .notNull()
      .default(sql`'{}'::varchar[]`),
    status: regulariseStatusEnum("status").notNull().default("Pending"),
    approverId: integer("approver_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    approverRemarks: text("approver_remarks"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "reg_punch_out_after_in_chk",
      sql`${table.requestedPunchOut} > ${table.requestedPunchIn}`,
    ),
    check(
      "reg_decided_needs_approver_chk",
      sql`${table.decidedAt} IS NULL OR ${table.approverId} IS NOT NULL`,
    ),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    punchIn: time("punch_in"),
    punchOut: time("punch_out"),
    workingMinutes: integer("working_minutes"),
    lateByMinutes: integer("late_by_minutes").notNull().default(0),
    earlyExitMinutes: integer("early_exit_minutes").notNull().default(0),
    status: attStatusEnum("status").notNull(),
    location: varchar("location", { length: 200 }),
    isRegularised: boolean("is_regularised").notNull().default(false),
    regularisationId: integer("regularisation_id").references(
      () => regularisationRequests.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "attendance_records_pkey",
      columns: [table.employeeId, table.date],
    }),
    index("idx_att_date").on(table.date),
    index("idx_att_status").on(table.status),
    check(
      "att_working_minutes_chk",
      sql`${table.workingMinutes} IS NULL OR ${table.workingMinutes} >= 0`,
    ),
    check("att_late_minutes_chk", sql`${table.lateByMinutes} >= 0`),
    check("att_early_minutes_chk", sql`${table.earlyExitMinutes} >= 0`),
    check(
      "att_punch_out_after_in_chk",
      sql`${table.punchOut} IS NULL OR ${table.punchOut} > ${table.punchIn}`,
    ),
  ],
);

// ───────────────────────────────────────────────────────────────────────────
// GROUP 4 — LEAVE
// ───────────────────────────────────────────────────────────────────────────

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 5 }).notNull().unique(),
  description: text("description"),
  // Soft delete / disable toggle. Inactive types stay in history but don't
  // appear in apply-leave dropdowns or accrual calculations.
  isActive: boolean("is_active").notNull().default(true),
  isPaid: boolean("is_paid").notNull().default(true),
  allowHalfDay: boolean("allow_half_day").notNull().default(true),
  allowNegativeBalance: boolean("allow_negative_balance").notNull().default(false),
  // 'Male' / 'Female' / null. Used for maternity / paternity restrictions.
  genderRestriction: varchar("gender_restriction", { length: 10 }),
  // Minimum days in advance a request must be raised. 0 = same-day allowed.
  minNoticeDays: integer("min_notice_days").notNull().default(0),
  // null means proof is never required.
  requiresProofAfterDays: integer("requires_proof_after_days"),
  // null = unlimited continuous stretch.
  maxContinuousDays: integer("max_continuous_days"),
  // Phase-1 extension flags — surfaced in the catalog editor; the application
  // engine in later milestones reads them.
  hourlyLeaveAllowed: boolean("hourly_leave_allowed").notNull().default(false),
  carryForwardAllowed: boolean("carry_forward_allowed").notNull().default(false),
  encashmentAllowed: boolean("encashment_allowed").notNull().default(false),
  attachmentRequired: boolean("attachment_required").notNull().default(false),
  // false = blocked while employee is on probation.
  allowedInProbation: boolean("allowed_in_probation").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ───── Leave Policies (HR-configurable rules per leave type) ──────────────

export const leavePolicies = pgTable("leave_policies", {
  id: serial("id").primaryKey(),
  leaveTypeId: integer("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("Active"),
  isDefault: boolean("is_default").notNull().default(false),
  // Settings vary by leave_type — Zod-validated at API boundary.
  settings: jsonb("settings").notNull().default({}),
  createdBy: integer("created_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const leavePolicyScope = pgTable("leave_policy_scope", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id")
    .notNull()
    .references(() => leavePolicies.id, { onDelete: "cascade" }),
  // 'Company' | 'Branch' | 'Department' | 'Designation' | 'Grade'
  // | 'EmploymentType' | 'Process' | 'Employee'
  scopeType: varchar("scope_type", { length: 30 }).notNull(),
  scopeId: integer("scope_id"),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leaveApprovalWorkflows = pgTable("leave_approval_workflows", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id")
    .notNull()
    .references(() => leavePolicies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  // Array of { field, operator, value }
  criteria: jsonb("criteria").notNull().default([]),
  // 'AutoApprove' | 'AutoReject' | 'Route'
  outcome: varchar("outcome", { length: 20 }).notNull(),
  fromMode: varchar("from_mode", { length: 80 })
    .notNull()
    .default("Person performing this action"),
  toRecipients: jsonb("to_recipients").notNull().default([]),
  ccRecipients: jsonb("cc_recipients").notNull().default([]),
  bccRecipients: jsonb("bcc_recipients").notNull().default([]),
  replyToRecipients: jsonb("reply_to_recipients").notNull().default([]),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ───── Leave Credit Transactions (M6) ────────────────────────────────────
//
// Append-only audit ledger. Every row explains a delta applied to the
// employee's running balance. closing_balance on leave_balances should
// always equal opening_balance + sum of credits + carried_forward − used.

export const leaveCreditTransactions = pgTable("leave_credit_transactions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  leaveTypeId: integer("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id, { onDelete: "cascade" }),
  policyId: integer("policy_id").references(() => leavePolicies.id, {
    onDelete: "set null",
  }),
  amount: numeric("amount", { precision: 6, scale: 2 }).notNull(),
  // 'Accrual' | 'Grant' | 'Adjustment' | 'CarryForward' | 'Lapse' | 'Encashment'
  kind: varchar("kind", { length: 20 }).notNull(),
  // YYYY-MM for monthly accruals; YYYY-01 etc. for yearly grants.
  period: varchar("period", { length: 7 }).notNull(),
  reason: text("reason"),
  actorUserId: text("actor_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  // Idempotency: one credit per (employee, type, period, kind). The accrual
  // engine's onConflictDoNothing targets exactly these columns.
  uniqueIndex("leave_credit_uq").on(
    table.employeeId,
    table.leaveTypeId,
    table.period,
    table.kind,
  ),
]);

// ───── Approval Workflows (Phase: multi-stage leave approval) ────────────
//
// A named, ordered chain of approver stages. Assigned to a leave plan; a leave
// request snapshots the stages and walks them one approver at a time.
// Stage values: 'Manager' | 'DeptHead' | 'HR'.
export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  description: text("description"),
  stages: jsonb("stages").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ───── Leave Plans (Phase 4: multi-type policy bundles) ──────────────────
//
// A leave_plan is the admin-facing "Leave Policy" bundle: a named package that
// allocates an annual quota per leave type, optionally links a weekly-off
// config and toggles comp-off, and is assigned to an employee group via scope.
// Distinct from the per-leave-type `leave_policies` above (which drive Comp Off
// and Approval rules).

export const leavePlans = pgTable("leave_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  description: text("description"),
  // 'Draft' | 'Active' | 'Archived'
  status: varchar("status", { length: 20 }).notNull().default("Draft"),
  isDefault: boolean("is_default").notNull().default(false),
  weeklyOffConfigId: integer("weekly_off_config_id").references(
    (): AnyPgColumn => weeklyOffConfigs.id,
    { onDelete: "set null" },
  ),
  compOffEnabled: boolean("comp_off_enabled").notNull().default(false),
  // 'Annual' = full quota granted up front; 'Monthly' = accrued pro-rata to
  // the current month.
  accrualMethod: varchar("accrual_method", { length: 10 })
    .notNull()
    .default("Annual"),
  // Max days that may carry into next year. null = no carry-forward.
  carryForwardCap: integer("carry_forward_cap"),
  // Scale a joiner's first-year quota by the fraction of the year remaining.
  proRataJoiners: boolean("pro_rata_joiners").notNull().default(false),
  // Multi-stage approval workflow applied to leave requests under this policy.
  approvalWorkflowId: integer("approval_workflow_id").references(
    () => approvalWorkflows.id,
    { onDelete: "set null" },
  ),
  createdBy: integer("created_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const leavePlanAllocations = pgTable(
  "leave_plan_allocations",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => leavePlans.id, { onDelete: "cascade" }),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "cascade" }),
    // Annual quota in days (e.g. CL = 12).
    annualQuota: numeric("annual_quota", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [
    uniqueIndex("leave_plan_alloc_uq").on(table.planId, table.leaveTypeId),
  ],
);

export const leavePlanScope = pgTable("leave_plan_scope", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => leavePlans.id, { onDelete: "cascade" }),
  scopeType: varchar("scope_type", { length: 30 }).notNull(),
  scopeId: integer("scope_id"),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Comp-off requests (Phase 14). An employee who worked on a holiday / weekly
// off raises a request; on approval the CO leave balance is credited. Kept
// deliberately simple: 1 row = 1 worked day, default 1 day of credit.
export const compOffRequests = pgTable("comp_off_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  // Reporting manager at request time (the approver). Null = route to HR only.
  managerId: integer("manager_id").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  // The holiday / week-off date that was worked.
  workedDate: date("worked_date").notNull(),
  days: numeric("days", { precision: 4, scale: 1 }).notNull().default("1"),
  reason: text("reason").notNull(),
  // 'Pending' | 'Approved' | 'Rejected'
  status: varchar("status", { length: 20 }).notNull().default("Pending"),
  decidedBy: integer("decided_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leaveBalances = pgTable(
  "leave_balances",
  {
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "cascade" }),
    openingBalance: numeric("opening_balance", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    accrued: numeric("accrued", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    used: numeric("used", { precision: 6, scale: 2 }).notNull().default("0"),
    carriedForward: numeric("carried_forward", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    collapsed: boolean("collapsed").notNull().default(false),
    closingBalance: numeric("closing_balance", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "leave_balances_pkey",
      columns: [table.employeeId, table.leaveTypeId],
    }),
    check("lb_closing_balance_chk", sql`${table.closingBalance} >= 0`),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "restrict" }),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    days: numeric("days", { precision: 4, scale: 1 }).notNull(),
    durationType: durationTypeEnum("duration_type").notNull(),
    reason: text("reason").notNull(),
    documentUrls: varchar("document_urls", { length: 500 })
      .array()
      .notNull()
      .default(sql`'{}'::varchar[]`),
    status: leaveReqStatusEnum("status").notNull().default("Pending"),
    appliedOn: date("applied_on").notNull().default(sql`CURRENT_DATE`),
    managerId: integer("manager_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    managerDecision: leaveDecisionEnum("manager_decision"),
    managerDecidedAt: timestamp("manager_decided_at", { withTimezone: true }),
    managerRemarks: text("manager_remarks"),
    hrId: integer("hr_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    hrDecision: hrDecisionEnum("hr_decision"),
    hrDecidedAt: timestamp("hr_decided_at", { withTimezone: true }),
    hrRemarks: text("hr_remarks"),
    // Multi-stage approval workflow snapshot (ordered approver stages) and the
    // index of the stage currently awaiting action. Null stages = legacy /
    // no workflow (falls back to a single Manager stage).
    workflowStages: jsonb("workflow_stages"),
    currentStage: integer("current_stage").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_lr_emp").on(table.employeeId),
    index("idx_lr_status").on(table.status),
    index("idx_lr_dates").on(table.fromDate, table.toDate),
    check("lr_days_chk", sql`${table.days} > 0`),
    check("lr_to_after_from_chk", sql`${table.toDate} >= ${table.fromDate}`),
    check("lr_applied_date_chk", sql`${table.appliedOn} <= CURRENT_DATE`),
    check(
      "lr_half_day_chk",
      sql`${table.durationType} = 'Full Day' OR ${table.days} = 0.5`,
    ),
  ],
);

// ───────────────────────────────────────────────────────────────────────────
// GROUP 7 — COMMUNICATION
// ───────────────────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    kind: notifKindEnum("kind").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    sub: varchar("sub", { length: 500 }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table: any) => [
    index("idx_notif_recipient").on(table.recipientId, table.isRead),
    index("idx_notif_created").on(sql`${table.createdAt} DESC`),
  ],
);

export const broadcasts = pgTable(
  "broadcasts",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    targetType: broadcastTargetEnum("target_type").notNull(),
    message: text("message").notNull(),
    targetDeptIds: integer("target_dept_ids")
      .array()
      .notNull()
      .default(sql`'{}'::int[]`),
    targetEmpIds: integer("target_emp_ids")
      .array()
      .notNull()
      .default(sql`'{}'::int[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table: any) => [
    index("idx_bc_dept_ids").using("gin", table.targetDeptIds),
    index("idx_bc_emp_ids").using("gin", table.targetEmpIds),
    check(
      "bc_dept_ids_when_dept_chk",
      sql`${table.targetType} <> 'department' OR array_length(${table.targetDeptIds}, 1) > 0`,
    ),
    check(
      "bc_emp_ids_when_individual_chk",
      sql`${table.targetType} <> 'individual' OR array_length(${table.targetEmpIds}, 1) > 0`,
    ),
    check(
      "bc_all_no_ids_chk",
      sql`${table.targetType} <> 'all' OR (array_length(${table.targetDeptIds}, 1) IS NULL AND array_length(${table.targetEmpIds}, 1) IS NULL)`,
    ),
  ],
);

// ───────────────────────────────────────────────────────────────────────────
// GROUP 8 — HOLIDAY CALENDAR
// ───────────────────────────────────────────────────────────────────────────
//
// A single company-wide calendar. branchId is optional — null means "all
// branches". When we add multiple branches that observe different sets of
// regional holidays, a branch-specific row overrides / supplements the null
// row for that branch on that date.

export const holidayCalendars = pgTable("holiday_calendars", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  description: text("description"),
  // 'Draft' | 'Published' | 'Archived'
  status: varchar("status", { length: 20 }).notNull().default("Draft"),
  createdBy: integer("created_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const holidays = pgTable(
  "holidays",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    type: holidayTypeEnum("type").notNull().default("National"),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "cascade",
    }),
    // Nullable for legacy rows that were attached only to a branch. New rows
    // are always associated with a holiday_calendar.
    calendarId: integer("calendar_id").references(() => holidayCalendars.id, {
      onDelete: "cascade",
    }),
    isHalfDay: boolean("is_half_day").notNull().default(false),
    description: text("description"),
    // Per-holiday scope: optional array of { scopeType, scopeId } rows
    // that narrow which employees this holiday applies to *within* the
    // calendar's broader scope. Empty array = applies to everyone the
    // calendar applies to.
    scope: jsonb("scope").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table: any) => [
    index("idx_holidays_date").on(table.date),
    index("idx_holidays_calendar").on(table.calendarId, table.date),
  ],
);

// Many-to-many: one holiday can apply to many calendars (teams). The legacy
// holidays.calendar_id is still around but the link table is the canonical
// source going forward.
export const holidayTeamLinks = pgTable(
  "holiday_team_links",
  {
    holidayId: integer("holiday_id")
      .notNull()
      .references(() => holidays.id, { onDelete: "cascade" }),
    calendarId: integer("calendar_id")
      .notNull()
      .references(() => holidayCalendars.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "holiday_team_links_pkey",
      columns: [table.holidayId, table.calendarId],
    }),
    index("idx_holiday_team_links_calendar").on(table.calendarId),
  ],
);

export const holidayCalendarScope = pgTable("holiday_calendar_scope", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id")
    .notNull()
    .references(() => holidayCalendars.id, { onDelete: "cascade" }),
  // 'Company' | 'Branch' | 'Location' | 'Department' | 'Designation' | 'Grade'
  // | 'EmploymentType' | 'Employee'
  scopeType: varchar("scope_type", { length: 30 }).notNull(),
  scopeId: integer("scope_id"),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ───── Weekly Off Configurations ──────────────────────────────────────────

export const weeklyOffConfigs = pgTable("weekly_off_configs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  description: text("description"),
  // 'Draft' | 'Published' | 'Archived'
  status: varchar("status", { length: 20 }).notNull().default("Draft"),
  // 'Fixed' | 'Rotational' | 'Roster'
  mode: varchar("mode", { length: 20 }).notNull().default("Fixed"),
  // Mode-specific shape — Zod-validated at the API boundary.
  settings: jsonb("settings").notNull().default({}),
  createdBy: integer("created_by").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const weeklyOffScope = pgTable("weekly_off_scope", {
  id: serial("id").primaryKey(),
  configId: integer("config_id")
    .notNull()
    .references(() => weeklyOffConfigs.id, { onDelete: "cascade" }),
  scopeType: varchar("scope_type", { length: 30 }).notNull(),
  scopeId: integer("scope_id"),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ───────────────────────────────────────────────────────────────────────────
// GROUP 9 — ORG SETUP: LOCATIONS
// ───────────────────────────────────────────────────────────────────────────
// Standalone org-location registry (distinct from branches) managed under
// HR → Org Setup → Location. Holds name/code plus city/state/country.

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  address: text("address"),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  country: varchar("country", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ───────────────────────────────────────────────────────────────────────────
// GROUP 10 — RBAC
// ───────────────────────────────────────────────────────────────────────────

export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    module: varchar("module", { length: 50 }).notNull(),
    description: varchar("description", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_permissions_module").on(table.module)],
);

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "role_permissions_pkey",
      columns: [table.roleId, table.permissionId],
    }),
  ],
);

// ───────────────────────────────────────────────────────────────────────────
// INFERRED TYPES
// ───────────────────────────────────────────────────────────────────────────
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
export type EmploymentType = typeof employmentTypes.$inferSelect;
export type NewEmploymentType = typeof employmentTypes.$inferInsert;
export type Designation = typeof designations.$inferSelect;
export type NewDesignation = typeof designations.$inferInsert;
export type OrgHierarchyDepartment = typeof orgHierarchyDepartments.$inferSelect;
export type NewOrgHierarchyDepartment =
  typeof orgHierarchyDepartments.$inferInsert;
export type OrgHierarchySubDepartment =
  typeof orgHierarchySubDepartments.$inferSelect;
export type NewOrgHierarchySubDepartment =
  typeof orgHierarchySubDepartments.$inferInsert;
export type OrgHierarchyLevel = typeof orgHierarchyLevels.$inferSelect;
export type NewOrgHierarchyLevel = typeof orgHierarchyLevels.$inferInsert;
export type OrgHierarchyDesignation =
  typeof orgHierarchyDesignations.$inferSelect;
export type NewOrgHierarchyDesignation =
  typeof orgHierarchyDesignations.$inferInsert;
export type OrgHierarchyStructure = typeof orgHierarchyStructure.$inferSelect;
export type NewOrgHierarchyStructure = typeof orgHierarchyStructure.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
export type EmployeeAcademicDetail = typeof employeeAcademicDetails.$inferSelect;
export type NewEmployeeAcademicDetail =
  typeof employeeAcademicDetails.$inferInsert;
export type EmployeeProfessionalDetail =
  typeof employeeProfessionalDetails.$inferSelect;
export type NewEmployeeProfessionalDetail =
  typeof employeeProfessionalDetails.$inferInsert;
export type EmployeeIdentityDetail = typeof employeeIdentityDetails.$inferSelect;
export type NewEmployeeIdentityDetail =
  typeof employeeIdentityDetails.$inferInsert;
export type EmployeeBankDetail = typeof employeeBankDetails.$inferSelect;
export type NewEmployeeBankDetail = typeof employeeBankDetails.$inferInsert;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type NewEmployeeDocument = typeof employeeDocuments.$inferInsert;
export type Resignation = typeof resignations.$inferSelect;
export type NewResignation = typeof resignations.$inferInsert;
export type RegularisationRequest =
  typeof regularisationRequests.$inferSelect;
export type NewRegularisationRequest =
  typeof regularisationRequests.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type NewLeaveType = typeof leaveTypes.$inferInsert;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type NewLeaveBalance = typeof leaveBalances.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Broadcast = typeof broadcasts.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;
export type NewBroadcast = typeof broadcasts.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
