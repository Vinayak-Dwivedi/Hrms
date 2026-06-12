import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { RedisStore } from "rate-limit-redis";
import { env } from "@/env";
import { getRedis } from "@/lib/redis";
import { errorHandler, notFoundHandler } from "@/middleware/error";
import { requireAuth } from "@/middleware/auth";
import { auditContext } from "@/middleware/audit-context";
import { requestId } from "@/middleware/request-id";
import { authRouter } from "@/routes/auth.router";
import { healthRouter } from "@/routes/health.router";
import { hrmsRouter } from "@/routes/hrms.router";
import { managerRouter } from "@/routes/manager.router";
import { meRouter } from "@/routes/me.router";
import { compOffRouter } from "@/routes/comp-off.router";
import {
  adminApprovalWorkflowsRouter,
  workflowApprovalsRouter,
} from "@/routes/approval-workflows.router";
import { attendanceRouter } from "@/routes/attendance.router";
import { adminLeaveTypesRouter } from "@/routes/admin-leave-types.router";
import { adminLeavePoliciesRouter } from "@/routes/admin-leave-policies.router";
import { adminLeavePlansRouter } from "@/routes/admin-leave-plans.router";
import { adminHolidayCalendarsRouter } from "@/routes/admin-holiday-calendars.router";
import { adminHolidaysRouter } from "@/routes/admin-holidays.router";
import { adminWeeklyOffConfigsRouter } from "@/routes/admin-weekly-off-configs.router";
import { adminLeaveCreditsRouter } from "@/routes/admin-leave-credits.router";
import { hrLeaveApprovalsRouter } from "@/routes/hr-leave-approvals.router";
import { onboardingRouter } from "@/routes/onboarding.router";
import { profileEmailVerificationRouter } from "@/modules/email-verification/routes/profile.routes";
import { employeeRoutes } from "@/modules/onboarding/routes/employee.routes";
import { documentsRoutes } from "@/modules/onboarding/routes/documents.routes";
import { openApiSpec } from "@/docs/openapi";

function buildAuthRateLimiter() {
  const redis = getRedis();
  const opts: Parameters<typeof rateLimit>[0] = {
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." },
    },
  };
  if (redis) {
    opts.store = new RedisStore({
      // ioredis call signature: (command, ...args). The store passes the
      // raw command + args; we forward unchanged.
      sendCommand: (command: string, ...args: string[]) =>
        redis.call(command, ...args) as Promise<any>,
      prefix: "hrms:rl:auth:",
    });
  }
  return rateLimit(opts);
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin (no Origin header), curl/Postman, and the configured list.
        if (!origin) return cb(null, true);
        if (env.CORS_ORIGINS.length === 0) return cb(null, false);
        cb(null, env.CORS_ORIGINS.includes(origin));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: env.BODY_LIMIT_BYTES }));
  app.use(cookieParser());
  app.use(requestId());
  app.use(auditContext);

  app.use("/api/health", healthRouter);

  app.use("/api/auth", buildAuthRateLimiter(), authRouter);
  app.use("/api/onboarding", buildAuthRateLimiter(), onboardingRouter);

  app.use("/uploads", requireAuth, express.static(env.UPLOAD_DIR));

  if (env.NODE_ENV !== "production" || env.ENABLE_SWAGGER) {
    app.get("/api/docs/openapi.json", (_req, res) => res.json(openApiSpec));
    void import("swagger-ui-express")
      .then((swaggerUi) => {
        app.use("/api/docs", swaggerUi.default.serve, swaggerUi.default.setup(openApiSpec));
      })
      .catch(() => {
        console.warn("[hrms-api] swagger-ui-express not installed; use GET /api/docs/openapi.json");
      });
  }

  app.use("/api/employee", requireAuth, employeeRoutes);
  app.use("/api/documents", requireAuth, documentsRoutes);
  app.use(
    "/api/profile",
    requireAuth,
    buildAuthRateLimiter(),
    profileEmailVerificationRouter,
  );

  app.use("/api/me",      requireAuth, meRouter);
  app.use("/api/comp-off", requireAuth, compOffRouter);
  app.use("/api/admin/approval-workflows", requireAuth, adminApprovalWorkflowsRouter);
  app.use("/api/workflow-approvals", requireAuth, workflowApprovalsRouter);
  app.use("/api/manager", requireAuth, managerRouter);
  app.use("/api/hrms",    requireAuth, hrmsRouter);
  app.use("/api/attendance", requireAuth, attendanceRouter);
  app.use("/api/admin/leave-types", requireAuth, adminLeaveTypesRouter);
  app.use("/api/admin/leave-policies", requireAuth, adminLeavePoliciesRouter);
  app.use("/api/admin/leave-plans", requireAuth, adminLeavePlansRouter);
  app.use("/api/admin/holiday-calendars", requireAuth, adminHolidayCalendarsRouter);
  app.use("/api/admin/holidays", requireAuth, adminHolidaysRouter);
  app.use("/api/admin/weekly-off-configs", requireAuth, adminWeeklyOffConfigsRouter);
  app.use("/api/admin/leave-credits", requireAuth, adminLeaveCreditsRouter);
  app.use("/api/hr/leave-approvals", requireAuth, hrLeaveApprovalsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
