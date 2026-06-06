import { env } from "@/env";

/** @deprecated Use UPLOAD_MAX_BYTES from env and private-file-storage instead. */
export const MAX_UPLOAD_BYTES = env.UPLOAD_MAX_BYTES;

/** @deprecated Use private-file-storage validation instead. */
export function isAllowedMimeType(mime: string): boolean {
  return env.UPLOAD_ALLOWED_MIME_TYPES.includes(mime.toLowerCase());
}