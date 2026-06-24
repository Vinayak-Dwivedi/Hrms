import multer from "multer";

export const PROFILE_PIC_SUBDIR = "profile_pic";
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    default:           return ".jpg";
  }
}

// Use memory storage — the route handler uploads the buffer to S3 (or disk).
export const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_PHOTO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPG, PNG, or WebP images are allowed."));
  },
});
