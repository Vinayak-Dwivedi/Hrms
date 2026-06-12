import { Router } from "express";
import {
  branches,
  broadcasts,
  departments,
  designations,
  employees,
  employmentTypes,
  grades,
  leaveRequests,
  leaveTypes,
  locations,
  notifications,
  permissions,
  regularisationRequests,
  resignations,
  roles,
  subDepartments,
} from "@/db/schema/hrms";
import { createCrudRouter } from "@/lib/crud-factory";
import { EMPLOYEE_CRUD_EXCLUDED_COLUMNS } from "@/lib/sensitive-employee-fields";
import { requirePermission } from "@/middleware/require-permission";
import { hrOnboardingRoutes } from "@/modules/hr-onboarding/routes/onboarding.routes";
import { orgHierarchyRoutes } from "@/modules/org-hierarchy/routes/org-hierarchy.routes";
import { employeesRouter } from "@/routes/employees.router";
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

hrmsRouter.use("/branches",                  orgSetupAccess, createCrudRouter("branch", branches));
hrmsRouter.use("/locations",                 orgSetupAccess, createCrudRouter("location", locations));
hrmsRouter.use("/departments",               orgSetupAccess, createCrudRouter("department", departments));
hrmsRouter.use("/grades",                    orgSetupAccess, createCrudRouter("grade", grades));
hrmsRouter.use("/employment-types",          orgSetupAccess, createCrudRouter("employment type", employmentTypes));
hrmsRouter.use("/designations",              orgSetupAccess, createCrudRouter("designation", designations));
hrmsRouter.use("/sub-departments",           orgSetupAccess, createCrudRouter("sub-department", subDepartments));
hrmsRouter.use("/employees", employeesRouter);
hrmsRouter.use("/employees",                 createCrudRouter("employee", employees, { excludedColumns: EMPLOYEE_CRUD_EXCLUDED_COLUMNS }));
hrmsRouter.use("/resignations",              createCrudRouter("resignation", resignations));
hrmsRouter.use("/regularisation-requests",   createCrudRouter("regularisation request", regularisationRequests));
hrmsRouter.use("/leave-types",               createCrudRouter("leave type", leaveTypes));
hrmsRouter.use("/leave-requests",            createCrudRouter("leave request", leaveRequests));
hrmsRouter.use("/notifications",             createCrudRouter("notification", notifications));
hrmsRouter.use("/broadcasts",                createCrudRouter("broadcast", broadcasts));
hrmsRouter.use("/permissions",               adminPermissionsAccess, createCrudRouter("permission", permissions));
hrmsRouter.use("/roles",                     adminRolesAccess, rolesRouter);
hrmsRouter.use("/roles",                     adminRolesAccess, createCrudRouter("role", roles));
