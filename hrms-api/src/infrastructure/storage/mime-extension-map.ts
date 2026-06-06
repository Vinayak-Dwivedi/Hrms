export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const MIME_TO_EXT: Record<string, AllowedExtension[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function allowedExtensionsForMime(mime: string): AllowedExtension[] {
  return MIME_TO_EXT[mime.toLowerCase()] ?? [];
}

export function extensionFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot).toLowerCase();
}

export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === "%PDF") {
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  return null;
}
