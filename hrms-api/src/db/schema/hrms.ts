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
  "Pending",
  "Approved",
  "Withdrawn",
]);
export const perfLabelEnum = pgEnum("perf_label_enum", [
  "Good",
  "Excellent",
  "Needs Attention",
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
    workEmail: citext("work_email").unique(),
    phone: varchar("phone", { length: 20 }).notNull(),
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

    panNo: varchar("pan_no", { length: 15 }).unique(),
    uanNo: varchar("uan_no", { length: 20 }).unique(),
    aadhaarNo: varchar("aadhaar_no", { length: 12 }).unique(),
    esicNo: varchar("esic_no", { length: 20 }).unique(),

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
      "emp_pan_chk",
      sql`${table.panNo} IS NULL OR ${table.panNo} ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'`,
    ),
    check(
      "emp_aadhaar_chk",
      sql`${table.aadhaarNo} IS NULL OR ${table.aadhaarNo} ~ '^[0-9]{12}$'`,
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
  panNumber: varchar("pan_number", { length: 15 }),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }),
  passportNumber: varchar("passport_number", { length: 20 }),
  passportExpiry: date("passport_expiry"),
  uanNumber: varchar("uan_number", { length: 20 }),
  esicNumber: varchar("esic_number", { length: 20 }),
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
    accountNumber: varchar("account_number", { length: 25 }).notNull(),
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
      table.accountNumber,
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
    status: resignationStatusEnum("status").notNull().default("Pending"),
    submittedOn: date("submitted_on").notNull().default(sql`CURRENT_DATE`),
    approvedBy: integer("approved_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table: any) => [
    index("idx_holidays_date").on(table.date),
  ],
);

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
