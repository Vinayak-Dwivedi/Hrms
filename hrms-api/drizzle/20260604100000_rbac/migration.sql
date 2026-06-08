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
