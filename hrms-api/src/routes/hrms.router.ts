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
  notifications,
  regularisationRequests,
  resignations,
} from "@/db/schema/hrms";
import { createCrudRouter } from "@/lib/crud-factory";

/**
 * Generic CRUD endpoints over the HR-domain tables. Composite-PK tables
 * (bank_accounts, employee_documents, leave_balances, attendance_records)
 * are intentionally excluded — the factory needs a single `id` column.
 * Use /api/me/* or /api/manager/* for those.
 */
export const hrmsRouter: Router = Router();

hrmsRouter.use("/branches",                  createCrudRouter("branch", branches));
hrmsRouter.use("/departments",               createCrudRouter("department", departments));
hrmsRouter.use("/grades",                    createCrudRouter("grade", grades));
hrmsRouter.use("/employment-types",          createCrudRouter("employment type", employmentTypes));
hrmsRouter.use("/designations",              createCrudRouter("designation", designations));
hrmsRouter.use("/employees",                 createCrudRouter("employee", employees));
hrmsRouter.use("/resignations",              createCrudRouter("resignation", resignations));
hrmsRouter.use("/regularisation-requests",   createCrudRouter("regularisation request", regularisationRequests));
hrmsRouter.use("/leave-types",               createCrudRouter("leave type", leaveTypes));
hrmsRouter.use("/leave-requests",            createCrudRouter("leave request", leaveRequests));
hrmsRouter.use("/notifications",             createCrudRouter("notification", notifications));
hrmsRouter.use("/broadcasts",                createCrudRouter("broadcast", broadcasts));
