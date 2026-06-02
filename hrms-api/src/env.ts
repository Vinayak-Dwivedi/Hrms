import "dotenv/config";
import { z } from "zod";

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
