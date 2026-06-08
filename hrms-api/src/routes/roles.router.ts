import { eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import { permissions, rolePermissions, roles } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const rolesRouter = Router();

const permissionIdsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()),
});

rolesRouter.get("/permission-map", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        roleId: rolePermissions.roleId,
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions);

    const map: Record<number, number[]> = {};
    for (const row of rows) {
      const list = map[row.roleId] ?? [];
      list.push(row.permissionId);
      map[row.roleId] = list;
    }

    res.json({ data: map });
  } catch (e) {
    next(e);
  }
});

rolesRouter.get("/:id/permissions", async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    if (!Number.isFinite(roleId)) {
      throw new ApiError(400, "INVALID_ID", "Invalid role id.");
    }

    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    const rows = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    res.json({ data: { permissionIds: rows.map((r) => r.permissionId) } });
  } catch (e) {
    next(e);
  }
});

rolesRouter.put("/:id/permissions", async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    if (!Number.isFinite(roleId)) {
      throw new ApiError(400, "INVALID_ID", "Invalid role id.");
    }

    const parsed = permissionIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid permissionIds.", parsed.error.flatten());
    }

    const uniqueIds = [...new Set(parsed.data.permissionIds)];

    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    if (uniqueIds.length > 0) {
      const existing = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, uniqueIds));
      if (existing.length !== uniqueIds.length) {
        throw new ApiError(400, "INVALID_PERMISSION", "One or more permission ids are invalid.");
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (uniqueIds.length > 0) {
        await tx.insert(rolePermissions).values(
          uniqueIds.map((permissionId) => ({ roleId, permissionId })),
        );
      }
      await tx
        .update(roles)
        .set({ updatedAt: sql`now()` })
        .where(eq(roles.id, roleId));
    });

    res.json({ data: { permissionIds: uniqueIds } });
  } catch (e) {
    next(e);
  }
});
