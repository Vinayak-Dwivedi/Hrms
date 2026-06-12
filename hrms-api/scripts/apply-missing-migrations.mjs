import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(__dirname, "..", "drizzle");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("No DATABASE_URL");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

async function main() {
  try {
    const existing = await sql`SELECT name FROM drizzle.__drizzle_migrations`;
    const appliedSet = new Set(existing.map(r => r.name));
    
    const folders = readdirSync(DRIZZLE_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^\d+_/.test(e.name))
      .map((e) => e.name)
      .sort();

    for (const folder of folders) {
      if (appliedSet.has(folder)) continue;
      console.log(`Applying missing migration: ${folder}...`);
      const sqlPath = join(DRIZZLE_DIR, folder, "migration.sql");
      const raw = readFileSync(sqlPath, "utf8");
      const statements = raw.split(/-->\s*statement-breakpoint/g).map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
         try {
           await sql.unsafe(stmt);
         } catch(e) {
           console.error("Error in statement:", stmt);
           console.error(e.message);
         }
      }
      
      const createdAt = Number(folder.split('_')[0]);
      await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name, applied_at) VALUES ('manual', ${createdAt}, ${folder}, NOW())`.catch(e => console.error("Failed to insert log", e.message));
    }
    console.log("All missing migrations applied.");
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

main();
