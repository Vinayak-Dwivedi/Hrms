import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { env } from "@/env";
import { extractDbErrorMessage, extractPostgresError, mapDbErrorToApiError } from "@/lib/db-error";

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

  const pg = extractPostgresError(err);

  if (pg?.code === "22P02") {
    const pgMessage = extractDbErrorMessage(err);
    if (/marital_status_enum/i.test(pgMessage)) {
      res.status(400).json({
        error: {
          code: "SCHEMA_NOT_READY",
          message:
            "The selected marital status is not supported by the database yet. Run: npm run db:migrate-marital-status",
          requestId: req.requestId,
        },
      });
      return;
    }
  }

  if (pg?.code === "23505") {
    const apiErr = mapDbErrorToApiError(err);
    res.status(apiErr.status).json({
      error: {
        code: apiErr.code,
        message: apiErr.message,
        requestId: req.requestId,
      },
    });
    return;
  }

  if (pg?.code === "22001") {
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

  if (pg?.code === "23514" && /doc_verified_at_requires_by/i.test(extractDbErrorMessage(err))) {
    res.status(400).json({
      error: {
        code: "INVALID_DOCUMENT_VERIFICATION",
        message:
          "Document could not be marked verified without a reviewer. Upload again or verify manually.",
        requestId: req.requestId,
      },
    });
    return;
  }

  if (
    pg?.code === "42703" &&
    /employee_documents.*rejected_|rejected_by|rejection_reason/i.test(
      extractDbErrorMessage(err),
    )
  ) {
    res.status(503).json({
      error: {
        code: "SCHEMA_NOT_READY",
        message:
          "Document rejection columns are missing. Run: npm run db:migrate-onboarding-pending",
        requestId: req.requestId,
      },
    });
    return;
  }

  if (pg?.code === "42703" && /onboarding_bank_approved/i.test(extractDbErrorMessage(err))) {
    res.status(503).json({
      error: {
        code: "SCHEMA_NOT_READY",
        message:
          "Database schema is missing onboarding bank approval columns. Run: npm run db:migrate-onboarding-bank-approval",
        requestId: req.requestId,
      },
    });
    return;
  }

  if (pg?.code === "42P01") {
    const pgMessage = extractDbErrorMessage(err);
    const isOrgHierarchy = /org_hierarchy/i.test(pgMessage);
    const isAttendance = /attendance_uploads|attendance\b/i.test(pgMessage);
    res.status(503).json({
      error: {
        code: "SCHEMA_NOT_READY",
        message: isOrgHierarchy
          ? "Org hierarchy tables are missing. Run: npm run db:migrate-org-hierarchy"
          : isAttendance
            ? "Attendance upload tables are missing. Run: npm run db:migrate-attendance-upload"
            : "Required database tables are missing. Contact your administrator.",
        requestId: req.requestId,
        ...(env.NODE_ENV !== "production"
          ? { details: { postgresMessage: pgMessage } }
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
