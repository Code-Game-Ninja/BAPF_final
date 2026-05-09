/**
 * POST /api/upload
 * ─────────────────────────────────────────────────────────────────────────────
 * Issues a short-lived Supabase Storage signed upload URL.
 * The client receives the URL and performs a single PUT request directly to
 * Supabase Storage — no multipart body ever passes through Next.js.
 *
 * Why server-side?
 *   - Auth check before any upload is possible
 *   - Path validation (prevent path traversal / wrong bucket prefix)
 *   - File-type whitelist enforced before the client wastes bandwidth
 *   - Keeps the service_role key server-only
 *
 * Request body:
 * {
 *   path:     string   — desired Storage path, e.g. "policies/abc123/policy.pdf"
 *   mimeType: string   — MIME type of the file to upload
 *   size:     number   — file size in bytes (client-reported; used for pre-check)
 * }
 *
 * Response:
 * {
 *   uploadUrl:    string   — signed PUT URL (valid 15 minutes)
 *   downloadUrl:  string   — signed download URL (valid 1 hour after upload)
 *   expiresAt:    string   — ISO timestamp when the signed URL expires
 * }
 *
 * Auth: all roles; path prefix is enforced to prevent cross-tenant uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protect } from "@/lib/api/protect";
import { trackAPIError, trackUserAction } from "@/lib/monitoring/error-tracker";

// ── Config ────────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_PATH_PREFIXES = [
  "policies/",
  "documents/",
  "customers/",
  "profiles/",
  "leads/",
  "temp/",
];

// ── POST ──────────────────────────────────────────────────────────────────────

/**
 * Map path prefix to Supabase bucket name.
 * Must match the buckets created in Supabase Storage.
 */
function getBucketAndPath(storagePath: string): { bucket: string; path: string } {
  if (storagePath.startsWith("policies/")) {
    return { bucket: "documents", path: storagePath };
  }
  if (storagePath.startsWith("documents/")) {
    return { bucket: "documents", path: storagePath.slice("documents/".length) };
  }
  if (storagePath.startsWith("profiles/")) {
    return { bucket: "avatars", path: storagePath.slice("profiles/".length) };
  }
  if (storagePath.startsWith("customers/")) {
    return { bucket: "documents", path: storagePath };
  }
  if (storagePath.startsWith("leads/")) {
    return { bucket: "documents", path: storagePath };
  }
  if (storagePath.startsWith("temp/")) {
    return { bucket: "documents", path: storagePath };
  }
  // Fallback
  return { bucket: "documents", path: storagePath };
}

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req);
  if (isAuthError(caller)) return authError(caller);

  let body: { path?: string; mimeType?: string; size?: number };
  try {
    body = await req.json();
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Invalid JSON');
    trackAPIError('/api/upload', err, { method: 'POST' }, { status: 400 });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { path: storagePath, mimeType, size } = body;

  // Validate path
  if (!storagePath?.trim()) {
    return NextResponse.json({ error: "Missing `path` field." }, { status: 422 });
  }

  // Prevent path traversal
  if (storagePath.includes("..") || storagePath.startsWith("/")) {
    trackUserAction('upload-path-traversal-attempt', caller.uid, {
      attemptedPath: storagePath
    });
    return NextResponse.json({ error: "Invalid storage path." }, { status: 422 });
  }

  // Enforce allowed prefixes
  const validPrefix = ALLOWED_PATH_PREFIXES.some((p) => storagePath.startsWith(p));
  if (!validPrefix) {
    return NextResponse.json(
      { error: `Path must start with one of: ${ALLOWED_PATH_PREFIXES.join(", ")}` },
      { status: 422 }
    );
  }

  // Validate MIME type
  if (!mimeType) {
    return NextResponse.json({ error: "Missing `mimeType` field." }, { status: 422 });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}` },
      { status: 422 }
    );
  }

  // Validate size (client-reported)
  if (size !== undefined && size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 10 MB limit (reported size: ${Math.round(size / 1024)} KB).` },
      { status: 413 }
    );
  }

  try {
    // Map path to bucket and relative path
    const { bucket, path: relativePath } = getBucketAndPath(storagePath);

    // Track upload initiation
    trackUserAction('file-upload-initiated', caller.uid, {
      storagePath,
      bucket,
      mimeType,
      size
    });

    // Generate signed upload URL (Supabase signed URLs expire in 2 hours by default)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(relativePath);

    if (uploadError || !uploadData) {
      const error = new Error(uploadError?.message || 'Failed to generate upload URL');
      trackAPIError('/api/upload', error, {
        method: 'POST',
        body: { storagePath, bucket, mimeType, size }
      }, {
        status: 500,
        body: uploadError
      });
      
      console.error("[upload] Failed to create signed upload URL:", uploadError);
      return NextResponse.json(
        { error: uploadError?.message || "Failed to generate upload URL" },
        { status: 500 }
      );
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours for upload URL

    // Generate a signed download URL (valid 1 hour) — path will exist once client uploads
    const { data: downloadData } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(relativePath, 3600);

    // Track successful URL generation
    trackUserAction('file-upload-url-generated', caller.uid, {
      storagePath,
      bucket
    });

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      downloadUrl: downloadData?.signedUrl ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${relativePath}`,
      token: uploadData.token, // Supabase requires this token for the upload
      storagePath,
      bucket,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown upload error');
    trackAPIError('/api/upload', err, {
      method: 'POST',
      body: { storagePath, mimeType, size }
    }, {
      status: 500
    });
    
    console.error("[upload] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error during upload URL generation" },
      { status: 500 }
    );
  }
}
