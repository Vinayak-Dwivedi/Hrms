import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "@/env";

export const PROFILE_PIC_SUBDIR = "profile_pic";
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function profilePicDir() {
  const dir = path.join(env.UPLOAD_DIR, PROFILE_PIC_SUBDIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

export const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, profilePicDir());
    },
    filename: (_req, file, cb) => {
      const ext = extensionForMime(file.mimetype);
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: PROFILE_PHOTO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPG, PNG, or WebP images are allowed."));
  },
});
