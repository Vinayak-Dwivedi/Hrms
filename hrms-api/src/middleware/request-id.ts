import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId() {
  return function (req: Request, res: Response, next: NextFunction) {
    const incoming = req.header("x-request-id");
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.requestId = id;
    res.setHeader("x-request-id", id);
    next();
  };
}
