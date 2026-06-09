import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { env } from "@/env";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
      requestId: req.requestId,
    },
  });
}

// Final error sink — must take 4 args so Express recognises it as an error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.requestId,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        requestId: req.requestId,
        details: err.issues,
      },
    });
    return;
  }

  const pgCode =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : null;

  if (pgCode === "23505") {
    res.status(409).json({
      error: {
        code: "DUPLICATE_VALUE",
        message:
          "A record with the same PAN, Aadhaar, UAN, ESIC, or bank account already exists.",
        requestId: req.requestId,
      },
    });
    return;
  }

  if (pgCode === "22001") {
    res.status(500).json({
      error: {
        code: "SCHEMA_NOT_READY",
        message:
          "Database schema is not ready for encrypted sensitive fields. Run: npm run db:migrate-sensitive-schema",
        requestId: req.requestId,
        ...(env.NODE_ENV !== "production" && err instanceof Error
          ? { details: { name: err.name, message: err.message } }
          : {}),
      },
    });
    return;
  }

  // Unknown — log full detail server-side, return generic 500 client-side.
  console.error(`[err] requestId=${req.requestId}`, err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: req.requestId,
      ...(env.NODE_ENV !== "production" && err instanceof Error
        ? { details: { name: err.name, message: err.message, stack: err.stack } }
        : {}),
    },
  });
}
