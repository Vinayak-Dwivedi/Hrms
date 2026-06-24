#!/usr/bin/env node
/**
 * Ensure attendance RBAC permissions exist and are assigned to the correct roles.
 * Usage: node scripts/ensure-attendance-permissions.mjs
 */
import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

const ATTENDANCE_PERMISSIONS = [
  {
    code: "attendance.view",
    name: "View Attendance",
    module: "attendance",
    description: "View attendance records",
  },
  {
    code: "attendance.upload",
    name: "Upload Attendance",
    module: "attendance",
    description: "Bulk upload attendance",
  },
];

/** Role code → permission codes that must be assigned. */
const ROLE_ASSIGNMENTS = {
  employee: ["attendance.view"],
  manager: ["attendance.view"],
  admin: ["attendance.view", "attendance.upload"],
  hr: ["attendance.view", "attendance.upload"],
};

try {
  const permIdByCode = {};

  for (const p of ATTENDANCE_PERMISSIONS) {
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

  let mappingsAdded = 0;

  for (const [roleCode, permCodes] of Object.entries(ROLE_ASSIGNMENTS)) {
    const [role] = await sql`
      SELECT id FROM roles WHERE code = ${roleCode} LIMIT 1
    `;
    if (!role) continue;

    for (const code of permCodes) {
      const permissionId = permIdByCode[code];
      if (!permissionId) continue;

      const [existing] = await sql`
        SELECT 1 FROM role_permissions
        WHERE role_id = ${role.id} AND permission_id = ${permissionId}
        LIMIT 1
      `;
      if (existing) continue;

      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (${role.id}, ${permissionId})
      `;
      mappingsAdded++;
    }
  }

  console.log(
    `Attendance permissions ready (${Object.keys(permIdByCode).length} codes, ${mappingsAdded} new role mappings).`,
  );
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
