/**
 * Policy Data Extractor — External PDF Text Extractor + Indian Insurer Intelligence
 *
 * Uses an external PDF text extraction API (pdf-text-extractor) that combines:
 * - pdf-parse for digital text layers
 * - Google Cloud Vision OCR for scanned/image pages
 * - sharp for image preprocessing
 *
 * Then applies comprehensive regex pattern matching for Indian insurers
 * to extract structured policy data.
 *
 * Supported Insurers:
 * - Bajaj Allianz, ICICI Lombard, HDFC Ergo, TATA AIG, LIC
 * - New India Assurance, Star Health, SBI General, Reliance General
 * - United India, Oriental Insurance, National Insurance, and more
 *
 * Features:
 * - Hybrid PDF extraction (digital + OCR) via external API
 * - Indian number format parsing (e.g., 52,72,60,899)
 * - Multiple date format support (DD/MM/YYYY, DD-Mon-YYYY, etc.)
 * - Confidence scoring
 */

import { supabase } from "@/lib/supabase/client";

// Supported MIME types for extraction (PDF primary, images supported via OCR)
export const SUPPORTED_EXTRACT_TYPES = [
  // Documents
  "application/pdf",
  // Images — all formats Gemini supports
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/gif",
  "image/heic",
  "image/heif",
  // Plain text
  "text/plain",
  "text/csv",
];

export function isSupportedFileType(mimeType: string): boolean {
  return SUPPORTED_EXTRACT_TYPES.includes(mimeType);
}

// ---- Types ----

export interface ExtractedPolicyData {
  policyNumber: string | null;
  policyType: string | null;
  premium: number | null;
  startDate: string | null; // ISO string
  endDate: string | null; // ISO string
  insurerName: string | null;
  sumInsured: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  customerState: string | null;
  customerPincode: string | null;
  paymentFrequency: string | null;
  confidence: number; // 0-1
  rawText: string;

  // Policy-type-specific extracted fields
  motorCategory: string | null;        // "retail" | "fleet"
  vehicleNumber: string | null;
  vehicleType: string | null;
  healthPolicyType: string | null;     // "single" | "floater"
  planName: string | null;             // Health / Life plan name
  lifePlanType: string | null;         // "endowment" | "term_plan" | "ulip" | "moneyback"
  riskLocation: string | null;         // Fire / Burglary
  marinePolicyType: string | null;     // "single_transit" | "open_import" | "open_export" | "stop"
  liabilityType: string | null;        // "public" | "product"
  policyTenure: string | null;         // WC / Surety Bond (custom text)
  projectName: string | null;          // CAR-EAR / Surety Bond
  projectLocation: string | null;      // CAR-EAR / Surety Bond
  principal: string | null;            // CAR-EAR / Surety Bond
  suretyBondType: string | null;       // "bid_bond" | "performance_bond" | "mobilisation_bond" | "retention_bond"
}

// ---- Insurer Patterns ----

const INSURER_PATTERNS: Record<string, RegExp[]> = {
  "Bajaj Allianz": [/bajaj\s*allianz/i, /bajaj\s*general\s*insurance/i, /bajaj\s*general/i],
  "ICICI Lombard": [/icici\s*lombard/i],
  "HDFC Ergo": [/hdfc\s*ergo/i],
  "TATA AIG": [/tata\s*aig/i],
  "LIC": [/life\s*insurance\s*corporation/i, /\blic\b/i],
  "New India Assurance": [/new\s*india\s*assurance/i, /\bniacl\b/i, /nia\.\d+@newindia/i],
  "Star Health": [/star\s*health/i, /star\s*allied/i],
  "SBI General": [/sbi\s*general/i],
  "Reliance General": [/reliance\s*general/i],
  "United India": [/united\s*india\s*insurance/i],
  "Oriental Insurance": [/oriental\s*insurance/i],
  "National Insurance": [/national\s*insurance/i],
  "Cholamandalam MS": [/cholamandalam/i, /chola\s*ms/i],
  "Royal Sundaram": [/royal\s*sundaram/i],
  "Care Health": [/care\s*health/i],
  "Niva Bupa": [/niva\s*bupa/i, /max\s*bupa/i],
  "Universal Sompo": [/universal\s*sompo/i, /\busgi\b/i],
  "Go Digit": [/go\s*digit/i, /digit\s*general\s*insurance/i, /\bgodigit\b/i],
  "Acko": [/acko\s*general/i, /\backo\b/i],
  "Kotak General": [/kotak\s*general/i, /kotak\s*mahindra\s*general/i],
  "Future Generali": [/future\s*generali/i],
  "Manipal Cigna": [/manipal\s*cigna/i],
  "Shriram General": [/shriram\s*general/i, /shriram\s*gi/i],
  "Magma HDI": [/magma\s*hdi/i, /magma\s*general/i],
  "Liberty General": [/liberty\s*general/i, /liberty\s*insurance/i],
  "IFFCO Tokio": [/iffco\s*tokio/i],
};

const POLICY_TYPE_PATTERNS: Record<string, RegExp[]> = {
  motor: [
    /motor\s*(?:insurance|policy|vehicle)/i, /motor\s*(?:own\s*damage|od)/i,
    /vehicle\s+insurance/i, /vehicle\s+policy/i,
    /car\s*(?:insurance|package|policy)/i,
    /two\s*wheeler/i, /automobile\s*(?:insurance|policy)/i, /comprehensive.*motor/i,
    /goods\s*carrying/i, /passenger\s*carrying/i, /commercial\s*vehicle/i,
    /private\s*car\s*(?:package|policy)/i, /auto\s*secure/i,
    /\btp\s*premium/i, /\bod\s*premium/i,
  ],
  health: [/health\s*(?:insurance|policy)/i, /mediclaim/i, /medical\s*(?:insurance|policy)/i, /hospitali[sz]ation\s*(?:insurance|policy)/i, /critical\s*illness/i],
  life: [/life\s*insurance/i, /term\s*plan/i, /endowment/i, /ulip/i, /whole\s*life/i],
  fire: [
    /(?:standard\s*)?fire\s*(?:insurance|policy)/i, /property\s*(?:insurance|policy)/i, /building\s*insurance/i,
    /fire\s*(?:&|and)\s*(?:special\s*)?perils?/i, /shopkeeper\s*(?:insurance|policy)/i, /dwelling\s*(?:insurance|policy)/i,
    /sookshma\s*udyam/i, /flexi\s*sookshma/i, /bharat\s*flexi/i,
    /fire\s*products?\s*[-–]?\s*exclusions?/i,
  ],
  marine: [/marine/i, /cargo/i, /hull/i, /inland\s*transit/i],
  liability: [/(?:general|public|product|employers?)\s*liability\s*(?:insurance|policy)/i, /professional\s*indemnity/i, /directors.*officers/i, /d&o\s*(?:insurance|policy)/i, /workmen\s*compensation\s*(?:insurance|policy)/i],
  travel: [/travel\s*(?:insurance|policy)/i, /overseas\s*(?:mediclaim|insurance|travel)/i, /trip\s*insurance/i],
  engineering: [
    /contractors?\s*all\s*risks?\s*(?:insurance|policy)?/i,
    /erection\s*all\s*risks?/i, /machinery\s*(?:breakdown|insurance)\s*(?:policy)?/i,
    /boiler\s*(?:insurance|policy)/i, /electronic\s*equipment\s*(?:insurance|policy)/i,
  ],
};

// ---- Number Parsing ----

/**
 * Parse Indian comma-format numbers: 52,72,60,899 → 527260899
 * Also handles: 1,00,000 → 100000, Rs. 5,000.50 → 5000.50
 */
export function parseIndianNumber(str: string): number | null {
  if (!str) return null;

  // Remove currency symbols, "Rs.", "INR", spaces
  let cleaned = str
    .replace(/[₹$]/g, "")
    .replace(/rs\.?\s*/gi, "")
    .replace(/inr\s*/gi, "")
    .replace(/\s/g, "")
    .trim();

  if (!cleaned) return null;

  // Check if has decimal
  const decimalMatch = cleaned.match(/^([\d,]+)\.(\d{1,2})$/);
  if (decimalMatch) {
    const intPart = decimalMatch[1].replace(/,/g, "");
    const decPart = decimalMatch[2];
    const result = parseFloat(`${intPart}.${decPart}`);
    return isNaN(result) ? null : result;
  }

  // Remove all commas and parse
  cleaned = cleaned.replace(/,/g, "");
  const result = parseFloat(cleaned);
  return isNaN(result) ? null : result;
}

/**
 * Parse various Indian date formats:
 * - DD/MM/YYYY, DD-MM-YYYY
 * - DD/Mon/YYYY, DD-Mon-YYYY (e.g., 15-Jan-2026)
 * - YYYY-MM-DD (ISO)
 * - DD Month YYYY (e.g., 15 January 2026)
 *
 * Returns ISO date string (YYYY-MM-DD) or null
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(+y, +m - 1, +d);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // DD-Mon-YYYY or DD/Mon/YYYY
  const dMonY = s.match(/^(\d{1,2})[\/\-\s](\w{3,9})[\/\-\s,](\d{4})$/);
  if (dMonY) {
    const [, d, mon, y] = dMonY;
    const monthIdx = months[mon.toLowerCase()];
    if (monthIdx !== undefined) {
      const date = new Date(+y, monthIdx, +d);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
  }

  // DD-Mon-YY (2-digit year) e.g. "31-Dec-25" → 2025-12-31
  const dMonYY = s.match(/^(\d{1,2})[\/\-\s](\w{3,9})[\/\-\s,](\d{2})$/);
  if (dMonYY) {
    const [, d, mon, yy] = dMonYY;
    const monthIdx = months[mon.toLowerCase()];
    if (monthIdx !== undefined) {
      const fullYear = +yy >= 50 ? 1900 + +yy : 2000 + +yy;
      const date = new Date(fullYear, monthIdx, +d);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
  }

  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(s);
    if (!isNaN(date.getTime())) return s;
  }

  // DD Month YYYY
  const dFullMonY = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (dFullMonY) {
    const [, d, mon, y] = dFullMonY;
    const monthIdx = months[mon.toLowerCase()];
    if (monthIdx !== undefined) {
      const date = new Date(+y, monthIdx, +d);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
  }

  return null;
}

// ---- Core Extraction ----

/**
 * Extract raw text from a file using the external PDF text-extractor API.
 * Calls our server-side proxy (/api/extract-pdf) to avoid CORS issues.
 * The proxy forwards the file to the external service which uses
 * pdf-parse (digital) + Google Cloud Vision OCR (scanned pages).
 *
 * Returns the raw text extracted from all pages.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return extractTextFromExternalAPI(file);
}

/**
 * Response from the extraction proxy, including Gemini-structured data.
 */
interface ExtractionResponse {
  text: string;
  structuredData: {
    policyDetails?: {
      policyNumber?: string | null;
      policyType?: string | null;
      insurerName?: string | null;
      premium?: number | null;
      sumInsured?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      paymentFrequency?: string | null;
    };
    customerDetails?: {
      customerName?: string | null;
      customerPhone?: string | null;
      customerEmail?: string | null;
      customerAddress?: string | null;
      customerCity?: string | null;
      customerState?: string | null;
      customerPincode?: string | null;
    };
  } | null;
}

/**
 * Extract structured policy data from a file.
 * Main exported function.
 *
 * Strategy:
 * 1. Send file to external PDF extractor API (via server proxy)
 * 2. Use Gemini-extracted structured data from the API as primary source
 * 3. Fall back to regex pipeline for any fields Gemini missed
 *
 * @param file - PDF or image file
 * @returns Structured policy data with confidence score
 */
export async function extractPolicyDataFromFile(
  file: File
): Promise<ExtractedPolicyData> {
  const response = await callExtractionAPI(file);
  const regexResult = regexExtract(response.text);

  // If no structured data from Gemini, return regex result as-is
  if (!response.structuredData) {
    return regexResult;
  }

  const pd = response.structuredData.policyDetails;
  const cd = response.structuredData.customerDetails;

  // Check if Gemini returned meaningful data - if not, use regex entirely
  const hasMeaningfulGeminiData = pd?.policyNumber || cd?.customerName || pd?.premium || pd?.sumInsured;
  if (!hasMeaningfulGeminiData) {
    return { ...regexResult, rawText: response.text, confidence: regexResult.confidence };
  }

  // Merge: prefer Gemini structured data, fall back to regex for missing fields
  return {
    policyNumber: pd?.policyNumber || regexResult.policyNumber,
    policyType: pd?.policyType || regexResult.policyType,
    insurerName: pd?.insurerName || regexResult.insurerName,
    premium: pd?.premium ?? regexResult.premium,
    sumInsured: pd?.sumInsured ?? regexResult.sumInsured,
    startDate: pd?.startDate || regexResult.startDate,
    endDate: pd?.endDate || regexResult.endDate,
    paymentFrequency: pd?.paymentFrequency || regexResult.paymentFrequency,
    customerName: cd?.customerName || regexResult.customerName,
    customerPhone: cd?.customerPhone || regexResult.customerPhone,
    customerEmail: cd?.customerEmail || regexResult.customerEmail,
    customerAddress: cd?.customerAddress || regexResult.customerAddress,
    customerCity: cd?.customerCity || regexResult.customerCity,
    customerState: cd?.customerState || regexResult.customerState,
    customerPincode: cd?.customerPincode || regexResult.customerPincode,
    confidence: Math.max(
      response.structuredData ? 0.9 : 0,
      regexResult.confidence
    ),
    rawText: response.text,
    // Policy-type-specific fields (regex-only, Gemini doesn't extract these yet)
    motorCategory: regexResult.motorCategory,
    vehicleNumber: regexResult.vehicleNumber,
    vehicleType: regexResult.vehicleType,
    healthPolicyType: regexResult.healthPolicyType,
    planName: regexResult.planName,
    lifePlanType: regexResult.lifePlanType,
    riskLocation: regexResult.riskLocation,
    marinePolicyType: regexResult.marinePolicyType,
    liabilityType: regexResult.liabilityType,
    policyTenure: regexResult.policyTenure,
    projectName: regexResult.projectName,
    projectLocation: regexResult.projectLocation,
    principal: regexResult.principal,
    suretyBondType: regexResult.suretyBondType,
  };
}

/**
 * Regex-based extraction from raw text.
 */
function regexExtract(rawText: string): ExtractedPolicyData {
  const text = rawText;
  let confidence = 0;
  let confidenceFactors = 0;

  // ---- Insurer Detection ----
  // Prioritize insurer found in the first ~2000 chars (document header),
  // because later sections may reference other insurers (previous policy, reinsurer, etc.)
  let insurerName: string | null = null;
  const headerText = text.substring(0, 2000);
  // First pass: search header only
  for (const [insurer, patterns] of Object.entries(INSURER_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(headerText)) {
        insurerName = insurer;
        confidence += 0.15;
        break;
      }
    }
    if (insurerName) break;
  }
  // Second pass: full text (fallback if not found in header)
  if (!insurerName) {
    for (const [insurer, patterns] of Object.entries(INSURER_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          insurerName = insurer;
          confidence += 0.15;
          break;
        }
      }
      if (insurerName) break;
    }
  }
  confidenceFactors++;

  // ---- Policy Type Detection ----
  // Check specific types (engineering, fire) BEFORE generic ones (motor)
  // since motor keywords (e.g. "vehicle") appear in fire/engineering policies too
  let policyType: string | null = null;
  const typeCheckOrder = ["surety_bond", "car_ear", "workmen_compensation", "burglary", "fire", "marine", "motor", "liability", "life", "health", "travel"];
  for (const type of typeCheckOrder) {
    const patterns = POLICY_TYPE_PATTERNS[type];
    if (!patterns) continue;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        policyType = type;
        confidence += 0.1;
        break;
      }
    }
    if (policyType) break;
  }
  confidenceFactors++;

  // ---- Policy Number Extraction ----
  let policyNumber: string | null = null;
  const policyNumPatterns = [
    // Quotation Number (Marine/Commercial - PRIORITY): "Quotation Number QU-26-1302-1005-00000076"
    /quotation\s*(?:no|number)\s*[:\-]?\s*(QU-\d{2}-\d{4}-\d{4}-\d{8,12})/i,
    // Quote Reference (CAR/EAR): "Quote Reference No. BAGIC-ENG-..."
    /quote\s*reference\s*(?:no|number)\s*[:\-]?\s*([A-Z]{3,10}-[A-Z]{2,6}-[A-Z0-9\-]{5,30})/i,
    // Reliance Personal Accident: "Policy No : 600422529570002075" (18 digits - PRIORITY)
    /policy\s*no\s*:\s*(\d{18})\b/i,
    // ICICI Lombard table-based format (PRIORITY): "Policy No OG-26-1502-1901-00002652"
    /policy\s*no\.?\s*[:\t\-]?\s*(OG-\d{2}-\d{4}-\d{4}-\d{8,12})/i,
    // Bare OG- format (ICICI Lombard 5-part hyphenated)
    /\b(OG-\d{2}-\d{4}-\d{4}-\d{8,12})\b/,
    // Bare QU- format (Quotation numbers)
    /\b(QU-\d{2}-\d{4}-\d{4}-\d{8,12})\b/,
    // Star Health format: "Policy No: 5542111906093398" (13-16 digits)
    /policy\s*(?:no|number)\s*[:\-]?\s*(\d{13,16})\b/i,
    // Standard label: "Policy No. : AVO/2315/20053671" or "Policy Number: 42010011258700000070"
    /policy\s*(?:no|number|#)\s*[:\-.]?\s*([A-Z0-9\-\/\.]{6,30})/i,
    // Certificate number
    /certificate\s*(?:no|number)\s*[:\-.]?\s*([A-Z0-9\-\/\.]{6,30})/i,
    // Cover note
    /cover\s*note\s*(?:no|number)\s*[:\-.]?\s*([A-Z0-9\-\/\.]{6,30})/i,
    // Proposal number (fallback for quotations)
    /proposal\s*(?:no|number)\s*[:\-.]?\s*([A-Z0-9\-\/\.]{6,30})/i,
    // "Policy Number:" or "PolicyNumber:" (no space - PDF extraction artifact from Bajaj)
    /policy\s*number\s*[:\-]\s*([A-Z0-9\-\/\.\s]{6,30})/i,
    // Format: OG-26-1302-1801-00002652 (Bajaj dash format)
    /\b(OG[\-]\d{2}[\-]\d{4}[\-]\d{4}[\-]\d{8,11})\b/,
    // Format: AVO/2315/20053671 (Universal Sompo slash format)
    /\b([A-Z]{2,4}\/\d{4,5}\/\d{8,12})\b/,
    // New India Assurance format: long numeric (18-22 digits) with "Policy No" label
    /policy\s*(?:no|number)\s*[:\-.]?\s*(\d{18,22})/i,
    // SBI General zero-padded format: 0000000042196392 (16 digits)
    /(?:policy\s*(?:no|number)\s*[:\-.]?\s*)(0{5,}\d{8,12})/i,
    // Go Digit format: D246453460 (starts with D/letter + digits)
    /(?:policy\s*(?:no|number)\s*[:\-.]?\s*)([A-Z]\d{8,12})/i,
    // TATA AIG spaced format: 6301284018 02 00
    /(?:policy\s*(?:no|number)\s*[:\-.]?\s*)(\d{10}\s+\d{2}\s+\d{2})/i,
    // Format: P/NNNNNN/NN/NNNN/NNNNNN
    /(P\/\d{4,8}\/\d{2}\/\d{4}\/\d{4,10})/i,
    // Format with slashes: XX-YY-ZZZZ-WWWW-VVVVVVVV
    /([A-Z]{2,4}[\-\/]\d{2,4}[\-\/]\d{4,10}[\-\/]?\d{0,8})/,
    // Generic: "policy/certificate" then alphanumeric 8+ chars
    /(?:policy|certificate|ref)\s*(?:no\.?|number|#)?\s*[:\-.]?\s*([A-Z]\d{7,20})/i,
    // Bare long numeric on its own line (NIA policy numbers) - LAST RESORT
    /\b(\d{18,22})\b/,
  ];
  for (const pattern of policyNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      // Policy number must contain at least one digit and not be a common word
      if (/\d/.test(candidate) && !/^(insured|period|name|address|date|premium|the|of|from|to)$/i.test(candidate)) {
        // Skip UIN values (format: V followed by digits, like V02202223)
        if (/^V\d+$/i.test(candidate)) continue;
        // Skip CIN values (Corporate Identity Number: U66010PN2000PLC015329)
        if (/^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/i.test(candidate)) continue;
        // Skip intermediary codes (BA0000388292, SH36686)
        if (/^[A-Z]{2}\d{10}$|^[A-Z]{2}\d{5}$/i.test(candidate)) continue;
        // Skip Tax Invoice numbers (format: R200825169675 - starts with R followed by 12 digits)
        if (/^R\d{12}$/i.test(candidate)) continue;
        // Skip GST numbers (15 digits)
        if (/^\d{15}$/i.test(candidate)) continue;
        policyNumber = candidate;
        confidence += 0.15;
        break;
      }
    }
  }
  confidenceFactors++;

  // ---- Premium Amount ----
  let premium: number | null = null;
  const premiumPatterns = [
    // Quotation/Quote: "Gross Premium(in INR) 5,19,201.00" (Marine - PRIORITY)
    /gross\s*premium\s*\(in\s*inr\)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // CAR/EAR: "Total Premium With GST 968,930" (table format)
    /total\s*premium\s*with\s*gst\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Fire: "Total premium including GST : 1,21,911"
    /total\s*premium\s*including\s*(?:gst|tax)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Health Renewal: "Total Renewal Premium 17,142"
    /total\s*renewal\s*premium\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Total/gross/final premium (most specific — try first)
    /(?:total|gross|final|grand\s*total)\s*premium\s*(?:payable|amount|including\s*(?:gst|tax)|collected)?\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Total Policy Premium" (TATA AIG / Universal Sompo)
    /total\s*policy\s*premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Total Premium Collected" (SBI General)
    /total\s*premium\s*collected\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Total Payable in Rs" (New India Motor)
    /total\s*payable\s*(?:in\s*rs|amount)?\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Final Premium ( Rupees ... )" (Bajaj - has amount in parentheses after)
    /final\s*premium\s*[:\-]?\s*(?:\(\s*rupees[^)]*\))?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Net premium
    /net\s*premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Premium payable / amount
    /premium\s*(?:amount|payable)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Total amount / total payable (common in motor schedules)
    /total\s*(?:amount|payable)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Package premium (motor)
    /package\s*premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Total (`): 6,844" (New India backtick-rupee format)
    /total\s*\([`₹]\)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Amount with Rs./₹ immediately after "premium"
    /premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)/i,
    // Premium followed by /- (Indian format: Rs.5000/-)
    /premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*)?([\d,]+(?:\.\d{1,2})?)\s*\/-/i,
    // "an amount of Rs. 53221" (SBI receipt text)
    /amount\s*of\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)/i,
    // Base premium (Bajaj CAR format: "Base Premium 4,28,399")
    /base\s*premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Total Net Premium Payable (Excluding GST):INR 428399"
    /premium\s*payable\s*[\s\S]{0,40}?(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)([\d,]+(?:\.\d{1,2})?)/i,
    // General premium catch-all
    /premium\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of premiumPatterns) {
    const match = text.match(pattern);
    if (match) {
      premium = parseIndianNumber(match[1]);
      if (premium && premium > 0) {
        confidence += 0.15;
        break;
      }
    }
  }
  confidenceFactors++;

  // ---- Sum Insured ----
  let sumInsured: number | null = null;
  const siPatterns = [
    // Marine/Commercial: "Total Sum Insured(in INR) 5,000,000,000.00" (PRIORITY - handles large values)
    /total\s*sum\s*insured\s*\(in\s*inr\)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Marine: "Domestic Transit 5,000,000,000.00" (table format)
    /domestic\s*transit\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Commercial policies: Project Sum Insured / Contract Value (PRIORITY)
    /(?:project|contract)\s*(?:sum\s*insured|value|amount)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // CAR/EAR specific: "Section I (Material Damage) Completely Constructed/Erected Value * 1,207,539,494"
    /section\s*I\s*\(material\s*damage\)\s*[\s\S]{0,100}?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // CAR/EAR: Total Contract Price
    /(?:total\s*contract\s*(?:price|value)|contract\s*sum)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Fire: "Total Sum Insured : 80,000,000"
    /total\s*sum\s*insured\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Health: "Sum Insured(Rs.) 4,00,000" (table format)
    /sum\s*insured\s*\(rs\.?\)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Personal Accident: "Base Sum Insured: 1000000"
    /base\s*sum\s*insured\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Generic sum insured
    /sum\s*(?:insured|assured)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // IDV (motor-specific — Insured Declared Value)
    /(?:idv|insured\s*declared\s*value)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Total IDV (SBI General, TATA AIG)
    /total\s*(?:idv|value)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Vehicle value / market value
    /(?:vehicle\s*value|market\s*value)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Cover amount
    /cover\s*(?:amount|value)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Total SI / TSI
    /(?:total\s*(?:si|sum\s*insured)|tsi)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // Risk amount
    /risk\s*(?:amount|value)\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // "Sum Insured (Rs)" label in Bajaj CAR format
    /sum\s*insured\s*\(rs\)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "Insured\u2019s Declared Value: 1215000" (TATA AIG explicit, handles smart quotes)
    /insured(?:[\u2018\u2019's])?\s*declared\s*value\s*[:\-]?\s*(?:rs\.?\s*|₹\s*|â‚¹\s*|inr\s*|`\s*)?([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of siPatterns) {
    const match = text.match(pattern);
    if (match) {
      sumInsured = parseIndianNumber(match[1]);
      // Validate: sum insured should be reasonable (> 1000, < 1 trillion)
      if (sumInsured && sumInsured > 0 && sumInsured < 1e12) break;
      sumInsured = null; // Reset if garbage value
    }
  }

  // ---- Dates ----
  let startDate: string | null = null;
  let endDate: string | null = null;

  const datePatterns = [
    // Quotation: "From: 11-NOV-2025 and To: 10-NOV-2026" (Marine - PRIORITY)
    /from\s*[:\-]?\s*(\d{1,2}[\-\/]\w{3,9}[\-\/]\d{4})\s*and\s*to\s*[:\-]?\s*(\d{1,2}[\-\/]\w{3,9}[\-\/]\d{4})/i,
    // CAR/EAR: "Project Start Date * 30/07/2025 Project End date 30/01/2027"
    /project\s*start\s*date\s*[\*\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*project\s*end\s*date\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // Fire: "Period of Insurance : From: 01/01/2026 12:00:01 AM To: 31/12/2026 11:59:59 PM"
    /period\s*of\s*insurance\s*[:\-]?\s*from\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*[\d:]+\s*(?:am|pm)?\s*to\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // Health Renewal: "renewal on 12-Apr-2026"
    /renewal\s*on\s*(\d{1,2}[\-\/]\w{3,9}[\-\/]\d{4})/i,
    // "Contract Period: From DD/MM/YYYY To DD/MM/YYYY" (ICICI Lombard CAR format - PRIORITY)
    /contract\s*period\s*[:\-]?\s*(?:from\s*[:\-]?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:to\s*[:\-]?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Project Period: From DD/MM/YYYY To DD/MM/YYYY" (commercial policies)
    /(?:project|work)\s*(?:period|duration)\s*[:\-]?\s*(?:from\s*[:\-]?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:to\s*[:\-]?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Period of Insurance: from DD/MM/YYYY to DD/MM/YYYY" (handles "Midnight of:" and "To:" with colon)
    /period\s*(?:of\s*)?insurance\s*[:\-]?\s*(?:from\s*[:\-]?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|hours?)?)?\s*(?:to\s*[:\-]?|[-–]|upto|midnight\s*(?:of|on)?\s*[:\-]?)\s*(?:midnight\s*(?:of|on)?\s*[:\-]?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Period of cover DD/MM/YYYY HH:MM:SS AM to DD/MM/YYYY HH:MM:SS PM" (NIA motor)
    /period\s*of\s*cover\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)?\s*(?:to\s*[:\-]?|[-–])\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Policy Period: DD/MM/YYYY to DD/MM/YYYY"
    /policy\s*period\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|hours?)?)?\s*(?:to\s*[:\-]?|[-–]|upto)\s*(?:midnight\s*(?:of|on)?\s*[:\-]?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Cover Period: DD/MM/YYYY to DD/MM/YYYY"
    /cover\s*(?:period|from)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|hours?)?)?\s*(?:to\s*[:\-]?|[-–]|upto|midnight\s*(?:of|on)?\s*[:\-]?)\s*(?:midnight\s*(?:of|on)?\s*[:\-]?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Period of Policy" with From/To on separate or same line (Go Digit)
    /period\s*of\s*policy\s*[\s\S]{0,100}?(?:from\s*[:\-]?\s*)(\d{1,2}[\-\/]\w{3,9}[\-\/]\d{4})\s*[\s\S]{0,50}?(?:to\s*[:\-]?\s*)(\d{1,2}[\-\/]\w{3,9}[\-\/]\d{4})/i,
    // "Risk Start: DD/MM/YYYY Risk End: DD/MM/YYYY"  (may be on separate lines)
    /risk\s*(?:start|commencement)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "From: DD-Mon-YYYY To: DD-Mon-YYYY" (Bajaj format: 18-JAN-2026)
    /from\s*[:\-]?\s*(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{4})\s*(?:\d{1,2}:\d{2}\s*\(?\s*(?:hrs?|hours?)?\s*\)?)?\s*(?:to\s*[:\-]?\s*)(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{4})/i,
    // "FROM 00:00:00 OF DD/MM/YYYY TO MIDNIGHT OF DD/MM/YYYY" (Universal Sompo) / "From :DD/MM/YYYY" (SBI)
    /from\s*[:\-]?\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:of)?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|hours?)?)?\s*(?:to\s*[:\-]?\s*(?:midnight\s*(?:of|on)?\s*[:\-]?\s*)?)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "DD/MM/YYYY to DD/MM/YYYY" (bare date range without label)
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\s*(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|hours?)?)?\s*(?:to\s*[:\-]?|[-–]|upto)\s*(?:midnight\s*(?:of|on)?\s*[:\-]?\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // "Commencement Date: DD/MM/YYYY" / "Start Date: ..."
    /(?:start|commencement|inception|effective)\s*date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // Date with month name: "Period: 15-Jan-2026 to 14-Jan-2027"
    /(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{4})\s*(?:to\s*[:\-]?|[-–]|upto|till)\s*(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{4})/i,
    // YYYY-MM-DD date range (Go Digit table format)
    /(\d{4}-\d{2}-\d{2})\s*(?:to|[-–])\s*(\d{4}-\d{2}-\d{2})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1]) startDate = parseDate(match[1]);
      if (match[2]) endDate = parseDate(match[2]);
      if (startDate) {
        confidence += 0.1;
        break;
      }
    }
  }

  // Try separate end date pattern if not found
  if (!endDate) {
    const endPatterns = [
      /(?:expiry|end|maturity|valid\s*(?:up\s*to|till|until))\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
      /(?:expiry|end|maturity)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{4})/i,
      /(?:risk\s*end|cover\s*(?:end|to|till))\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
      // "Policy Expiry Date: Midnight on 17-JAN-2027" (Bajaj)
      /policy\s*expiry\s*(?:date)?\s*[:\-]?\s*(?:midnight\s*(?:of|on)?\s*[:\-]?\s*)?(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{2,4})/i,
      // "Policy End Date 30/01 /2027"
      /policy\s*end\s*date\s*(\d{1,2}[\/\-\.]\d{1,2}\s*[\/\-\.]\s*\d{4})/i,
    ];
    for (const pattern of endPatterns) {
      const match = text.match(pattern);
      if (match) {
        endDate = parseDate(match[1]);
        if (endDate) break;
      }
    }
  }

  // Try separate start date if not found yet
  if (!startDate) {
    const startPatterns = [
      /(?:risk\s*start|cover\s*(?:start|from)|date\s*of\s*(?:commencement|inception))\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
      /(?:w\.?e\.?f\.?|with\s*effect\s*from)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
      // "Policy Inception Date: From 00:01 O' Clock on 18-JAN-2026" (Bajaj)
      /policy\s*inception\s*date\s*[:\-]?\s*(?:from\s*)?(?:\d{1,2}:\d{2}\s*(?:o['']?\s*clock\s*)?(?:on)?\s*)?(\d{1,2}[\/\-\s]\w{3,9}[\/\-\s,]\d{2,4})/i,
      // "Inception Date: DD/MM/YYYY"
      /inception\s*date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
      // "Project Start Date * 30/07/2025"
      /project\s*start\s*date\s*[\*\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    ];
    for (const pattern of startPatterns) {
      const match = text.match(pattern);
      if (match) {
        startDate = parseDate(match[1]);
        if (startDate) break;
      }
    }
  }
  confidenceFactors++;

  // ---- Customer Name ----
  let customerName: string | null = null;

  /**
   * Sanitize extracted name to reject policy clause text and garbage.
   * Returns null if the name is invalid.
   */
  function sanitizeName(name: string): string | null {
    if (!name || name.length < 3) return null;
    
    // Only reject if the name is ALMOST ENTIRELY made of legal boilerplate
    // Real names might be next to words like "Policy" or "Renewal"
    const lowerName = name.toLowerCase();
    const boilerplateKeywords = [
      'subject to', 'pursuant to', 'acts of god', 'third party liability',
      'standard fire and special perils', 'herein mentioned', 'notwithstanding'
    ];
    
    for (const keyword of boilerplateKeywords) {
      if (lowerName === keyword || (lowerName.includes(keyword) && name.length > 50)) return null;
    }
    
    // Names usually shouldn't be extremely long sentences
    if (name.split(/\s+/).length > 8) return null;
    
    // Reject common non-name words if they are the ONLY word
    if (/^(insured|name|address|details|the|of|mr|mrs|ms|customer|policy|branch|office|sub|imd)$/i.test(name.trim())) return null;
    
    return name;
  }

  const namePatterns = [
    // "Customer Name: SHWETDHARA MILK PRODUCER COMPANY LIMITED" (Marine/Commercial - PRIORITY)
    /customer\s*name\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,80})/i,
    // "Proposer Name: TAROON GUPTA" (Health/Personal - PRIORITY)
    /proposer\s*(?:'s\s*)?name\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "Policyholder Name: Mr. Hari Kisan" (Personal Accident - PRIORITY)
    /policyholder\s*name\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "Contractor" / "Contractor Name" (ICICI Lombard CAR format)
    /contractor\s*(?:name)?\s*[:\-]?\s*([A-Z][A-Za-z\s\.&\(\)]{2,80})/i,
    // "Insured Name: BABA ANANDESHWAR PLASTICS" or "Insured Name\nBABA..."
    /insured(?:'s)?\s*name\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "Name of Insured: ..." or "Name & Address of Insured: ..."
    /name\s*(?:of|&)?\s*(?:the\s*)?(?:insured|policyholder|proposer|owner|assured|customer)\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "Name & Address of the Insured: RAJESH KUMAR" (common NIA format)
    /name\s*(?:&|and)\s*address\s*(?:of)?\s*(?:the\s*)?(?:insured|owner|policyholder)\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "NameandAddressofInsured:" (no spaces — PDF artifact from Bajaj Certificate)
    /nameandaddressof(?:the)?insured\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // Just "Name" followed by a person (Go Digit format)
    /(?:^|\n)\s*Name\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.]{2,50})/m,
    // "Assured/Member/Owner/Customer Name: ..."
    /(?:assured|member|owner|customer)\s*(?:'s\s*)?name\s*[:\-]?\s*(?:mr\.?|mrs\.?|ms\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "Insured: Mr. RAJESH KUMAR" (no explicit 'name' keyword)
    /(?:insured|proposer|policyholder)\s*[:\-]\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i,
    // "Dear SHRI BALAJI AND COMPANY" (welcome letter opening)
    /dear\s*(?:mr\.?|mrs\.?|ms\.?|m\/s\.?|shri|smt\.?)?\s*([A-Z][A-Z\s\.&\(\)]{2,60})/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = match[1].trim().replace(/\s+/g, " ");
      // Clean trailing noise: remove words that are clearly labels/sections, not name parts
      name = name
        .replace(/\s*(?:Customer\s*ID|Vehicle\s*Registration|Insured\s*Address|Customer|Policy|Address|Phone|Contact|Mobile|Email|GSTIN|PAN|Business\s*or\s*Profession|Business|Date|Period|Provided\s*that|Cover\s*Description|Registration\s*No|Vehicle|IDPOC|POC|Occupation|Profession|Branch\s*Office|Sub\s*IMD|IMD\s*Code|IMD\s*Name)[\s\S]*$/i, '')
        .trim();
      // Also truncate at common sentence-ending patterns
      name = name.replace(/\s+(?:E|A|The|Is|Of|At|In|On|No|For|By|And|Or|To)\s*$/i, '').trim();
      // Sanitize to reject garbage
      name = sanitizeName(name) || '';
      if (name.length > 2) {
        customerName = name;
        confidence += 0.1;
        break;
      }
    }
  }
  confidenceFactors++;

  // ---- Customer Phone ----
  let customerPhone: string | null = null;
  const phonePatterns = [
    // Full 10-digit phone with optional +91 prefix
    /(?:mobile|phone|contact|cell)\s*(?:no\.?|number)?\s*[:\-]?\s*\+?91[\-\s]?(\d{10})/i,
    /(?:mob|tel|ph)\s*[:\-]?\s*\+?91[\-\s]?(\d{10})/i,
    // Partially masked phones: 94******86, xxxxxxxx7646, ******1220, XXXXXX3337, 77**86**66
    /(?:mobile|phone|contact|cell|mob|tel|ph)\s*(?:no\.?|number)?\s*[:\-]?\s*\+?91[\-\s]?([\dxX\*]{10,12})/i,
    // Standalone 10-digit number near phone label (broader match)
    /(?:mobile|phone|mob)\s*[:\-]?\s*([6-9]\d{9})/i,
  ];
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      const phone = match[1].trim();
      // If phone is fully masked (all * or x), skip it
      if (/^[\*xX]+$/.test(phone)) continue;
      // Keep partially masked phones as-is (they still identify the customer)
      customerPhone = phone;
      break;
    }
  }

  // ---- Customer Email ----
  let customerEmail: string | null = null;
  // Known insurer email domains to exclude
  const INSURER_EMAIL_DOMAINS = [
    'newindia.co.in', 'niacl.com',
    'bajajallianz.co.in', 'bajajallianz.com',
    'icicilombard.com', 'icaborig.in',
    'hdfcergo.com', 'hdfcsec.com',
    'tataaig.com', 'tataaig.co.in',
    'starhealth.in', 'starhealthinsurance.com',
    'sbiinsurance.com', 'sbilife.co.in', 'sbigeneral.in',
    'orientalinsurance.co.in', 'oicl.com',
    'uiic.co.in',
    'nationalinsurance.nic.in', 'nicl.co.in',
    'royalsundaram.in', 'rsagroup.com',
    'godigit.com', 'digit.in',
    'reliancegeneral.co.in', 'relianceada.com',
    'aborig.in',
    'cholams.murugappa.com', 'cholainsurance.com',
    'careinsurance.com',
    'manipalcigna.com',
    'acaborig.in',
    'futuregenerali.in',
    'aborig.com',
    'maxbupa.com', 'nivabupa.com',
    'kotakgi.com',
    'magma.co.in',
    'libertyinsurance.in',
    'shriramgi.com',
    'universalsompo.com',
    'itgi.co.in',
    'aborig.co.in',
  ];
  // Find all emails and pick the first one that is NOT an insurer domain
  const allEmails = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
  for (const email of allEmails) {
    const lowerEmail = email.toLowerCase();
    const domain = lowerEmail.split('@')[1];
    const isInsurerEmail = INSURER_EMAIL_DOMAINS.some(
      (d) => domain === d || domain.endsWith('.' + d)
    );
    if (!isInsurerEmail) {
      customerEmail = lowerEmail;
      break;
    }
  }

  // ---- Customer Address ----
  let customerAddress: string | null = null;
  const addrPatterns = [
    // "Communication Address: ..." / "Address: ..."
    /(?:communication\s*)?address\s*[:\-]?\s*(.{10,200}?)(?:\n|pin\s*code|pin\s*:\s*\d|email|mobile|phone|$)/i,
    // "Residence / Correspondence Address: ..."
    /(?:residence|correspondence|mailing|permanent|registered)\s*(?:\/\s*\w+)?\s*address\s*[:\-]?\s*(.{10,200}?)(?:\n|pin\s*code|pin\s*:\s*\d|email|mobile|phone|$)/i,
    // "Name & Address of the Insured: NAME\n<address>" (NIA/Bajaj format - capture after name line)
    /name\s*(?:&|and)\s*address\s*(?:of)?\s*(?:the\s*)?insured\s*[:\-]?\s*\S+[^\n]*\n\s*(.{10,200}?)(?:\n\s*\n|pin\s*code|$)/i,
    // "Address of Insured: ..." / "Insured Address: ..."
    /(?:insured|proposer)\s*(?:'s)?\s*address\s*[:\-]?\s*(.{10,200}?)(?:\n|pin\s*code|pin\s*:\s*\d|email|mobile|phone|$)/i,
    // "Address " on its own line (Go Digit, Universal Sompo)
    /(?:^|\n)\s*Address\s*[:\-]?\s*(.{10,200}?)(?:\n|pin\s*code|pin\s*:\s*\d|email|mobile|phone|$)/m,
    // "NameandAddressofInsured:" (no-space PDF artifact) — capture multi-line after name
    /nameandaddressof(?:the)?insured\s*[:\-]?\s*\S+[^\n]*\n\s*(.{10,200}?)(?:\n\s*\n|pin\s*code|$)/i,
  ];
  for (const pattern of addrPatterns) {
    const match = text.match(pattern);
    if (match) {
      customerAddress = match[1].trim().replace(/\s+/g, " ");
      // Remove leading "U/C" or "C/O" prefix common in Indian addresses
      customerAddress = customerAddress.replace(/^(?:U\/C|C\/O|S\/O|D\/O|W\/O)\s*/i, '');
      // Remove trailing punctuation or common non-address text
      customerAddress = customerAddress.replace(/[,\s]+$/g, '');
      break;
    }
  }

  // ---- Customer City ----
  let customerCity: string | null = null;
  const cityPatterns = [
    /(?:city|town|district)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,30})/i,
    /(?:place|location|locality)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,30})/i,
    // Try to extract city from address (common format: "..., CITY, STATE, PINCODE")
    /,\s*([A-Z][a-zA-Z\s]{2,25})\s*,\s*(?:Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Delhi|Chandigarh|Puducherry|Jammu and Kashmir|Ladakh)/i,
    // RTO/registration city pattern (common in motor policies)
    /(?:rto|registration)\s*(?:location|office|city)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,30})/i,
  ];
  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match) {
      customerCity = match[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  // ---- Customer State ----
  let customerState: string | null = null;
  const INDIAN_STATES_LIST = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Delhi",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  ];
  for (const state of INDIAN_STATES_LIST) {
    if (text.toLowerCase().includes(state.toLowerCase())) {
      customerState = state;
      break;
    }
  }

  // ---- Customer Pincode ----
  let customerPincode: string | null = null;
  const pincodePatterns = [
    /(?:pin\s*code|pincode|pin|postal\s*code|zip)\s*[:\-]?\s*(\d{6})/i,
    /\b(\d{6})\b/,
  ];
  for (const pattern of pincodePatterns) {
    const match = text.match(pattern);
    if (match) {
      const pin = match[1];
      // Validate Indian pincode range (1xxxxx - 8xxxxx)
      if (+pin[0] >= 1 && +pin[0] <= 8) {
        customerPincode = pin;
        break;
      }
    }
  }

  // ---- Payment Frequency ----
  let paymentFrequency: string | null = null;
  const freqPatterns: Record<string, RegExp[]> = {
    annual: [/annual\s*premium/i, /yearly\s*premium/i, /per\s*annum/i],
    "semi-annual": [/semi[\-\s]annual/i, /half[\-\s]yearly/i, /bi[\-\s]annual/i],
    quarterly: [/quarterly/i, /every\s*3\s*months/i, /per\s*quarter/i],
    monthly: [/monthly\s*premium/i, /per\s*month/i, /monthly\s*installment/i],
    single: [/single\s*premium/i, /one[\-\s]time/i, /lump\s*sum/i],
  };
  for (const [freq, patterns] of Object.entries(freqPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        paymentFrequency = freq;
        break;
      }
    }
    if (paymentFrequency) break;
  }

  // ---- Final confidence ----
  const maxConfidence = confidenceFactors * 0.15;
  const normalizedConfidence = Math.min(confidence / Math.max(maxConfidence, 0.01), 1);

  // ---- Policy-type-specific field extraction ----
  let motorCategory: string | null = null;
  let vehicleNumber: string | null = null;
  let vehicleType: string | null = null;
  let healthPolicyType: string | null = null;
  let planName: string | null = null;
  let lifePlanType: string | null = null;
  let riskLocation: string | null = null;
  let marinePolicyType: string | null = null;
  let liabilityType: string | null = null;
  let policyTenure: string | null = null;
  let projectName: string | null = null;
  let projectLocation: string | null = null;
  let principal: string | null = null;
  let suretyBondType: string | null = null;

  if (policyType === "motor") {
    // Motor category: retail vs fleet
    if (/fleet/i.test(text)) motorCategory = "fleet";
    else motorCategory = "retail";
    // Vehicle number
    const vehNumMatch = text.match(/(?:registration\s*(?:no|number)|vehicle\s*(?:no|number|reg)|reg\.?\s*no)\s*[:\-.]?\s*([A-Z]{2}[\-\s]?\d{1,2}[\-\s]?[A-Z]{0,3}[\-\s]?\d{1,4})/i);
    if (vehNumMatch) vehicleNumber = vehNumMatch[1].trim();
    // Vehicle type
    const vehTypeMatch = text.match(/(?:vehicle\s*(?:type|class|category)|type\s*of\s*vehicle|body\s*type|class\s*of\s*vehicle)\s*[:\-.]?\s*([A-Za-z\s\-\/]{2,40})/i);
    if (vehTypeMatch) vehicleType = vehTypeMatch[1].trim().replace(/\s+/g, " ");
  }

  if (policyType === "health") {
    if (/floater|family\s*floater/i.test(text)) healthPolicyType = "floater";
    else if (/individual|single/i.test(text)) healthPolicyType = "single";
    const planMatch = text.match(/(?:plan\s*(?:name|type)|product\s*name|scheme\s*name)\s*[:\-.]?\s*([A-Za-z\s\-\.&]{3,60})/i);
    if (planMatch) planName = planMatch[1].trim().replace(/\s+/g, " ");
  }

  if (policyType === "life") {
    if (/endowment/i.test(text)) lifePlanType = "endowment";
    else if (/term\s*plan|term\s*(?:insurance|assurance)/i.test(text)) lifePlanType = "term_plan";
    else if (/ulip|unit\s*linked/i.test(text)) lifePlanType = "ulip";
    else if (/money\s*back/i.test(text)) lifePlanType = "moneyback";
    const planMatch = text.match(/(?:plan\s*(?:name|type)|product\s*name|scheme\s*name)\s*[:\-.]?\s*([A-Za-z\s\-\.&]{3,60})/i);
    if (planMatch) planName = planMatch[1].trim().replace(/\s+/g, " ");
  }

  if (policyType === "fire" || policyType === "burglary") {
    const locMatch = text.match(/(?:risk\s*(?:location|address)|location\s*of\s*risk|premises\s*address|property\s*(?:location|address)|situation\s*of\s*(?:the\s*)?(?:risk|property))\s*[:\-.]?\s*(.{5,150}?)(?:\n|pin\s*code|$)/i);
    if (locMatch) riskLocation = locMatch[1].trim().replace(/\s+/g, " ");
  }

  if (policyType === "marine") {
    if (/single\s*transit/i.test(text)) marinePolicyType = "single_transit";
    else if (/open\s*import/i.test(text)) marinePolicyType = "open_import";
    else if (/open\s*export/i.test(text)) marinePolicyType = "open_export";
    else if (/\bstop\b|specific\s*transit\s*open/i.test(text)) marinePolicyType = "stop";
  }

  if (policyType === "liability") {
    if (/public\s*liability/i.test(text)) liabilityType = "public";
    else if (/product\s*liability/i.test(text)) liabilityType = "product";
  }

  if (policyType === "workmen_compensation") {
    const tenureMatch = text.match(/(?:policy\s*(?:period|tenure)|period\s*of\s*(?:insurance|cover))\s*[:\-.]?\s*([\d]+\s*(?:month|year|day)s?)/i);
    if (tenureMatch) policyTenure = tenureMatch[1].trim();
  }

  if (policyType === "car_ear" || policyType === "surety_bond") {
    const projMatch = text.match(/(?:project\s*(?:name|title)|name\s*of\s*(?:the\s*)?project)\s*[:\-.]?\s*(.{3,100}?)(?:\n|$)/i);
    if (projMatch) projectName = projMatch[1].trim().replace(/\s+/g, " ");
    const projLocMatch = text.match(/(?:project\s*(?:location|site|address)|(?:location|site)\s*of\s*(?:the\s*)?project)\s*[:\-.]?\s*(.{3,150}?)(?:\n|$)/i);
    if (projLocMatch) projectLocation = projLocMatch[1].trim().replace(/\s+/g, " ");
    const principalMatch = text.match(/(?:principal|employer|contractee)\s*(?:'s\s*)?(?:name)?\s*[:\-.]?\s*([A-Z][A-Za-z\s\.&\(\)]{2,60})/i);
    if (principalMatch) principal = principalMatch[1].trim().replace(/\s+/g, " ");
  }

  if (policyType === "surety_bond") {
    if (/bid\s*bond/i.test(text)) suretyBondType = "bid_bond";
    else if (/performance\s*bond/i.test(text)) suretyBondType = "performance_bond";
    else if (/mobili[sz]ation\s*bond/i.test(text)) suretyBondType = "mobilisation_bond";
    else if (/retention\s*bond/i.test(text)) suretyBondType = "retention_bond";
    const tenureMatch = text.match(/(?:bond\s*(?:period|tenure|validity)|period\s*of\s*bond)\s*[:\-.]?\s*([\d]+\s*(?:month|year|day)s?)/i);
    if (tenureMatch) policyTenure = tenureMatch[1].trim();
  }

  return {
    policyNumber,
    policyType,
    premium,
    startDate,
    endDate,
    insurerName,
    sumInsured,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    customerCity,
    customerState,
    customerPincode,
    paymentFrequency,
    confidence: Math.round(normalizedConfidence * 100) / 100,
    rawText,
    motorCategory,
    vehicleNumber,
    vehicleType,
    healthPolicyType,
    planName,
    lifePlanType,
    riskLocation,
    marinePolicyType,
    liabilityType,
    policyTenure,
    projectName,
    projectLocation,
    principal,
    suretyBondType,
  };
}

/**
 * Extract text from a file using the external text-extractor API.
 * This is the core text extraction function used by all extraction methods.
 * Calls our server-side proxy (/api/extract-pdf) to avoid CORS issues.
 * The proxy forwards the file to the external service.
 * Returns the raw text extracted from all pages.
 */
export async function extractTextFromExternalAPI(file: File): Promise<string> {
  const response = await callExtractionAPI(file);
  return response.text;
}

/**
 * Call the extraction API proxy and return both raw text and structured data.
 */
async function callExtractionAPI(file: File): Promise<ExtractionResponse> {
  // Get the current Supabase session for auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Unauthorized — you must be signed in to extract document data.");
  }
  const idToken = session.access_token;

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-pdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
    signal: AbortSignal.timeout(90_000), // 90s client-side timeout (server has 60s)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const detail = errData?.detail ? ` (${errData.detail})` : "";
    const msg = (errData?.error ?? response.statusText) + detail;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data.text || "";

  if (!rawText || rawText.trim().length === 0) {
    throw new Error("External API returned empty text. The PDF may be scanned/image-only.");
  }

  return {
    text: rawText,
    structuredData: data.structuredData || null,
  };
}

/**
 * @deprecated Use extractPolicyDataFromFile instead.
 * Kept for backward compatibility.
 */
export const extractPolicyDataFromPdf = extractPolicyDataFromFile;

/**
 * @deprecated Use extractTextFromFile instead.
 * Kept for backward compatibility.
 */
export const extractTextFromPdf = extractTextFromFile;
