import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { permissions, rolePermissions, roles } from "@/db/schema/hrms";
import { authRoleToRbacCode } from "@/lib/auth-role";
import { ApiError } from "@/middleware/error";

export { authRoleToRbacCode };

const CACHE_TTL_MS = 5 * 60 * 1000;
const permissionCache = new Map<
  string,
  { codes: Set<string>; expiresAt: number }
>();

async function loadPermissionsForJwtRole(jwtRole: string): Promise<Set<string>> {
  const cached = permissionCache.get(jwtRole);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.codes;
  }

  const rbacCode = authRoleToRbacCode(jwtRole);
  const empty = new Set<string>();

  try {
    if (rbacCode === "master") {
      const rows = await db
        .select({ code: permissions.code })
        .from(permissions)
        .where(eq(permissions.isActive, true));
      const codes = new Set(rows.map((r) => r.code));
      permissionCache.set(jwtRole, { codes, expiresAt: Date.now() + CACHE_TTL_MS });
      return codes;
    }

    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, rbacCode))
      .limit(1);

    if (!role) {
      permissionCache.set(jwtRole, {
        codes: empty,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return empty;
    }

    const rows = await db
      .select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, role.id));

    const codes = new Set(rows.map((r) => r.code));
    permissionCache.set(jwtRole, { codes, expiresAt: Date.now() + CACHE_TTL_MS });
    return codes;
  } catch {
    permissionCache.set(jwtRole, {
      codes: empty,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return empty;
  }
}

export async function userHasAnyPermission(
  jwtRole: string,
  required: string[],
): Promise<boolean> {
  const codes = await loadPermissionsForJwtRole(jwtRole);
  return required.some((p) => codes.has(p));
}

export function requirePermission(...required: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(
          new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
        );
      }

      const codes = await loadPermissionsForJwtRole(req.user.role);
      const ok = required.some((p) => codes.has(p));
      if (!ok) {
        return next(
          new ApiError(403, "FORBIDDEN", "Insufficient permissions."),
        );
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function clearPermissionCache(): void {
  permissionCache.clear();
}

/** Resolved permission codes for a JWT auth role (used by /api/auth/me). */
export async function getPermissionsForJwtRole(jwtRole: string): Promise<string[]> {
  const codes = await loadPermissionsForJwtRole(jwtRole);
  return [...codes];
}
