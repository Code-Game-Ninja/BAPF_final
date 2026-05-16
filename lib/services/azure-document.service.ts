import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer";

/**
 * Azure Document Intelligence Service
 * 
 * Direct integration with Azure to extract text and tables from PDFs.
 */

const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || "";
const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || "";
const modelId = process.env.AZURE_DOCUMENT_MODEL_ID || "prebuilt-layout";

// Singleton client instance
let client: DocumentAnalysisClient | null = null;

function getClient() {
  if (!client) {
    if (!endpoint || !key) {
      console.warn("[Azure Document] Missing credentials. Extraction will fail.");
    }
    client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
  }
  return client;
}

export interface AzureExtractionResult {
  content: string;
  pages: any[];
  tables: any[];
  styles: any[];
}

/**
 * Extract data from a PDF file using Azure Document Intelligence
 * 
 * @param file - The PDF file as a Blob or File
 * @returns Extracted content and structured elements
 */
export async function analyzeDocument(file: Blob): Promise<AzureExtractionResult> {
  const client = getClient();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const poller = await client.beginAnalyzeDocument(modelId, new Uint8Array(arrayBuffer));
    const { content, pages, tables, styles } = await poller.pollUntilDone();

    return {
      content: content || "",
      pages: pages || [],
      tables: tables || [],
      styles: styles || [],
    };
  } catch (error) {
    console.error("[Azure Document] Analysis failed:", error);
    throw new Error(`Azure Document Intelligence failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract raw text only from a document
 */
export async function extractRawText(file: Blob): Promise<string> {
  const result = await analyzeDocument(file);
  return result.content;
}
