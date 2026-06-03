import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";

function createClient() {
  const client = postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });
  return drizzle({ client });
}

const g = globalThis as typeof globalThis & {
  __hrmsDb__?: ReturnType<typeof createClient>;
};

export const db = g.__hrmsDb__ ?? createClient();

if (env.NODE_ENV !== "production") {
  g.__hrmsDb__ = db;
}

export type Db = typeof db;
