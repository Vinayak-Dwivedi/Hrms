-- Org Setup → Location registry (HR portal). Standalone from branches.
CREATE TABLE IF NOT EXISTS "locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" varchar(20) NOT NULL,
  "address" text,
  "city" varchar(120) NOT NULL,
  "state" varchar(120) NOT NULL,
  "country" varchar(120) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "locations_code_unique" UNIQUE ("code")
);
--> statement-breakpoint
-- Defensive backfill: if the locations table was created elsewhere without
-- the address column (e.g. an older copy of this migration), add it. No-op
-- on the path above.
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "address" text;
