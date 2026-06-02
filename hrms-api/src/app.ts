import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "@/env";
import { errorHandler, notFoundHandler } from "@/middleware/error";
import { requestId } from "@/middleware/request-id";
import { requireAuth } from "@/middleware/auth";
import { authRouter } from "@/routes/auth.router";
import { healthRouter } from "@/routes/health.router";
import { hrmsRouter } from "@/routes/hrms.router";
import { managerRouter } from "@/routes/manager.router";
import { meRouter } from "@/routes/me.router";

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

  app.use("/api/health", healthRouter);

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
      max: env.AUTH_RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } },
    }),
    authRouter,
  );

  app.use("/api/me",      requireAuth, meRouter);
  app.use("/api/manager", requireAuth, managerRouter);
  app.use("/api/hrms",    requireAuth, hrmsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
