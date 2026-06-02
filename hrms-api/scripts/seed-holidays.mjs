#!/usr/bin/env node
// Seed a small set of holidays. Idempotent: skips rows whose (date, name) pair
// already exists. Safe to re-run from the bootstrap script.

import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

// Curated demo set straddling current date (June 2026) and the rest of the
// year. branch_id = null → company-wide.
const HOLIDAYS = [
  { date: "2026-06-07", name: "Eid Al-Adha", type: "National" },
  { date: "2026-06-15", name: "Garhwali Diwas", type: "Regional" },
  { date: "2026-07-04", name: "Rath Yatra", type: "Optional" },
  { date: "2026-08-15", name: "Independence Day", type: "National" },
  { date: "2026-08-26", name: "Janmashtami", type: "Optional" },
  { date: "2026-10-02", name: "Gandhi Jayanti", type: "National" },
  { date: "2026-10-21", name: "Diwali", type: "National" },
  { date: "2026-12-25", name: "Christmas", type: "National" },
];

let inserted = 0;
let skipped = 0;

try {
  for (const h of HOLIDAYS) {
    const [existing] = await sql`
      SELECT id FROM holidays
      WHERE date = ${h.date} AND name = ${h.name}
      LIMIT 1
    `;
    if (existing) {
      skipped++;
      continue;
    }
    await sql`
      INSERT INTO holidays (date, name, type, branch_id)
      VALUES (${h.date}, ${h.name}, ${h.type}, NULL)
    `;
    inserted++;
  }
  console.log(`holidays seeded: inserted=${inserted}, skipped=${skipped}`);
} catch (e) {
  console.error(`holiday seed failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
