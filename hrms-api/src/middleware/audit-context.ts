import type { NextFunction, Request, Response } from "express";

export type AuditContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

export function auditContext(req: Request, _res: Response, next: NextFunction) {
  const forwarded = req.header("x-forwarded-for");
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ??
    req.socket.remoteAddress ??
    null;
  req.auditContext = {
    ipAddress: ip,
    userAgent: req.header("user-agent") ?? null,
  };
  next();
}
