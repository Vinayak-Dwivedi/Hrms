import { mkdir, unlink, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/env";
import { ApiError } from "@/middleware/error";
import {
  allowedExtensionsForMime,
  detectMimeFromBuffer,
  extensionFromFilename,
  isAllowedExtension,
} from "./mime-extension-map";
import {
  createVirusScanHook,
  runVirusScan,
} from "@/infrastructure/security/virus-scan.hook";

const virusScanHook = createVirusScanHook();

function uploadRootDir(): string {
  return path.resolve(env.UPLOAD_DIR);
}

/** DB stores posix-style relative paths; normalize safely for the host OS. */
function storagePathSegments(storagePath: string): string[] {
  const posix = storagePath.replace(/\\/g, "/").trim();
  const segments = posix.split("/").filter((part) => part.length > 0 && part !== ".");
  for (const segment of segments) {
    if (segment === "..") {
      throw new ApiError(400, "INVALID_PATH", "Invalid storage path.");
    }
  }
  return segments;
}

export type SavedPrivateFile = {
  storagePath: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export async function validateAndSavePrivateFile(params: {
  employeeId: number;
  originalName: string;
  buffer: Buffer;
  declaredMime: string;
}): Promise<SavedPrivateFile> {
  if (params.buffer.length > env.UPLOAD_MAX_BYTES) {
    throw new ApiError(
      400,
      "FILE_TOO_LARGE",
      `File exceeds maximum size of ${env.UPLOAD_MAX_BYTES} bytes.`,
    );
  }

  const ext = extensionFromFilename(params.originalName);
  if (!isAllowedExtension(ext)) {
    throw new ApiError(
      400,
      "INVALID_EXTENSION",
      "File extension is not allowed.",
    );
  }

  const detectedMime = detectMimeFromBuffer(params.buffer);
  if (!detectedMime) {
    throw new ApiError(400, "INVALID_FILE", "Could not verify file type.");
  }

  if (!env.UPLOAD_ALLOWED_MIME_TYPES.includes(detectedMime)) {
    throw new ApiError(400, "INVALID_MIME", "File type is not allowed.");
  }

  const allowedExts = allowedExtensionsForMime(detectedMime);
  if (!allowedExts.includes(ext)) {
    throw new ApiError(
      400,
      "MIME_EXTENSION_MISMATCH",
      "File extension does not match file content.",
    );
  }

  await runVirusScan(virusScanHook, params.buffer, params.originalName);

  const storedFilename = `${randomUUID()}${ext}`;
  const storagePath = path.posix.join(
    "private",
    "employees",
    String(params.employeeId),
    storedFilename,
  );
  const absolutePath = resolvePrivateFileAbsolutePath(storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, params.buffer);

  return {
    storagePath,
    storedFilename,
    mimeType: detectedMime,
    sizeBytes: params.buffer.length,
  };
}

export function resolvePrivateFileAbsolutePath(storagePath: string): string {
  const root = uploadRootDir();
  const absolute = path.resolve(root, ...storagePathSegments(storagePath));
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ApiError(400, "INVALID_PATH", "Invalid storage path.");
  }
  return absolute;
}

export function openPrivateFileStream(storagePath: string) {
  const absolute = resolvePrivateFileAbsolutePath(storagePath);
  return createReadStream(absolute);
}

export async function deletePrivateFile(storagePath: string): Promise<void> {
  const absolute = resolvePrivateFileAbsolutePath(storagePath);
  try {
    await unlink(absolute);
  } catch {
    // File may already be removed from disk.
  }
}
