#!/usr/bin/env node
// Seed starter permissions, roles, and role-permission mappings. Idempotent.

import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

const PERMISSIONS = [
  { code: "employees.view", name: "View Employees", module: "employees", description: "View employee records" },
  { code: "employees.create", name: "Create Employees", module: "employees", description: "Add new employees" },
  { code: "employees.edit", name: "Edit Employees", module: "employees", description: "Update employee records" },
  { code: "leave.view", name: "View Leave", module: "leave", description: "View leave requests" },
  { code: "leave.approve", name: "Approve Leave", module: "leave", description: "Approve or reject leave" },
  { code: "leave.policy.manage", name: "Manage Leave Policy", module: "leave", description: "Configure leave types, policies, plans, and weekly off" },
  { code: "holiday.policy.manage", name: "Manage Holiday Policy", module: "leave", description: "Configure organisation holidays and holiday policy" },
  { code: "shift.policy.manage", name: "Manage Shift Configuration", module: "attendance", description: "Configure work shifts and timings" },
  { code: "attendance.view", name: "View Attendance", module: "attendance", description: "View attendance records" },
  { code: "attendance.upload", name: "Upload Attendance", module: "attendance", description: "Bulk upload attendance" },
  { code: "payroll.view", name: "View Payroll", module: "payroll", description: "View payslips and payroll" },
  { code: "admin.permissions", name: "Manage Permissions", module: "admin", description: "Manage permission definitions" },
  { code: "admin.roles", name: "Manage Roles", module: "admin", description: "Manage roles and assignments" },
  { code: "onboarding.view", name: "View Onboarding", module: "onboarding", description: "View employee onboarding status and reports" },
  { code: "onboarding.manage", name: "Manage Onboarding", module: "onboarding", description: "Approve onboarding and manage invitations" },
  { code: "onboarding.verify_documents", name: "Verify Documents", module: "onboarding", description: "Verify or reject employee documents" },
  { code: "onboarding.resend_invitation", name: "Resend Invitations", module: "onboarding", description: "Resend or regenerate onboarding invitations" },
  { code: "onboarding.manage_bank", name: "Manage Bank Details", module: "onboarding", description: "Add and approve employee bank account details during onboarding" },
  { code: "offboarding.view", name: "View Offboarding", module: "offboarding", description: "View offboarding cases and configuration" },
  { code: "offboarding.manage_flows", name: "Manage Resignation Flows", module: "offboarding", description: "Create and edit resignation flows, notice rules and exit reasons" },
  { code: "offboarding.approve_resignations", name: "Approve Resignations (HR)", module: "offboarding", description: "HR review and approval of resignations" },
  { code: "offboarding.manage_cases", name: "Manage Offboarding Cases", module: "offboarding", description: "View and manage active offboarding cases" },
  { code: "offboarding.clearance.it", name: "IT Clearance", module: "offboarding", description: "View and complete IT clearance tasks on offboarding cases" },
  { code: "offboarding.clearance.admin", name: "Admin Clearance", module: "offboarding", description: "View and complete Admin clearance tasks on offboarding cases" },
  { code: "offboarding.clearance.finance", name: "Finance Clearance", module: "offboarding", description: "View and complete Finance clearance tasks on offboarding cases" },
  { code: "offboarding.clearance.hr", name: "HR Clearance", module: "offboarding", description: "View and complete HR clearance tasks on offboarding cases" },
  { code: "offboarding.clearance.operations", name: "Operations Clearance", module: "offboarding", description: "View and complete Operations clearance tasks on offboarding cases" },
];

const ROLES = [
  { code: "employee", name: "Employee", description: "Standard employee access" },
  { code: "manager", name: "Manager", description: "Team manager access" },
  { code: "admin", name: "Administrator", description: "Full HRMS administration" },
  { code: "hr", name: "HR", description: "HR portal and onboarding access" },
  { code: "master", name: "Master", description: "Full system access — all permissions" },
];

const ROLE_PERMISSION_CODES = {
  employee: [
    "employees.view",
    "leave.view",
    "attendance.view",
    "payroll.view",
  ],
  manager: [
    "employees.view",
    "leave.view",
    "leave.approve",
    "attendance.view",
    "payroll.view",
    "onboarding.view",
    "onboarding.verify_documents",
  ],
  admin: PERMISSIONS.map((p) => p.code),
  master: PERMISSIONS.map((p) => p.code),
  hr: [
    "employees.view",
    "employees.create",
    "employees.edit",
    "leave.view",
    "attendance.view",
    "attendance.upload",
    "onboarding.view",
    "onboarding.manage",
    "onboarding.verify_documents",
    "onboarding.resend_invitation",
    "onboarding.manage_bank",
    "offboarding.view",
    "offboarding.manage_flows",
    "offboarding.approve_resignations",
    "offboarding.manage_cases",
    "offboarding.clearance.it",
    "offboarding.clearance.admin",
    "offboarding.clearance.finance",
    "offboarding.clearance.hr",
    "offboarding.clearance.operations",
    "leave.policy.manage",
    "holiday.policy.manage",
    "shift.policy.manage",
  ],
};

try {
  const permIdByCode = {};

  for (const p of PERMISSIONS) {
    const [existing] = await sql`
      SELECT id FROM permissions WHERE code = ${p.code} LIMIT 1
    `;
    if (existing) {
      await sql`
        UPDATE permissions
        SET name = ${p.name},
            module = ${p.module},
            description = ${p.description},
            is_active = true
        WHERE id = ${existing.id}
      `;
      permIdByCode[p.code] = existing.id;
      continue;
    }
    const [inserted] = await sql`
      INSERT INTO permissions (code, name, module, description, is_active)
      VALUES (${p.code}, ${p.name}, ${p.module}, ${p.description}, true)
      RETURNING id
    `;
    permIdByCode[p.code] = inserted.id;
  }

  const roleIdByCode = {};

  for (const r of ROLES) {
    const [existing] = await sql`
      SELECT id FROM roles WHERE code = ${r.code} LIMIT 1
    `;
    if (existing) {
      roleIdByCode[r.code] = existing.id;
      continue;
    }
    const [inserted] = await sql`
      INSERT INTO roles (code, name, description, is_active)
      VALUES (${r.code}, ${r.name}, ${r.description}, true)
      RETURNING id
    `;
    roleIdByCode[r.code] = inserted.id;
  }

  let mappingsAdded = 0;

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_CODES)) {
    const roleId = roleIdByCode[roleCode];
    if (!roleId) continue;

    for (const permCode of permCodes) {
      const permissionId = permIdByCode[permCode];
      if (!permissionId) continue;

      const [existing] = await sql`
        SELECT 1 FROM role_permissions
        WHERE role_id = ${roleId} AND permission_id = ${permissionId}
        LIMIT 1
      `;
      if (existing) continue;

      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (${roleId}, ${permissionId})
      `;
      mappingsAdded++;
    }
  }

  console.log(
    `rbac seeded: permissions=${Object.keys(permIdByCode).length}, roles=${Object.keys(roleIdByCode).length}, new_mappings=${mappingsAdded}`,
  );
} catch (e) {
  console.error(e.message);
  process.exit(1);
} finally {
  await sql.end();
}
