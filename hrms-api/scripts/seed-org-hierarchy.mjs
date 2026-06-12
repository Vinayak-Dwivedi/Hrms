// Seed org hierarchy demo data. Usage: node scripts/seed-org-hierarchy.mjs
// Prerequisite: npm run db:migrate-org-hierarchy
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    /* missing file is OK */
  }
}

loadDotEnv(resolve(process.cwd(), ".env.local"));
loadDotEnv(resolve(process.cwd(), ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { connect_timeout: 10, max: 1 });

async function assertSchemaReady() {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'org_hierarchy_levels'
    ) AS ready
  `;
  if (!row?.ready) {
    console.error(
      'Org hierarchy tables are missing. Run: npm run db:migrate-org-hierarchy',
    );
    process.exit(1);
  }
}

try {
  await assertSchemaReady();
  console.log("Seeding org hierarchy demo data...");

  for (const [code, name, sortOrder] of [
    ["L1", "Executive", 1],
    ["L2", "Sr Executive", 2],
    ["L3", "Manager", 3],
    ["L4", "HOD", 4],
    ["L5", "Director", 5],
  ]) {
    await sql`
      INSERT INTO org_hierarchy_levels (code, name, sort_order)
      VALUES (${code}, ${name}, ${sortOrder})
      ON CONFLICT (code) DO NOTHING
    `;
  }

  const levels = await sql`SELECT id, code FROM org_hierarchy_levels`;
  const levelByCode = Object.fromEntries(levels.map((l) => [l.code, l.id]));

  await sql`
    INSERT INTO org_hierarchy_departments (name, code, status)
    SELECT 'Operations', 'OPS', 'Active'
    WHERE NOT EXISTS (
      SELECT 1 FROM org_hierarchy_departments WHERE code = 'OPS'
    )
  `;
  const [dept] = await sql`
    SELECT id FROM org_hierarchy_departments WHERE code = 'OPS'
  `;
  if (!dept) {
    throw new Error("Failed to resolve Operations department row.");
  }

  await sql`
    INSERT INTO org_hierarchy_sub_departments (department_id, name, status)
    SELECT ${dept.id}, 'Beetal', 'Active'
    WHERE NOT EXISTS (
      SELECT 1 FROM org_hierarchy_sub_departments
      WHERE department_id = ${dept.id} AND name = 'Beetal'
    )
  `;
  const [subDept] = await sql`
    SELECT id FROM org_hierarchy_sub_departments
    WHERE department_id = ${dept.id} AND name = 'Beetal'
  `;
  if (!subDept) {
    throw new Error("Failed to resolve Beetal sub-department row.");
  }

  for (const [name, code, levelCode] of [
    ["Executive", "EXEC", "L1"],
    ["Manager", "MGR", "L3"],
    ["HOD", "HOD", "L4"],
  ]) {
    await sql`
      INSERT INTO org_hierarchy_designations (name, code, level_id, status)
      VALUES (${name}, ${code}, ${levelByCode[levelCode]}, 'Active')
      ON CONFLICT (name) DO NOTHING
    `;
  }

  const desigs = await sql`SELECT id, name FROM org_hierarchy_designations`;
  const desigByName = Object.fromEntries(desigs.map((d) => [d.name, d.id]));

  for (const desigName of ["HOD", "Manager", "Executive"]) {
    const designationId = desigByName[desigName];
    if (designationId == null) continue;

    await sql`
      INSERT INTO org_hierarchy_structure (
        department_id, sub_department_id, designation_id, level_id
      )
      SELECT
        ${dept.id},
        ${subDept.id},
        ${designationId},
        d.level_id
      FROM org_hierarchy_designations d
      WHERE d.id = ${designationId}
      ON CONFLICT (department_id, sub_department_id, designation_id) DO NOTHING
    `;
  }

  console.log("Org hierarchy seed complete.");
} catch (e) {
  console.error(e.message ?? e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
