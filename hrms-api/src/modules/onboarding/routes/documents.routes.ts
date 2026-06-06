import { Router } from "express";
import * as documentsController from "@/modules/onboarding/controllers/documents.controller";
import { requireEmployee } from "@/middleware/require-employee";
import { documentUpload } from "@/middleware/upload.middleware";

export const documentsRoutes = Router();

documentsRoutes.use(requireEmployee);

documentsRoutes.post(
  "/upload",
  documentUpload.single("file"),
  documentsController.uploadDocument,
);
documentsRoutes.get("/:id", documentsController.getDocument);
documentsRoutes.delete("/:id", documentsController.deleteDocument);
