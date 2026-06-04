-- Org Setup → Location registry (HR portal). Standalone from branches.
CREATE TABLE IF NOT EXISTS "locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" varchar(20) NOT NULL,
  "city" varchar(120) NOT NULL,
  "state" varchar(120) NOT NULL,
  "country" varchar(120) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "locations_code_unique" UNIQUE ("code")
);
