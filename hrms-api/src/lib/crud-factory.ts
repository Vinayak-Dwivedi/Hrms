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

export type CrudRouterOptions = {
  /** Column keys omitted from API responses and rejected on write */
  excludedColumns?: string[];
};

function omitColumns<T extends Record<string, unknown>>(
  row: T,
  excluded: Set<string>,
): T {
  if (excluded.size === 0) return row;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!excluded.has(k)) out[k] = v;
  }
  return out as T;
}

/** Drizzle select/returning shape omitting columns absent from legacy DBs. */
function buildSelectShape(table: PgTable, excluded: Set<string>) {
  const cols = getTableColumns(table);
  const shape: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(cols)) {
    if (!excluded.has(key)) {
      shape[key] = col;
    }
  }
  return shape;
}

export function createCrudRouter(
  tableName: string,
  table: PgTable,
  options?: CrudRouterOptions,
): Router {
  const cols = getTableColumns(table);
  const colNames = new Set(Object.keys(cols));
  const excluded = new Set(options?.excludedColumns ?? []);
  const writable = new Set([...colNames].filter((k) => !excluded.has(k)));
  const idCol = (cols as Record<string, unknown>).id as
    | { name: string }
    | undefined;

  if (!idCol) {
    throw new Error(`createCrudRouter: table '${tableName}' has no 'id' column`);
  }

  const router = Router();
  const selectShape = buildSelectShape(table, excluded);

  router.get("/", async (req, res, next) => {
    try {
      const limit = clampInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = clampInt(req.query.offset, 0);
      const rows = await db
        .select(selectShape as never)
        .from(table)
        .limit(limit)
        .offset(offset);
      res.json({
        data: rows.map((row) => omitColumns(bigintSafe(row), excluded)),
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
        .select(selectShape as never)
        .from(table)
        .where(sql`${sql.identifier(idCol.name)} = ${id}`)
        .limit(1);
      if (!row) {
        throw new ApiError(404, "NOT_FOUND", `${tableName} not found.`);
      }
      res.json({ data: omitColumns(bigintSafe(row), excluded) });
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
      const values = pickColumns(body as Record<string, unknown>, writable);
      if (Object.keys(values).length === 0) {
        throw new ApiError(400, "EMPTY_BODY", "Body contains no recognised columns.");
      }
      try {
        // Drizzle types the result as `never[]` when selectShape is dynamic;
        // cast to a permissive row type so destructuring works.
        const rows = (await db
          .insert(table)
          .values(values as never)
          .returning(selectShape as never)) as Array<Record<string, unknown>>;
        const row = rows[0];
        if (!row) {
          throw new ApiError(500, "INSERT_NO_ROW", "Insert returned no row.");
        }
        res.status(201).json({ data: omitColumns(bigintSafe(row), excluded) });
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
      const values = pickColumns(body as Record<string, unknown>, writable);
      delete values.id;
      if (Object.keys(values).length === 0) {
        throw new ApiError(400, "EMPTY_BODY", "Body contains no updatable columns.");
      }
      try {
        const rows = (await db
          .update(table)
          .set(values as never)
          .where(sql`${sql.identifier(idCol.name)} = ${id}`)
          .returning(selectShape as never)) as Array<Record<string, unknown>>;
        const [row] = rows;
        if (!row) {
          throw new ApiError(404, "NOT_FOUND", `${tableName} not found.`);
        }
        res.json({ data: omitColumns(bigintSafe(row), excluded) });
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
      let rows: Array<Record<string, unknown>>;
      try {
        rows = (await db
          .delete(table)
          .where(sql`${sql.identifier(idCol.name)} = ${id}`)
          .returning(selectShape as never)) as Array<Record<string, unknown>>;
      } catch (e) {
        // Foreign-key violation — the row is still referenced elsewhere.
        const err = e as {
          code?: string;
          message?: string;
          cause?: { code?: string; message?: string };
        };
        const code = err?.code ?? err?.cause?.code;
        const msg = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
        if (code === "23503" || /foreign key/i.test(msg)) {
          throw new ApiError(
            409,
            "IN_USE",
            `This ${tableName} is still in use (it has linked records) and can't be deleted. Remove or reassign those first.`,
          );
        }
        throw e;
      }
      const [row] = rows;
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
