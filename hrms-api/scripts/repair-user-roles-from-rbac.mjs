#!/usr/bin/env node
/**
 * Repair users.role for employees assigned a custom System Access Role before
 * rbacCodeToAuthRole preserved custom role codes in JWT.
 *
 * Usage:
 *   node scripts/repair-user-roles-from-rbac.mjs [--dry-run] [--employee-id=123 --role-id=5]
 *
 * Without --employee-id/--role-id: reports linked users still on JWT role "user"
 * (likely stuck as employee). Re-assign the role via Edit Employee after deploy.
 */

import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const employeeIdArg = args.find((a) => a.startsWith("--employee-id="));
const roleIdArg = args.find((a) => a.startsWith("--role-id="));

const sql = postgres(DB_URL, { max: 1 });

function rbacCodeToAuthRole(code) {
  if (code === "employee") return "user";
  return code;
}

function userTypeIdFromAuthRole(authRole) {
  if (authRole === "master" || authRole === "admin") return 1;
  if (authRole === "hr") return 2;
  if (authRole === "manager") return 3;
  return 4;
}

async function repairOne(employeeId, roleId) {
  const [row] = await sql`
    SELECT e.id AS employee_id, e.emp_id, e.user_id, u.role AS current_role
    FROM employees e
    INNER JOIN users u ON u.id = e.user_id
    WHERE e.id = ${employeeId}
    LIMIT 1
  `;
  if (!row) {
    console.error(`Employee ${employeeId} not found or has no login.`);
    return false;
  }

  const [role] = await sql`
    SELECT id, code, name, is_active FROM roles WHERE id = ${roleId} LIMIT 1
  `;
  if (!role) {
    console.error(`Role ${roleId} not found.`);
    return false;
  }
  if (!role.is_active) {
    console.error(`Role ${roleId} (${role.code}) is inactive.`);
    return false;
  }

  const nextRole = rbacCodeToAuthRole(role.code);
  const nextUserTypeId = userTypeIdFromAuthRole(nextRole);

  console.log(
    `Employee ${row.emp_id} (#${row.employee_id}): ${row.current_role} → ${nextRole} (${role.name})`,
  );

  if (!dryRun) {
    await sql`
      UPDATE users
      SET role = ${nextRole}, user_type_id = ${nextUserTypeId}, updated_at = NOW()
      WHERE id = ${row.user_id}
    `;
  }
  return true;
}

async function reportStuckUsers() {
  const rows = await sql`
    SELECT e.id, e.emp_id, e.first_name, e.last_name, u.id AS user_id, u.email, u.role
    FROM employees e
    INNER JOIN users u ON u.id = e.user_id
    WHERE u.role = 'user'
    ORDER BY e.emp_id
  `;

  if (rows.length === 0) {
    console.log("No linked users with JWT role 'user' found.");
    return;
  }

  console.log(
    `${rows.length} employee login(s) use JWT role "user" (employee). If any should have a custom role, re-save via Edit Employee or run:`,
  );
  console.log(
    "  node scripts/repair-user-roles-from-rbac.mjs --employee-id=<id> --role-id=<roleId>",
  );
  for (const r of rows) {
    console.log(
      `  - ${r.emp_id} ${r.first_name} ${r.last_name} <${r.email}> (employee #${r.id})`,
    );
  }
}

async function main() {
  try {
    if (employeeIdArg && roleIdArg) {
      const employeeId = Number(employeeIdArg.split("=")[1]);
      const roleId = Number(roleIdArg.split("=")[1]);
      if (!Number.isFinite(employeeId) || !Number.isFinite(roleId)) {
        console.error("Invalid --employee-id or --role-id");
        process.exit(1);
      }
      const ok = await repairOne(employeeId, roleId);
      if (dryRun) console.log("(dry run — no changes written)");
      process.exit(ok ? 0 : 1);
    }

    await reportStuckUsers();
    if (dryRun) console.log("(dry run)");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
