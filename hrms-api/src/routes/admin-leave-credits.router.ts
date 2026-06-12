// Admin endpoints for the leave-credit engine (M6). Mounted at
// /api/admin/leave-credits.
//
// Endpoints:
//   GET  /policies      → preview which policies will fire this run
//   GET  /transactions  → ledger of past credits (filterable)
//   POST /run/monthly   → trigger monthly accrual for an optional period
//   POST /run/yearly    → trigger yearly grant for an optional year
//
// Both POST endpoints accept `dryRun: true` to compute the would-be counts
// without writing anything.

import { Router } from "express";
import { z } from "zod";
import {
  listAccrualPolicies,
  listCreditTransactions,
  runMonthlyAccrual,
  runYearlyGrant,
} from "@/services/leave-credit-engine";
import { ApiError } from "@/middleware/error";

export const adminLeaveCreditsRouter: Router = Router();

const runBody = z
  .object({
    period: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "period must be YYYY-MM")
      .optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    forceMonth: z.coerce.number().int().min(1).max(12).optional(),
    employeeIds: z.array(z.number().int().positive()).optional(),
    dryRun: z.boolean().default(false),
  })
  .strict();

adminLeaveCreditsRouter.get("/policies", async (_req, res, next) => {
  try {
    const data = await listAccrualPolicies();
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminLeaveCreditsRouter.get("/transactions", async (req, res, next) => {
  try {
    const employeeId = req.query.employeeId
      ? Number(req.query.employeeId)
      : undefined;
    const leaveTypeId = req.query.leaveTypeId
      ? Number(req.query.leaveTypeId)
      : undefined;
    const period =
      typeof req.query.period === "string" ? req.query.period : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const rows = await listCreditTransactions({
      employeeId: Number.isFinite(employeeId) ? employeeId : undefined,
      leaveTypeId: Number.isFinite(leaveTypeId) ? leaveTypeId : undefined,
      period,
      limit,
    });
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

adminLeaveCreditsRouter.post("/run/monthly", async (req, res, next) => {
  try {
    const body = runBody.parse(req.body ?? {});
    const summary = await runMonthlyAccrual(body.period, {
      employeeIds: body.employeeIds,
      dryRun: body.dryRun,
      actorUserId: req.user?.id ?? null,
    });
    res.json({ summary, dryRun: body.dryRun });
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new ApiError(400, "BAD_INPUT", e.issues[0]?.message ?? "Invalid body"));
      return;
    }
    next(e);
  }
});

adminLeaveCreditsRouter.post("/run/yearly", async (req, res, next) => {
  try {
    const body = runBody.parse(req.body ?? {});
    const summary = await runYearlyGrant(body.year, {
      employeeIds: body.employeeIds,
      dryRun: body.dryRun,
      forceMonth: body.forceMonth,
      actorUserId: req.user?.id ?? null,
    });
    res.json({ summary, dryRun: body.dryRun });
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new ApiError(400, "BAD_INPUT", e.issues[0]?.message ?? "Invalid body"));
      return;
    }
    next(e);
  }
});
