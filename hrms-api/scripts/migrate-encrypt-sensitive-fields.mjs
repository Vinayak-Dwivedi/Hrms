/**
 * Encrypt existing plaintext sensitive employee fields.
 *
 * Run order:
 *   1. npm run db:migrate-sensitive-schema   (adds pan_no_hash etc.)
 *   2. Set ENCRYPTION_KEY and ENCRYPTION_INDEX_KEY in .env
 *   3. npm run migrate:encrypt-sensitive [-- --dry-run]
 *   4. Deploy API with encrypt-on-write enabled
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
} from "node:crypto";
import postgres from "postgres";

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {
    /* missing file is OK */
  }
}

loadDotEnv(resolve(process.cwd(), ".env"));
loadDotEnv(resolve(process.cwd(), ".env.local"));

const ENC_PREFIX = "enc:v1:";
const IV_LEN = 12;
const KEY_LEN = 32;
const ALGO = "aes-256-gcm";
const dryRun = process.argv.includes("--dry-run");

function decodeKeyMaterial(raw, label) {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error(`${label} is empty.`);
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const fromB64 = Buffer.from(trimmed, "base64");
    if (fromB64.length === KEY_LEN) return fromB64;
  } catch {
    /* fall through */
  }
  if (trimmed.length >= KEY_LEN) {
    return createHash("sha256").update(trimmed, "utf8").digest();
  }
  throw new Error(`${label} must decode to 32 bytes.`);
}

const encryptionKey = decodeKeyMaterial(
  process.env.ENCRYPTION_KEY ?? "",
  "ENCRYPTION_KEY",
);
const indexKey = decodeKeyMaterial(
  process.env.ENCRYPTION_INDEX_KEY ?? "",
  "ENCRYPTION_INDEX_KEY",
);

function isEncryptedValue(stored) {
  return typeof stored === "string" && stored.startsWith(ENC_PREFIX);
}

function computeHash(normalized) {
  return createHmac("sha256", indexKey)
    .update(normalized, "utf8")
    .digest("hex");
}

function encryptField(plain) {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const ciphertext = `${ENC_PREFIX}${iv.toString("base64url")}:${encrypted.toString("base64url")}:${tag.toString("base64url")}`;
  return { ciphertext, hash: computeHash(plain) };
}

function normalizePan(v) {
  return v.trim().toUpperCase().replace(/\s/g, "");
}
function normalizeAadhaar(v) {
  return v.replace(/\D/g, "");
}
function normalizeUan(v) {
  return v.replace(/\D/g, "");
}
function normalizeEsic(v) {
  return v.replace(/\D/g, "");
}
function normalizePassport(v) {
  return v.trim().toUpperCase();
}
function normalizeBankAccount(v) {
  return v.replace(/\s/g, "");
}

const EMPLOYEE_FIELDS = [
  { column: "pan_no", hashColumn: "pan_no_hash", normalize: normalizePan },
  {
    column: "aadhaar_no",
    hashColumn: "aadhaar_no_hash",
    normalize: normalizeAadhaar,
  },
  { column: "uan_no", hashColumn: "uan_no_hash", normalize: normalizeUan },
  { column: "esic_no", hashColumn: "esic_no_hash", normalize: normalizeEsic },
];

const IDENTITY_FIELDS = [
  {
    column: "pan_number",
    hashColumn: "pan_number_hash",
    normalize: normalizePan,
  },
  {
    column: "aadhaar_number",
    hashColumn: "aadhaar_number_hash",
    normalize: normalizeAadhaar,
  },
  {
    column: "passport_number",
    hashColumn: "passport_number_hash",
    normalize: normalizePassport,
  },
  {
    column: "uan_number",
    hashColumn: "uan_number_hash",
    normalize: normalizeUan,
  },
  {
    column: "esic_number",
    hashColumn: "esic_number_hash",
    normalize: normalizeEsic,
  },
];

const BANK_FIELDS = [
  {
    column: "account_number",
    hashColumn: "account_number_hash",
    normalize: normalizeBankAccount,
  },
];

async function migrateTable(sql, table, idColumn, fields) {
  const rows = await sql.unsafe(`SELECT * FROM ${table}`);
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const patch = {};
    let needsUpdate = false;

    for (const field of fields) {
      const raw = row[field.column];
      if (raw == null || raw === "") continue;
      if (isEncryptedValue(raw)) continue;
      const normalized = field.normalize(String(raw));
      const enc = encryptField(normalized);
      patch[field.column] = enc.ciphertext;
      patch[field.hashColumn] = enc.hash;
      needsUpdate = true;
    }

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${table} ${idColumn}=${row[idColumn]} would encrypt`);
      updated += 1;
      continue;
    }

    const sets = Object.keys(patch)
      .map((col, i) => `"${col}" = $${i + 2}`)
      .join(", ");
    const values = Object.values(patch);
    await sql.unsafe(
      `UPDATE ${table} SET ${sets} WHERE "${idColumn}" = $1`,
      [row[idColumn], ...values],
    );
    updated += 1;
  }

  return { updated, skipped, total: rows.length };
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function hasSensitiveHashColumns() {
  const [row] = await sql`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND column_name = 'pan_no_hash'
      ) AS employees_ready,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employee_identity_details'
          AND column_name = 'pan_number_hash'
      ) AS identity_ready,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employee_bank_details'
          AND column_name = 'account_number_hash'
      ) AS bank_ready
  `;
  return Boolean(
    row?.employees_ready && row?.identity_ready && row?.bank_ready,
  );
}

try {
  if (!(await hasSensitiveHashColumns())) {
    console.error(
      "Hash columns are missing. Run the schema migration first:\n" +
        "  npm run db:migrate-sensitive-schema\n" +
        "  # or: npm run db:migrate",
    );
    process.exit(1);
  }

  console.log(dryRun ? "Dry run — no writes." : "Encrypting plaintext sensitive fields…");

  const employees = await migrateTable(
    sql,
    "employees",
    "id",
    EMPLOYEE_FIELDS,
  );
  const identity = await migrateTable(
    sql,
    "employee_identity_details",
    "employee_id",
    IDENTITY_FIELDS,
  );
  const bank = await migrateTable(
    sql,
    "employee_bank_details",
    "id",
    BANK_FIELDS,
  );

  console.log("employees:", employees);
  console.log("employee_identity_details:", identity);
  console.log("employee_bank_details:", bank);
  console.log("Done.");
} finally {
  await sql.end({ timeout: 5 });
}
