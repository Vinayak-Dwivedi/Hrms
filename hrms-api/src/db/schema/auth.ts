import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Minimum auth schema. Matches the column names of the legacy Better Auth
 * tables so existing rows survive — but we only use a subset, and the
 * `accounts.password` column will hold bcrypt hashes after seed-users.mjs runs.
 */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("user"),
    userTypeId: integer("user_type_id").notNull().default(4),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_uidx").on(t.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("accounts_user_provider_uidx").on(t.userId, t.providerId)],
);

export const emailVerificationOtps = pgTable(
  "email_verification_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetEmail: text("target_email").notNull(),
    otpHash: text("otp_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isUsed: boolean("is_used").notNull().default(false),
    attemptCount: smallint("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("email_verification_otps_user_created_idx").on(t.userId, t.createdAt),
    index("email_verification_otps_active_idx").on(t.userId, t.isUsed, t.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type EmailVerificationOtp = typeof emailVerificationOtps.$inferSelect;
export type NewEmailVerificationOtp = typeof emailVerificationOtps.$inferInsert;

export const phoneVerificationOtps = pgTable(
  "phone_verification_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetPhone: varchar("target_phone", { length: 20 }).notNull(),
    otpHash: text("otp_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isUsed: boolean("is_used").notNull().default(false),
    attemptCount: smallint("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("phone_verification_otps_user_created_idx").on(t.userId, t.createdAt),
    index("phone_verification_otps_active_idx").on(t.userId, t.isUsed, t.expiresAt),
  ],
);

export type PhoneVerificationOtp = typeof phoneVerificationOtps.$inferSelect;
export type NewPhoneVerificationOtp = typeof phoneVerificationOtps.$inferInsert;
