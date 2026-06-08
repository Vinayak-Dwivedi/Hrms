import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import { accounts, users } from "@/db/schema/auth";
import { employees } from "@/db/schema/hrms";
import {
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from "@/lib/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import {
  hashOnboardingToken,
  ONBOARDING_ERROR_MESSAGES,
  validateOnboardingToken,
} from "@/lib/onboarding-token";
import { verifyPassword } from "@/lib/password";
import * as tokenHistoryRepo from "@/modules/hr-onboarding/repositories/token-history.repository";
import { ApiError } from "@/middleware/error";

export const onboardingRouter = Router();

function shapeUser(u: { id: string; email: string; name: string; role: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

const employeeByTokenSelect = {
  id: employees.id,
  userId: employees.userId,
  workEmail: employees.workEmail,
  personalEmail: employees.personalEmail,
  firstName: employees.firstName,
  middleName: employees.middleName,
  lastName: employees.lastName,
  employeeStatus: employees.employeeStatus,
  onboardingToken: employees.onboardingToken,
  onboardingTokenExpiry: employees.onboardingTokenExpiry,
  onboardingTokenUsed: employees.onboardingTokenUsed,
  onboardingCompletedAt: employees.onboardingCompletedAt,
};

async function findEmployeeByRawToken(rawToken: string) {
  const trimmed = rawToken.trim();
  const hashedLookup = hashOnboardingToken(trimmed);

  const [byHashed] = await db
    .select(employeeByTokenSelect)
    .from(employees)
    .where(eq(employees.onboardingToken, hashedLookup))
    .limit(1);
  if (byHashed) return byHashed;

  // Invitation emails use the raw token; DB stores sha256(raw). If someone pastes
  // the DB hash into the URL, look it up directly instead of hashing again.
  const [byStoredHash] = await db
    .select(employeeByTokenSelect)
    .from(employees)
    .where(eq(employees.onboardingToken, trimmed.toLowerCase()))
    .limit(1);
  return byStoredHash;
}

function throwOnboardingError(
  status: Exclude<ReturnType<typeof validateOnboardingToken>, "VALID">,
): never {
  const code =
    status === "EXPIRED"
      ? "ONBOARDING_EXPIRED"
      : status === "NOT_FOUND"
        ? "ONBOARDING_INVALID"
        : status === "ALREADY_USED"
          ? "ONBOARDING_USED"
          : "ONBOARDING_INACTIVE";
  throw new ApiError(400, code, ONBOARDING_ERROR_MESSAGES[status]);
}

onboardingRouter.get("/validate", async (req, res, next) => {
  try {
    const token =
      typeof req.query.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      throw new ApiError(400, "MISSING_TOKEN", "Onboarding token is required.");
    }

    const employee = await findEmployeeByRawToken(token);
    const status = validateOnboardingToken(employee);

    if (status !== "VALID") {
      throwOnboardingError(status);
    }

    res.json({
      status: "VALID",
      workEmail: employee!.workEmail,
      expiresAt: employee!.onboardingTokenExpiry?.toISOString() ?? null,
    });
  } catch (e) {
    next(e);
  }
});

const loginSchema = z
  .object({
    token: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1).max(256),
  })
  .strict();

onboardingRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const employee = await findEmployeeByRawToken(body.token.trim());
    const status = validateOnboardingToken(employee);

    if (status !== "VALID") {
      throwOnboardingError(status);
    }

    const workEmail = employee!.workEmail?.toLowerCase();
    if (!workEmail || body.email.toLowerCase() !== workEmail) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    if (!employee!.userId) {
      throw new ApiError(400, "MISSING_ACCOUNT", "Employee account is incomplete.");
    }

    const [row] = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        password: accounts.password,
      })
      .from(users)
      .innerJoin(accounts, eq(accounts.userId, users.id))
      .where(eq(users.id, employee!.userId))
      .limit(1);

    if (!row?.password) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    const ok = await verifyPassword(body.password, row.password);
    if (!ok) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    await db
      .update(employees)
      .set({
        onboardingTokenUsed: true,
        onboardingStatus: "IN_PROGRESS",
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employee!.id));
    if (employee!.onboardingToken) {
      await tokenHistoryRepo.markTokenUsed(employee!.onboardingToken);
    }

    const access = signAccessToken({
      sub: row.userId,
      email: row.email,
      role: row.role,
    });
    const { token: refresh } = signRefreshToken({ sub: row.userId });

    setAccessCookie(res, access);
    setRefreshCookie(res, refresh);

    res.json({
      user: shapeUser({
        id: row.userId,
        email: row.email,
        name: row.name,
        role: row.role,
      }),
      accessToken: access,
      redirectTo: "/employee/onboarding/profile",
    });
  } catch (e) {
    next(e);
  }
});

onboardingRouter.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  res.status(204).end();
});
