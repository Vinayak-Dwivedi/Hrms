import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import { accounts, users } from "@/db/schema";
import {
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from "@/lib/cookies";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { requireAuth } from "@/middleware/auth";
import { ApiError } from "@/middleware/error";

export const authRouter: Router = Router();

const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(256),
  })
  .strict();

function shapeUser(u: { id: string; email: string; name: string; role: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

async function lookupUserWithCredential(email: string) {
  const [row] = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      password: accounts.password,
    })
    .from(users)
    .innerJoin(
      accounts,
      eq(accounts.userId, users.id),
    )
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (!row) return null;
  if (row.password === null) return null;
  return row;
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const row = await lookupUserWithCredential(body.email);
    // Constant message to avoid user enumeration.
    if (!row) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    const ok = await verifyPassword(body.password, row.password!);
    if (!ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");

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
    const rt =
      req.cookies?.[process.env.REFRESH_COOKIE_NAME ?? "hrms_rt"] ??
      // also accept Bearer for non-browser flows
      (req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null);

    if (!rt) {
      throw new ApiError(401, "NO_REFRESH_TOKEN", "Refresh token missing.");
    }

    let claims;
    try {
      claims = verifyRefreshToken(rt);
    } catch {
      throw new ApiError(401, "REFRESH_INVALID", "Refresh token invalid or expired.");
    }

    const [u] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);

    if (!u) throw new ApiError(401, "USER_NOT_FOUND", "User no longer exists.");

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
authRouter.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  res.status(204).end();
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [u] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!u) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
    res.json({ user: shapeUser(u) });
  } catch (e) {
    next(e);
  }
});
