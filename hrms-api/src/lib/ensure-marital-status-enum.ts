import postgres from "postgres";
import { env } from "@/env";

const REQUIRED_VALUES = [
  "Divorced",
  "Widowed",
  "Separated",
  "Prefer Not to Say",
] as const;

let ensured = false;

/** Idempotent: extend marital_status_enum when DB predates the UI options. */
export async function ensureMaritalStatusEnum(): Promise<void> {
  if (ensured) return;

  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    const rows = await sql<{ enumlabel: string }[]>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'marital_status_enum'
    `;
    const existing = new Set(rows.map((row) => row.enumlabel));

    for (const value of REQUIRED_VALUES) {
      if (existing.has(value)) continue;
      await sql.unsafe(
        `ALTER TYPE "marital_status_enum" ADD VALUE '${value.replace(/'/g, "''")}'`,
      );
      existing.add(value);
      console.log(`[schema] marital_status_enum + '${value}'`);
    }
    ensured = true;
  } catch (e) {
    console.error("[schema] ensureMaritalStatusEnum failed:", e);
    throw e;
  } finally {
    await sql.end();
  }
}
