import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { permissions, rolePermissions, roles } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

const CACHE_TTL_MS = 5 * 60 * 1000;
const permissionCache = new Map<
  string,
  { codes: Set<string>; expiresAt: number }
>();

/** Mirrors scripts/seed-rbac.mjs — used when RBAC tables are empty or not migrated yet. */
const JWT_ROLE_DEFAULT_PERMISSIONS: Record<string, readonly string[]> = {
  manager: [
    "employees.view",
    "leave.view",
    "leave.approve",
    "attendance.view",
    "payroll.view",
    "onboarding.view",
    "onboarding.verify_documents",
  ],
  employee: [
    "employees.view",
    "leave.view",
    "attendance.view",
    "payroll.view",
  ],
  user: [
    "employees.view",
    "leave.view",
    "attendance.view",
    "payroll.view",
  ],
  hr: [
    "employees.view",
    "employees.create",
    "employees.edit",
    "leave.view",
    "attendance.view",
    "attendance.upload",
    "onboarding.view",
    "onboarding.manage",
    "onboarding.verify_documents",
    "onboarding.resend_invitation",
  ],
};

export function authRoleToRbacCode(jwtRole: string): string {
  if (jwtRole === "admin") return "admin";
  if (jwtRole === "manager") return "manager";
  if (jwtRole === "hr") return "hr";
  if (jwtRole === "user") return "employee";
  return "employee";
}

export function defaultPermissionCodesForJwtRole(jwtRole: string): string[] {
  return [...defaultPermissionsForJwtRole(jwtRole)];
}

function defaultPermissionsForJwtRole(jwtRole: string): Set<string> {
  if (jwtRole === "manager") {
    return new Set(JWT_ROLE_DEFAULT_PERMISSIONS.manager);
  }
  if (jwtRole === "hr") {
    return new Set(JWT_ROLE_DEFAULT_PERMISSIONS.hr);
  }
  if (jwtRole === "user") {
    return new Set(JWT_ROLE_DEFAULT_PERMISSIONS.user);
  }
  return new Set(JWT_ROLE_DEFAULT_PERMISSIONS.employee);
}

async function loadPermissionsForJwtRole(jwtRole: string): Promise<Set<string>> {
  const cached = permissionCache.get(jwtRole);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.codes;
  }

  try {
    const rbacCode = authRoleToRbacCode(jwtRole);
    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, rbacCode))
      .limit(1);

    if (!role) {
      const fallback = defaultPermissionsForJwtRole(jwtRole);
      permissionCache.set(jwtRole, {
        codes: fallback,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return fallback;
    }

    const rows = await db
      .select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, role.id));

    const codes =
      rows.length > 0
        ? new Set(rows.map((r) => r.code))
        : defaultPermissionsForJwtRole(jwtRole);
    permissionCache.set(jwtRole, { codes, expiresAt: Date.now() + CACHE_TTL_MS });
    return codes;
  } catch {
    const fallback = defaultPermissionsForJwtRole(jwtRole);
    permissionCache.set(jwtRole, {
      codes: fallback,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return fallback;
  }
}

export function requirePermission(...required: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(
          new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
        );
      }

      if (req.user.role === "admin") {
        return next();
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
