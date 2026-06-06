import { Router } from "express";
import * as profileController from "@/modules/onboarding/controllers/employee-profile.controller";
import * as submitController from "@/modules/onboarding/controllers/onboarding-submit.controller";
import { requireEmployee } from "@/middleware/require-employee";

export const employeeRoutes = Router();

employeeRoutes.use(requireEmployee);

employeeRoutes.get("/profile", profileController.getProfile);
employeeRoutes.put("/profile", profileController.putProfile);
employeeRoutes.post("/onboarding/submit", submitController.submitOnboarding);
