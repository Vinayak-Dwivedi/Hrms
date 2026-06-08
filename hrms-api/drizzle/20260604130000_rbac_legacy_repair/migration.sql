-- Replace legacy permissions/roles tables (e.g. from user_type_permissions FK)
-- when they lack the HRMS RBAC columns expected by the app.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'permissions'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'permissions'
      AND column_name = 'code'
  ) THEN
    DROP TABLE IF EXISTS role_permissions CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE permissions CASCADE;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "module" varchar(50) NOT NULL,
  "description" varchar(255),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_permissions_module" ON "permissions"("module");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "description" varchar(255),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" integer NOT NULL,
  "permission_id" integer NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id"),
  CONSTRAINT "role_permissions_role_id_fk"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade,
  CONSTRAINT "role_permissions_permission_id_fk"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "middle_name" varchar(100);
