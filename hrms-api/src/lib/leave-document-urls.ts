import path from "node:path";

export type LeaveDocumentMeta = {
  url: string;
  name: string;
  kind: "image" | "pdf";
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

export function mapLeaveDocumentUrls(
  requestId: number,
  documentUrls: string[] | null | undefined,
): LeaveDocumentMeta[] {
  return (documentUrls ?? []).map((storagePath, index) => {
    const ext = path.extname(storagePath).toLowerCase();
    return {
      url: `/api/me/leave-requests/${requestId}/documents/${index}`,
      name: path.basename(storagePath),
      kind: IMAGE_EXTENSIONS.has(ext) ? "image" : "pdf",
    };
  });
}

export function mimeTypeForLeaveDocument(storagePath: string): string {
  const ext = path.extname(storagePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}
