import { z } from "zod";
import { SUPPORTED_DOCUMENT_TYPES } from "@/modules/onboarding/constants";

export const documentTypeSchema = z.enum(SUPPORTED_DOCUMENT_TYPES);

export const documentIdParamSchema = z.object({
  id: z.string().uuid(),
});
