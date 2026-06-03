import type { CookieOptions, Response } from "express";
import { env } from "@/env";

function parseTtlToMs(ttl: string): number {
  // Accepts "15m", "7d", "1h", "30s", or a number-of-seconds.
  const m = ttl.match(/^(\d+)\s*([smhd])$/i);
  if (!m) {
    const n = Number(ttl);
    if (Number.isFinite(n)) return n * 1000;
    throw new Error(`Bad TTL: ${ttl}`);
  }
  const value = Number(m[1]);
  const unit = (m[2] ?? "s").toLowerCase();
  const mult =
    unit === "s" ? 1_000 :
    unit === "m" ? 60_000 :
    unit === "h" ? 3_600_000 :
                   86_400_000;
  return value * mult;
}

const baseCookie: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setAccessCookie(res: Response, token: string) {
  res.cookie(env.ACCESS_COOKIE_NAME, token, {
    ...baseCookie,
    maxAge: parseTtlToMs(env.JWT_ACCESS_TTL),
  });
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    ...baseCookie,
    maxAge: parseTtlToMs(env.JWT_REFRESH_TTL),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(env.ACCESS_COOKIE_NAME, { ...baseCookie, maxAge: 0 });
  res.clearCookie(env.REFRESH_COOKIE_NAME, { ...baseCookie, maxAge: 0 });
}
