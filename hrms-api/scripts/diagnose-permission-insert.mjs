#!/usr/bin/env node
import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'permissions'
    ORDER BY ordinal_position
  `;
  console.log("columns:", cols);

  const existing = await sql`
    SELECT id, code, name, is_active FROM permissions WHERE code = 'leave.apply'
  `;
  console.log("leave.apply rows:", existing);

  try {
    const inserted = await sql`
      INSERT INTO permissions (code, name, module, description, is_active)
      VALUES ('leave.apply', 'Leave Apply', 'leave', NULL, true)
      RETURNING id, code
    `;
    console.log("insert ok:", inserted);
    await sql`DELETE FROM permissions WHERE code = 'leave.apply'`;
    console.log("cleaned up test row");
  } catch (e) {
    console.log("insert error:", e.message);
    console.log("pg code:", e.code);
    console.log("detail:", e.detail);
    console.log("constraint:", e.constraint_name);
  }
} finally {
  await sql.end();
}
