import multer from "multer";
import { env } from "@/env";

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES },
});
