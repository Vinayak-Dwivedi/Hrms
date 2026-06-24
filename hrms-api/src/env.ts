import "dotenv/config";
import { z } from "zod";
import { initSensitiveFieldCrypto } from "@/lib/sensitive-field-crypto";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),

  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),

  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1_048_576),

  JWT_ACCESS_SECRET: z.string().min(32, "must be ≥32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "must be ≥32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((s) => s.toLowerCase() === "true"),
  COOKIE_DOMAIN: z.string().optional(),
  ACCESS_COOKIE_NAME: z.string().default("hrms_at"),
  REFRESH_COOKIE_NAME: z.string().default("hrms_rt"),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // Optional. If set, the API uses Redis for refresh-token revocation +
  // shared rate-limit state. If unset (typical for local dev on Windows),
  // both features degrade: revocation is a no-op, rate-limit uses in-memory.
  REDIS_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),

  ONBOARDING_BASE_URL: z
    .string()
    .default("http://localhost:3000/employee/onboarding"),
  ONBOARDING_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),

  COMPANY_NAME: z
    .string()
    .default("iLeads Auxiliary Services PVT LTD"),
  LOGIN_BASE_URL: z
    .string()
    .optional()
    .transform((v) =>
      v && v.trim().length > 0 ? v.trim().replace(/\/$/, "") : undefined,
    ),
  COMPANY_WEBSITE: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  COMPANY_SUPPORT_EMAIL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  COMPANY_SUPPORT_PHONE: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),

  SMTP_HOST: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((s) => s.toLowerCase() === "true"),
  SMTP_USER: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  SMTP_PASS: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  SMTP_FROM: z.string().default("HRMS <noreply@company.com>"),

  TWILIO_ACCOUNT_SID: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  TWILIO_AUTH_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  TWILIO_FROM_NUMBER: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),

  // ── AWS S3 ────────────────────────────────────────────────────────────────
  AWS_ACCESS_KEY_ID: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  AWS_SECRET_ACCESS_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  AWS_S3_BUCKET: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  AWS_REGION: z.string().default("ap-south-1"),

  UPLOAD_DIR: z.string().default("./uploads"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default("application/pdf,image/jpeg,image/png,image/jpg")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    ),
  VIRUS_SCAN_ENABLED: z
    .string()
    .default("false")
    .transform((s) => s.toLowerCase() === "true"),
  ENABLE_SWAGGER: z
    .string()
    .default("")
    .transform((s) => s.toLowerCase() === "true"),

  ENCRYPTION_KEY: z.string().optional(),
  ENCRYPTION_INDEX_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof schema>;

const TEST_CRYPTO_KEYS = {
  encryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  indexKey: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
};

function resolveCryptoKeys() {
  if (env.ENCRYPTION_KEY && env.ENCRYPTION_INDEX_KEY) {
    return {
      encryptionKey: env.ENCRYPTION_KEY,
      indexKey: env.ENCRYPTION_INDEX_KEY,
    };
  }
  if (env.NODE_ENV === "production") {
    console.error(
      "Invalid environment:\n  ENCRYPTION_KEY and ENCRYPTION_INDEX_KEY are required in production.",
    );
    process.exit(1);
  }
  if (env.NODE_ENV === "test") {
    return {
      encryptionKey: env.ENCRYPTION_KEY ?? TEST_CRYPTO_KEYS.encryptionKey,
      indexKey: env.ENCRYPTION_INDEX_KEY ?? TEST_CRYPTO_KEYS.indexKey,
    };
  }
  console.warn(
    "[hrms-api] ENCRYPTION_KEY / ENCRYPTION_INDEX_KEY not set — using development defaults. Set both before production.",
  );
  return {
    encryptionKey: "dev-local-encryption-key-32-chars-min!!",
    indexKey: "dev-local-index-key-32-chars-min!!!!!",
  };
}


initSensitiveFieldCrypto(resolveCryptoKeys());
