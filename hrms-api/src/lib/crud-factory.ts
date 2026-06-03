import { getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { Router } from "express";
import { db } from "@/db/runtime";
import { ApiError } from "@/middleware/error";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function pickColumns(
  body: Record<string, unknown>,
  allowed: Set<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

function bigintSafe<T>(row: T): T {
  if (row === null || typeof row !== "object") return row;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[k] = typeof v === "bigint" ? v.toString() : v;
  }
  return out as T;
}

function clampInt(raw: unknown, fallback: number, max?: number): number {
  const n = Number(typeof raw === "string" ? raw : fallback);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return max ? Math.min(n, max) : n;
}

export function createCrudRouter(tableName: string, table: PgTable): Router {
  const cols = getTableColumns(table);
  const colNames = new Set(Object.keys(cols));
  const idCol = (cols as Record<string, unknown>).id as
    | { name: string }
    | undefined;

  if (!idCol) {
    throw new Error(`createCrudRouter: table '${tableName}' has no 'id' column`);
  }

  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const limit = clampInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = clampInt(req.query.offset, 0);
      const rows = await db.select().from(table).limit(limit).offset(offset);
      res.json({
        data: rows.map(bigintSafe),
        limit,
        offset,
        count: rows.length,
      });
    } catch (e) {
      next(e);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const [row] = await db
        .select()
        .from(table)
        .where(sql`${sql.identifier(idCol.name)} = ${id}`)
        .limit(1);
      if (!row) {
        throw new ApiError(404, "NOT_FOUND", `${tableName} not found.`);
      }
      res.json({ data: bigintSafe(row) });
    } catch (e) {
      next(e);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError(400, "INVALID_BODY", "Expected a JSON object body.");
      }
      const values = pickColumns(body as Record<string, unknown>, colNames);
      if (Object.keys(values).length === 0) {
        throw new ApiError(400, "EMPTY_BODY", "Body contains no recognised columns.");
      }
      try {
        const [row] = await db
          .insert(table)
          .values(values as never)
          .returning();
        res.status(201).json({ data: bigintSafe(row) });
      } catch (e) {
        throw new ApiError(400, "INSERT_FAILED", (e as Error).message);
      }
    } catch (e) {
      next(e);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError(400, "INVALID_BODY", "Expected a JSON object body.");
      }
      const values = pickColumns(body as Record<string, unknown>, colNames);
      delete values.id;
      if (Object.keys(values).length === 0) {
        throw new ApiError(400, "EMPTY_BODY", "Body contains no updatable columns.");
      }
      try {
        const [row] = await db
          .update(table)
          .set(values as never)
          .where(sql`${sql.identifier(idCol.name)} = ${id}`)
          .returning();
        if (!row) {
          throw new ApiError(404, "NOT_FOUND", `${tableName} not found.`);
        }
        res.json({ data: bigintSafe(row) });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(400, "UPDATE_FAILED", (e as Error).message);
      }
    } catch (e) {
      next(e);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const [row] = await db
        .delete(table)
        .where(sql`${sql.identifier(idCol.name)} = ${id}`)
        .returning();
      if (!row) {
        throw new ApiError(404, "NOT_FOUND", `${tableName} not found.`);
      }
      res.json({ deleted: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
