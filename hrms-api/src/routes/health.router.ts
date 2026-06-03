import { Router } from "express";
import { env } from "@/env";

export const healthRouter: Router = Router();

healthRouter.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "hrms-api",
    environment: env.NODE_ENV,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
});
