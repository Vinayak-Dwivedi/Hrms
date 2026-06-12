import { Router } from "express";
import * as ctrl from "@/modules/org-hierarchy/controllers/org-hierarchy.controller";

export const orgHierarchyRoutes = Router();

orgHierarchyRoutes.get("/tree", ctrl.getHierarchyTree);

orgHierarchyRoutes.get("/departments", ctrl.listDepartments);
orgHierarchyRoutes.post("/departments", ctrl.createDepartment);
orgHierarchyRoutes.get("/departments/:id", ctrl.getDepartment);
orgHierarchyRoutes.patch("/departments/:id", ctrl.updateDepartment);
orgHierarchyRoutes.delete("/departments/:id", ctrl.deleteDepartment);

orgHierarchyRoutes.get("/sub-departments", ctrl.listSubDepartments);
orgHierarchyRoutes.post("/sub-departments", ctrl.createSubDepartment);
orgHierarchyRoutes.get("/sub-departments/:id", ctrl.getSubDepartment);
orgHierarchyRoutes.patch("/sub-departments/:id", ctrl.updateSubDepartment);
orgHierarchyRoutes.delete("/sub-departments/:id", ctrl.deleteSubDepartment);

orgHierarchyRoutes.get("/levels", ctrl.listLevels);
orgHierarchyRoutes.post("/levels", ctrl.createLevel);
orgHierarchyRoutes.get("/levels/:id", ctrl.getLevel);
orgHierarchyRoutes.patch("/levels/:id", ctrl.updateLevel);
orgHierarchyRoutes.delete("/levels/:id", ctrl.deleteLevel);

orgHierarchyRoutes.get("/designations", ctrl.listDesignations);
orgHierarchyRoutes.post("/designations", ctrl.createDesignation);
orgHierarchyRoutes.get("/designations/:id", ctrl.getDesignation);
orgHierarchyRoutes.patch("/designations/:id", ctrl.updateDesignation);
orgHierarchyRoutes.delete("/designations/:id", ctrl.deleteDesignation);

orgHierarchyRoutes.get("/structure", ctrl.listStructure);
orgHierarchyRoutes.post("/structure", ctrl.createStructure);
orgHierarchyRoutes.get("/structure/:id", ctrl.getStructure);
orgHierarchyRoutes.patch("/structure/:id", ctrl.updateStructure);
orgHierarchyRoutes.delete("/structure/:id", ctrl.deleteStructure);
