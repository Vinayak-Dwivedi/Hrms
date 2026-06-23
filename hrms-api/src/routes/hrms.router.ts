import { count, eq, isNotNull, sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "@/db/runtime";
import {
  branches,
  orgHierarchyDepartments as departments,
  orgHierarchyDesignations as designations,
  employees,
  employmentTypes,
  grades,
  leaveRequests,
  leaveTypes,
  locations,
  notifications,
  permissions,
  regularisationRequests,
  roles,
  orgHierarchySubDepartments as subDepartments,
} from "@/db/schema/hrms";
import { createCrudRouter } from "@/lib/crud-factory";
import { ApiError } from "@/middleware/error";
import { EMPLOYEE_CRUD_EXCLUDED_COLUMNS } from "@/lib/sensitive-employee-fields";
import { requirePermission } from "@/middleware/require-permission";
import { hrOnboardingRoutes } from "@/modules/hr-onboarding/routes/onboarding.routes";
import { offboardingRouter } from "@/modules/offboarding/offboarding.router";
import { orgHierarchyRoutes } from "@/modules/org-hierarchy/routes/org-hierarchy.routes";
import { employeesRouter } from "@/routes/employees.router";
import { leaveRequestsRouter } from "@/routes/leave-requests.router";
import { rolesRouter } from "@/routes/roles.router";

const orgSetupAccess = requirePermission("employees.view", "onboarding.manage");
const adminRolesAccess = requirePermission("admin.roles");
const adminPermissionsAccess = requirePermission("admin.permissions");

/**
 * Generic CRUD endpoints over the HR-domain tables. Composite-PK tables
 * (bank_accounts, employee_documents, leave_balances, attendance_records)
 * are intentionally excluded — the factory needs a single `id` column.
 * Use /api/me/* or /api/manager/* for those.
 */
export const hrmsRouter: Router = Router();

hrmsRouter.use("/onboarding", hrOnboardingRoutes);
hrmsRouter.use("/org-hierarchy", orgSetupAccess, orgHierarchyRoutes);

// Which departments / sub-departments are actually present at each branch
// (location), derived from where employees sit. Departments are independent of
// locations in the schema, so this is the practical "allotted to" mapping used
// to narrow the department picker once a location is chosen.
hrmsRouter.get("/org-allocation", orgSetupAccess, async (_req, res, next) => {
  try {
    const rows = await db
      .selectDistinct({
        branchId: employees.branchId,
        departmentId: employees.departmentId,
        subDepartmentId: employees.subDepartmentId,
      })
      .from(employees)
      .where(isNotNull(employees.branchId));
    res.json({
      data: rows.filter((r) => r.branchId != null && r.departmentId != null),
    });
  } catch (e) {
    next(e);
  }
});

// Dynamic headcount: count employees assigned to each branch instead of using the stored column.
hrmsRouter.get("/branches", orgSetupAccess, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const offset = Number(req.query.offset ?? 0) || 0;
    const rows = await db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
        headcount: sql<number>`count(${employees.id})::int`,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .leftJoin(employees, eq(employees.branchId, branches.id))
      .groupBy(
        branches.id,
        branches.name,
        branches.address,
        branches.createdAt,
        branches.updatedAt,
      )
      .limit(limit)
      .offset(offset);
    res.json({ data: rows, limit, offset, count: rows.length });
  } catch (e) {
    next(e);
  }
});

// Duplicate-name guard: reject before hitting the DB unique constraint.
hrmsRouter.post("/branches", orgSetupAccess, async (req, res, next) => {
  try {
    const name = (req.body?.name as string | undefined)?.trim();
    if (name) {
      const [existing] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(sql`lower(${branches.name}) = lower(${name})`)
        .limit(1);
      if (existing) {
        return next(new ApiError(409, "DUPLICATE_NAME", `A location named "${name}" already exists.`));
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

hrmsRouter.use("/branches",                  orgSetupAccess, createCrudRouter("branch", branches));
hrmsRouter.use("/locations",                 orgSetupAccess, createCrudRouter("location", locations));
hrmsRouter.use("/departments",               orgSetupAccess, createCrudRouter("department", departments));
hrmsRouter.use("/grades",                    orgSetupAccess, createCrudRouter("grade", grades));
hrmsRouter.use("/employment-types",          orgSetupAccess, createCrudRouter("employment type", employmentTypes));
hrmsRouter.use("/designations",              orgSetupAccess, createCrudRouter("designation", designations));
hrmsRouter.use("/sub-departments",           orgSetupAccess, createCrudRouter("sub-department", subDepartments));
hrmsRouter.use("/employees", employeesRouter);
hrmsRouter.use("/employees",                 createCrudRouter("employee", employees, { excludedColumns: EMPLOYEE_CRUD_EXCLUDED_COLUMNS }));
// Offboarding / resignation workflow (employee submit, manager + HR review,
// admin config, cases). Replaces the old generic resignations CRUD.
hrmsRouter.use("/offboarding", offboardingRouter);
hrmsRouter.use("/regularisation-requests",   createCrudRouter("regularisation request", regularisationRequests));
hrmsRouter.use("/leave-types",               createCrudRouter("leave type", leaveTypes));
hrmsRouter.use("/leave-requests",            leaveRequestsRouter);
hrmsRouter.use("/leave-requests",            createCrudRouter("leave request", leaveRequests));
hrmsRouter.use("/notifications",             createCrudRouter("notification", notifications));
hrmsRouter.use("/permissions",               adminPermissionsAccess, createCrudRouter("permission", permissions));
hrmsRouter.use("/roles",                     adminRolesAccess, rolesRouter);
hrmsRouter.use("/roles",                     adminRolesAccess, createCrudRouter("role", roles));
