#!/usr/bin/env node
/**
 * Ensure onboarding RBAC permissions exist and are assigned to HR/admin roles.
 * Usage: node scripts/ensure-onboarding-permissions.mjs
 */
import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

const ONBOARDING_PERMISSIONS = [
  {
    code: "onboarding.view",
    name: "View Onboarding",
    module: "onboarding",
    description: "View employee onboarding status and reports",
  },
  {
    code: "onboarding.manage",
    name: "Manage Onboarding",
    module: "onboarding",
    description: "Approve onboarding and manage invitations",
  },
  {
    code: "onboarding.verify_documents",
    name: "Verify Documents",
    module: "onboarding",
    description: "Verify or reject employee documents",
  },
  {
    code: "onboarding.resend_invitation",
    name: "Resend Invitations",
    module: "onboarding",
    description: "Resend or regenerate onboarding invitations",
  },
  {
    code: "onboarding.manage_bank",
    name: "Manage Bank Details",
    module: "onboarding",
    description: "Add and approve employee bank account details during onboarding",
  },
];

const ROLE_CODES = ["hr", "admin"];

try {
  const permIdByCode = {};

  for (const p of ONBOARDING_PERMISSIONS) {
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
  for (const roleCode of ROLE_CODES) {
    const [role] = await sql`
      SELECT id FROM roles WHERE code = ${roleCode} LIMIT 1
    `;
    if (!role) continue;

    const codes =
      roleCode === "admin"
        ? ONBOARDING_PERMISSIONS.map((p) => p.code)
        : ONBOARDING_PERMISSIONS.map((p) => p.code);

    for (const code of codes) {
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
    `Onboarding permissions ready (${Object.keys(permIdByCode).length} codes, ${mappingsAdded} new role mappings).`,
  );
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
