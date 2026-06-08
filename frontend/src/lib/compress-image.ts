const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;
const TARGET_MAX_BYTES = 2 * 1024 * 1024;

function isCompressibleImage(file: File): boolean {
  return (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  );
}

function scaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function renderToFile(
  img: HTMLImageElement,
  file: File,
  mimeType: "image/jpeg" | "image/png",
  quality?: number,
): Promise<File> {
  const { width, height } = scaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    MAX_DIMENSION,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, mimeType, quality);
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/i, "") || "document";
  const ext = mimeType === "image/png" ? ".png" : ".jpg";
  return new File([blob], `${baseName}${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

/**
 * Compresses image uploads before sending to the API. PDFs and other files pass through unchanged.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!isCompressibleImage(file)) {
    return file;
  }

  try {
    const img = await loadImage(file);

    if (file.type === "image/png") {
      let compressed = await renderToFile(img, file, "image/png");
      if (compressed.size > TARGET_MAX_BYTES) {
        compressed = await renderToFile(img, file, "image/jpeg", JPEG_QUALITY);
      }
      return compressed.size < file.size ? compressed : file;
    }

    const compressed = await renderToFile(img, file, "image/jpeg", JPEG_QUALITY);
    return compressed.size < file.size ? compressed : file;
  } catch {
    return file;
  }
}
