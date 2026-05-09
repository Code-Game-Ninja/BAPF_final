/**
 * Mock Storage Upload Utility
 *
 * Simulates file uploads by generating fake URLs.
 * All validation (MIME type, size) is preserved.
 */

export type UploadProgressCallback = (progress: number) => void;

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff", "image/gif"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  document: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/gif",
  ],
};

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB default
let _maxFileSizeOverride: number | null = null;

export function setMaxFileSizeMB(mb: number) {
  _maxFileSizeOverride = mb * 1024 * 1024;
}

export function getMaxFileSize(): number {
  return _maxFileSizeOverride ?? DEFAULT_MAX_FILE_SIZE;
}

/**
 * Upload a policy document (PDF or image) — mock version
 */
export async function uploadPolicyDocument(
  file: File,
  policyId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  return uploadFile(file, `policies/${policyId}`, "document", onProgress);
}

/**
 * @deprecated Use uploadPolicyDocument instead.
 */
export async function uploadPolicyPdf(
  file: File,
  policyId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  return uploadPolicyDocument(file, policyId, onProgress);
}

/**
 * Upload a document — mock version
 */
export async function uploadDocument(
  file: File,
  folder: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const allowed = [...(ALLOWED_MIME_TYPES.pdf || []), ...(ALLOWED_MIME_TYPES.image || [])];
  return uploadFileRaw(file, folder, allowed, onProgress);
}

/**
 * Generic file upload with MIME validation — mock version
 */
export async function uploadFile(
  file: File,
  storagePath: string,
  type: keyof typeof ALLOWED_MIME_TYPES,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const allowedTypes = ALLOWED_MIME_TYPES[type];
  if (!allowedTypes) {
    throw new Error(`Unknown file type category: ${type}`);
  }
  return uploadFileRaw(file, storagePath, allowedTypes, onProgress);
}

async function uploadFileRaw(
  file: File,
  storagePath: string,
  allowedMimeTypes: string[],
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  // Validate MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type "${file.type}". Allowed: ${allowedMimeTypes.join(", ")}`
    );
  }

  // Validate size
  const maxSize = getMaxFileSize();
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File too large (${sizeMB}MB). Maximum allowed: ${maxSize / (1024 * 1024)}MB`
    );
  }

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${storagePath}/${timestamp}_${safeName}`;

  // Simulate upload progress
  if (onProgress) {
    for (let p = 0; p <= 100; p += 20) {
      onProgress(p);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  // Create a local blob URL as a mock download URL
  const url = URL.createObjectURL(file);

  return {
    url,
    path: fullPath,
    fileName: safeName,
  };
}

/**
 * Delete a file from storage — mock version (no-op)
 */
export async function deleteStorageFile(_path: string): Promise<void> {
  // No-op in mock mode
}
