import { mkdir, unlink, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

// ── S3 client (created once if S3 is configured) ─────────────────────────────

function s3Client(): S3Client | null {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_S3_BUCKET) {
    return null;
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const s3 = s3Client();
const useS3 = s3 !== null;

if (useS3) {
  console.log(`[storage] Using S3 bucket: ${env.AWS_S3_BUCKET} (${env.AWS_REGION})`);
} else {
  console.log(`[storage] Using local disk: ${env.UPLOAD_DIR}`);
}

// ── Local disk helpers ────────────────────────────────────────────────────────

function uploadRootDir(): string {
  return path.resolve(env.UPLOAD_DIR);
}

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

export function resolvePrivateFileAbsolutePath(storagePath: string): string {
  const root = uploadRootDir();
  const absolute = path.resolve(root, ...storagePathSegments(storagePath));
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ApiError(400, "INVALID_PATH", "Invalid storage path.");
  }
  return absolute;
}

// ── Shared types ──────────────────────────────────────────────────────────────

export type SavedPrivateFile = {
  storagePath: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
};

// ── Save ──────────────────────────────────────────────────────────────────────

export async function validateAndSavePrivateFile(params: {
  employeeId: number;
  originalName: string;
  buffer: Buffer;
  declaredMime: string;
  storageSubdir?: string;
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
    throw new ApiError(400, "INVALID_EXTENSION", "File extension is not allowed.");
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
    throw new ApiError(400, "MIME_EXTENSION_MISMATCH", "File extension does not match file content.");
  }

  await runVirusScan(virusScanHook, params.buffer, params.originalName);

  const storedFilename = `${randomUUID()}${ext}`;
  const storagePath = path.posix.join(
    params.storageSubdir ??
      path.posix.join("private", "employees", String(params.employeeId)),
    storedFilename,
  );

  if (useS3 && s3) {
    await s3.send(new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: storagePath,
      Body: params.buffer,
      ContentType: detectedMime,
    }));
  } else {
    const absolutePath = resolvePrivateFileAbsolutePath(storagePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, params.buffer);
  }

  return { storagePath, storedFilename, mimeType: detectedMime, sizeBytes: params.buffer.length };
}

// ── Read (stream) ─────────────────────────────────────────────────────────────

export async function openPrivateFileReadable(storagePath: string): Promise<Readable> {
  if (useS3 && s3) {
    const response = await s3.send(new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: storagePath,
    }));
    return response.Body as Readable;
  }
  const absolute = resolvePrivateFileAbsolutePath(storagePath);
  return createReadStream(absolute);
}

/** @deprecated Use openPrivateFileReadable (async). Kept for local-disk callers. */
export function openPrivateFileStream(storagePath: string): ReturnType<typeof createReadStream> {
  if (useS3) {
    throw new ApiError(500, "S3_STREAM_SYNC", "Use openPrivateFileReadable for S3 storage.");
  }
  const absolute = resolvePrivateFileAbsolutePath(storagePath);
  return createReadStream(absolute);
}

// ── Presigned URL (S3 only) ───────────────────────────────────────────────────

export async function getPrivateFilePresignedUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  if (!useS3 || !s3) return null;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET!, Key: storagePath }),
    { expiresIn: expiresInSeconds },
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePrivateFile(storagePath: string): Promise<void> {
  if (useS3 && s3) {
    await s3.send(new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: storagePath,
    }));
    return;
  }
  const absolute = resolvePrivateFileAbsolutePath(storagePath);
  try {
    await unlink(absolute);
  } catch {
    // File may already be removed.
  }
}
