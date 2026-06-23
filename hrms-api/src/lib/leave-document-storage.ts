import type { Express } from "express";
import { validateAndSavePrivateFile } from "@/infrastructure/storage/private-file-storage";

export async function saveLeaveRequestDocument(params: {
  employeeId: number;
  requestId: number;
  file: Express.Multer.File;
}): Promise<string> {
  const saved = await validateAndSavePrivateFile({
    employeeId: params.employeeId,
    originalName: params.file.originalname,
    buffer: params.file.buffer,
    declaredMime: params.file.mimetype,
    storageSubdir: `private/leave-requests/${params.requestId}`,
  });
  return saved.storagePath;
}
