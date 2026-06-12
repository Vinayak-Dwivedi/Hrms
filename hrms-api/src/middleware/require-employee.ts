import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { assertEmployeeMayAuthenticate } from "@/lib/employee-auth";
import { loadCurrentEmployee } from "@/lib/employee";
import { ApiError } from "@/middleware/error";

export type EmployeeContext = {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  userId: string | null;
  onboardingStatus: string;
  onboardingCompletedAt: Date | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      employee?: EmployeeContext;
    }
  }
}

export async function requireEmployee(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return next(
        new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
      );
    }
    await assertEmployeeMayAuthenticate(req.user.id);
    const base = await loadCurrentEmployee(req.user.id);
    const [full] = await db
      .select({
        id: employees.id,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        workEmail: employees.workEmail,
        userId: employees.userId,
        onboardingStatus: employees.onboardingStatus,
        onboardingCompletedAt: employees.onboardingCompletedAt,
      })
      .from(employees)
      .where(eq(employees.id, base.id))
      .limit(1);
    if (!full) {
      return next(
        new ApiError(404, "NO_EMPLOYEE_FOR_USER", "Employee not found."),
      );
    }
    req.employee = full;
    next();
  } catch (e) {
    next(e);
  }
}
