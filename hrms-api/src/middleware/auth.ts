import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import { verifyAccessToken } from "@/lib/jwt";
import { ApiError } from "./error";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1) httpOnly cookie (browser path)
  const cookie = req.cookies?.[env.ACCESS_COOKIE_NAME];
  if (typeof cookie === "string" && cookie.length > 0) return cookie;

  // 2) Authorization: Bearer <token> (non-browser clients — mobile, Postman, etc.)
  const authz = req.header("authorization") ?? req.header("Authorization");
  if (typeof authz === "string") {
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1]?.trim() ?? null;
  }
  return null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(new ApiError(401, "UNAUTHENTICATED", "Authentication is required."));
  }
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, "TOKEN_EXPIRED", "Access token has expired."));
    }
    return next(new ApiError(401, "TOKEN_INVALID", "Invalid access token."));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
  } catch {
    // ignore — leave req.user unset
  }
  next();
}

export function requireRole(allowed: readonly string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "UNAUTHENTICATED", "Authentication is required."));
    }
    if (!allowed.includes(req.user.role)) {
      return next(new ApiError(403, "FORBIDDEN", "Insufficient role."));
    }
    next();
  };
}
