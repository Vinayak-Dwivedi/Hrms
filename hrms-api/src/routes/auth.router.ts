import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { env } from "@/env";
import { db } from "@/db/runtime";
import { users } from "@/db/schema";
import {
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from "@/lib/cookies";
import {
  lookupCredentialWithLoginId,
  normalizeEmailLoginId,
  PERSONAL_EMAIL_LOGIN_CODE,
} from "@/lib/auth-credentials";
import {
  ACCOUNT_INACTIVE_CODE,
  assertEmployeeMayAuthenticate,
} from "@/lib/employee-auth";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { isJtiRevoked, revokeJti } from "@/lib/redis";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { requireAuth } from "@/middleware/auth";
import { ApiError } from "@/middleware/error";
import { getPermissionsForJwtRole } from "@/middleware/require-permission";

export const authRouter: Router = Router();

const loginSchema = z
  .object({
    loginId: z.string().trim().min(1).max(256).optional(),
    email: z.string().trim().min(1).max(256).optional(),
    password: z.string().min(1).max(256),
  })
  .strict()
  .refine((body) => !!(body.loginId ?? body.email), {
    message: "Login ID is required.",
  })
  .transform((body) => ({
    loginId: (body.loginId ?? body.email)!,
    password: body.password,
  }));

function shapeUser(u: { id: string; email: string; name: string; role: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

function refreshTokenFromRequest(req: import("express").Request): string | null {
  const cookie = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (typeof cookie === "string" && cookie.length > 0) return cookie;
  const authz = req.header("authorization") ?? req.header("Authorization");
  if (typeof authz === "string") {
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1]?.trim() ?? null;
  }
  return null;
}

function ttlFromExp(exp: number | undefined): number {
  if (!exp) return 0;
  return Math.max(0, exp - Math.floor(Date.now() / 1000));
}

function loginFailureEntityId(loginId: string): string {
  return loginId.includes("@")
    ? normalizeEmailLoginId(loginId)
    : loginId.trim().toLowerCase();
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    let row;
    try {
      row = await lookupCredentialWithLoginId(body.loginId);
    } catch (e) {
      if (e instanceof ApiError && e.code === PERSONAL_EMAIL_LOGIN_CODE) {
        writeAuditLogAsync(
          {
            action: "LOGIN_FAILURE",
            entityType: "auth",
            entityId: loginFailureEntityId(body.loginId),
          },
          req.auditContext,
        );
      }
      throw e;
    }

    // Constant message to avoid user enumeration.
    if (!row) {
      writeAuditLogAsync(
        {
          action: "LOGIN_FAILURE",
          entityType: "auth",
          entityId: loginFailureEntityId(body.loginId),
        },
        req.auditContext,
      );
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Login ID or password is incorrect.",
      );
    }
    const ok = await verifyPassword(body.password, row.password);
    if (!ok) {
      writeAuditLogAsync(
        {
          actorUserId: row.userId,
          action: "LOGIN_FAILURE",
          entityType: "auth",
          entityId: row.userId,
        },
        req.auditContext,
      );
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Login ID or password is incorrect.",
      );
    }

    try {
      await assertEmployeeMayAuthenticate(row.userId);
    } catch (e) {
      if (e instanceof ApiError && e.code === ACCOUNT_INACTIVE_CODE) {
        writeAuditLogAsync(
          {
            actorUserId: row.userId,
            action: "LOGIN_FAILURE",
            entityType: "auth",
            entityId: row.userId,
          },
          req.auditContext,
        );
      }
      throw e;
    }

    writeAuditLogAsync(
      {
        actorUserId: row.userId,
        action: "LOGIN_SUCCESS",
        entityType: "auth",
        entityId: row.userId,
      },
      req.auditContext,
    );

    const access = signAccessToken({ sub: row.userId, email: row.email, role: row.role });
    const { token: refresh } = signRefreshToken({ sub: row.userId });

    setAccessCookie(res, access);
    setRefreshCookie(res, refresh);

    res.json({
      user: shapeUser({ id: row.userId, email: row.email, name: row.name, role: row.role }),
      // For non-browser clients that prefer Authorization: Bearer.
      // Browser clients can ignore this and rely on cookies.
      accessToken: access,
    });
  } catch (e) {
    next(e);
  }
});

// ── POST /api/auth/refresh ──────────────────────────────────────────────────
authRouter.post("/refresh", async (req, res, next) => {
  try {
    const rt = refreshTokenFromRequest(req);
    if (!rt) {
      throw new ApiError(401, "NO_REFRESH_TOKEN", "Refresh token missing.");
    }

    let claims;
    try {
      claims = verifyRefreshToken(rt);
    } catch {
      throw new ApiError(401, "REFRESH_INVALID", "Refresh token invalid or expired.");
    }

    // Rotation: a revoked refresh token must not be exchangeable for a new
    // one. Without this check, a leaked refresh token stays usable until its
    // 7-day expiry. With Redis, /logout puts the jti on the denylist.
    if (await isJtiRevoked(claims.jti)) {
      throw new ApiError(401, "REFRESH_REVOKED", "Refresh token has been revoked.");
    }

    const [u] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);

    if (!u) throw new ApiError(401, "USER_NOT_FOUND", "User no longer exists.");

    await assertEmployeeMayAuthenticate(u.id);

    // Revoke the just-used refresh jti so this exact token can't be replayed.
    await revokeJti(claims.jti, ttlFromExp(claims.exp));

    const access = signAccessToken({ sub: u.id, email: u.email, role: u.role });
    const { token: newRefresh } = signRefreshToken({ sub: u.id });
    setAccessCookie(res, access);
    setRefreshCookie(res, newRefresh);
    res.json({ user: shapeUser(u), accessToken: access });
  } catch (e) {
    next(e);
  }
});

// ── POST /api/auth/logout ───────────────────────────────────────────────────
authRouter.post("/logout", async (req, res, next) => {
  try {
    const rt = refreshTokenFromRequest(req);
    if (rt) {
      // Best-effort: parse the refresh token and put its jti on the denylist
      // so the same cookie can't be reused after the user has signed out.
      // Invalid/expired tokens are silently ignored — there's nothing to revoke.
      try {
        const claims = verifyRefreshToken(rt);
        await revokeJti(claims.jti, ttlFromExp(claims.exp));
      } catch {
        /* ignore */
      }
    }
    clearAuthCookies(res);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    await assertEmployeeMayAuthenticate(req.user!.id);
    const [u] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!u) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
    const permissions = await getPermissionsForJwtRole(u.role);
    res.json({ user: shapeUser(u), permissions });
  } catch (e) {
    next(e);
  }
});
