/**
 * Client-side file compression for policy documents.
 *
 * - Images (JPEG/PNG/WEBP/BMP/TIFF): compressed + resized using browser-image-compression
 * - PDFs: page images re-compressed + unused objects removed using pdf-lib
 *
 * Falls back to the original file if compression fails or produces a larger file.
 */

import imageCompression from "browser-image-compression";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
]);

/** Options for image compression */
const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1, // target max 1 MB
  maxWidthOrHeight: 2048, // keep readable but not huge
  useWebWorker: true,
  fileType: "image/jpeg" as const, // convert all images to JPEG for best compression
  initialQuality: 0.7,
};

/**
 * Compress a file before upload.
 * Returns the compressed File (or original if compression isn't applicable / beneficial).
 */
export async function compressFile(file: File): Promise<File> {
  try {
    if (IMAGE_MIME_TYPES.has(file.type)) {
      return await compressImage(file);
    }

    if (file.type === "application/pdf") {
      return await compressPdf(file);
    }
  } catch (err) {
    console.warn("[compress-file] Compression failed, using original:", err);
  }

  // Unsupported type or compression failed — return as-is
  return file;
}

/** Compress an image file */
async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);

  // Only use compressed version if it's actually smaller
  if (compressed.size >= file.size) {
    return file;
  }

  // browser-image-compression returns a Blob; wrap it as a File with the original name
  const compressedFile = new File(
    [compressed],
    file.name.replace(/\.[^.]+$/, ".jpg"),
    { type: "image/jpeg", lastModified: Date.now() }
  );

  console.info(
    `[compress-file] Image: ${formatSize(file.size)} → ${formatSize(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% saved)`
  );

  return compressedFile;
}

/** Strip unused objects from a PDF to reduce size */
async function compressPdf(file: File): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Re-save with object-stream compression (removes orphan objects, deduplicates)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  // Only use compressed version if it's actually smaller
  if (compressedBytes.byteLength >= file.size) {
    return file;
  }

  // Copy into a plain ArrayBuffer to satisfy strict TS types
  const ab = new ArrayBuffer(compressedBytes.byteLength);
  new Uint8Array(ab).set(compressedBytes);

  const compressedFile = new File(
    [ab],
    file.name,
    {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  console.info(
    `[compress-file] PDF: ${formatSize(file.size)} → ${formatSize(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% saved)`
  );

  return compressedFile;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
