import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "@/env";

export interface AccessClaims {
  sub: string;        // user.id
  email: string;
  role: string;
  type: "access";
}

export interface RefreshClaims {
  sub: string;        // user.id
  jti: string;        // unique id (for future revocation list)
  type: "refresh";
}

export function signAccessToken(payload: Omit<AccessClaims, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: Omit<RefreshClaims, "type" | "jti">) {
  const jti = randomUUID();
  const token = jwt.sign({ ...payload, jti, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"],
  });
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessClaims {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload & AccessClaims;
  if (payload.type !== "access") {
    throw new jwt.JsonWebTokenError("wrong token type");
  }
  return payload;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload & RefreshClaims;
  if (payload.type !== "refresh") {
    throw new jwt.JsonWebTokenError("wrong token type");
  }
  return payload;
}
