/**
 * POST /api/extract-pdf
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side proxy to the external PDF text-extractor API.
 * Avoids CORS issues by making the external call from the server.
 *
 * Request: multipart/form-data with a "file" field (PDF)
 * Response: { text: string } — raw extracted text
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { protect } from "@/lib/api/protect";
import { trackAPIError, measurePerformance, trackUserAction } from "@/lib/monitoring/error-tracker";
import { logger } from "@/lib/utils/logger";
import { analyzeDocument } from "@/lib/services/azure-document.service";
import { extractStructuredData } from "@/lib/services/gemini.service";

// Default to deployed PDF extractor - set PDF_EXTRACTOR_API_URL env to override
const EXTERNAL_API_URL =
  process.env.PDF_EXTRACTOR_API_URL ||
  "https://pdf-extractor-pi-eight.vercel.app/api/upload";

// Log on first load (server-side)
if (typeof window === 'undefined') {
  logger.log(`[extract-pdf] Using PDF extractor: ${EXTERNAL_API_URL}`);
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 req/min
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  // Auth check
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  try {
    // Read the multipart form data from the incoming request
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided. Send a PDF as multipart/form-data with key 'file'." },
        { status: 400 }
      );
    }

    // Track user action
    trackUserAction('pdf-extraction-started', caller.uid, {
      fileName: file instanceof File ? file.name : 'unknown',
      fileSize: file.size,
      fileType: file.type
    });

    // Measure extraction performance
    const result = await measurePerformance('pdf-extraction', async () => {
      // Check if direct Azure integration is configured
      const azureEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
      const azureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
      const useGemini = process.env.GOOGLE_GEMINI_API_KEY;

      if (azureEndpoint && azureKey) {
        logger.log('[extract-pdf] Using direct Azure Document Intelligence integration');
        const azureResult = await analyzeDocument(file);
        
        let structuredData = null;
        if (useGemini && azureResult.content) {
          logger.log('[extract-pdf] Using Gemini for intelligent structured extraction');
          structuredData = await extractStructuredData(azureResult.content);
        }

        return { 
          text: azureResult.content, 
          structuredData,
          debug: {
            pages: azureResult.pages?.length,
            tables: azureResult.tables?.length,
            source: 'azure-direct',
            intelligent: !!structuredData
          }
        };
      }

      // Fallback to external API
      logger.log(`[extract-pdf] Falling back to external API: ${EXTERNAL_API_URL}`);
      
      const externalForm = new FormData();
      externalForm.append("pdf", file);

      const externalRes = await fetch(EXTERNAL_API_URL, {
        method: "POST",
        body: externalForm,
        signal: AbortSignal.timeout(90_000),
      });

      if (!externalRes.ok) {
        const errText = await externalRes.text().catch(() => "");
        const error = new Error(`External PDF extractor returned ${externalRes.status}`);
        
        trackAPIError('/api/extract-pdf', error, {
          method: 'POST',
          params: { externalUrl: EXTERNAL_API_URL }
        }, {
          status: externalRes.status,
          body: errText
        });
        
        throw error;
      }

      const data = await externalRes.json();
      logger.log('[extract-pdf] External API response:', data.success ? 'SUCCESS' : 'FAILED');

      const text =
        typeof data === "string"
          ? data
          : data.data?.combinedText || data.data?.text || data.text || data.content || data.result || "";

      const structuredData = data.data?.structuredData || null;

      return { text, structuredData };
    }, {
      fileSize: file.size,
      fileType: file.type,
      userId: caller.uid
    });

    // Track successful extraction
    trackUserAction('pdf-extraction-completed', caller.uid, {
      textLength: result.text?.length || 0,
      hasStructuredData: !!result.structuredData
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    const message = error.message;
    
    // Track API error with full context
    trackAPIError('/api/extract-pdf', error, {
      method: 'POST',
      params: { userId: caller.uid }
    }, {
      status: 500
    });
    
    console.error("[extract-pdf] Error:", message);
    return NextResponse.json(
      { error: "Failed to extract PDF text", detail: message },
      { status: 500 }
    );
  }
}
