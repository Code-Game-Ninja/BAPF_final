import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini AI Service
 * 
 * Used to intelligently structure raw text extracted from insurance policies.
 */

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface StructuredPolicyData {
  policyDetails: {
    policyNumber: string | null;
    policyType: string | null;
    insurerName: string | null;
    premium: number | null;
    sumInsured: number | null;
    startDate: string | null; // ISO Date YYYY-MM-DD
    endDate: string | null;   // ISO Date YYYY-MM-DD
    paymentFrequency: string | null;
  };
  customerDetails: {
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    customerAddress: string | null;
    customerCity: string | null;
    customerState: string | null;
    customerPincode: string | null;
  };
}

/**
 * Uses Gemini 1.5 Pro to extract structured data from raw policy text.
 */
export async function extractStructuredData(rawText: string): Promise<StructuredPolicyData | null> {
  if (!genAI) {
    console.warn("[Gemini] API key missing. Skipping structured extraction.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an expert insurance data assistant specializing in Indian Insurance Policies.
      Extract structured data from the following raw text extracted via OCR. 
      
      RULES:
      1. Dates MUST be in YYYY-MM-DD format.
      2. Currency/Numbers MUST be numeric only (no commas, no "Rs").
      3. If a field is not found, return null.
      4. Insurer Name should be normalized (e.g., "HDFC ERGO General Insurance Co Ltd" -> "HDFC Ergo").
      5. Policy Type should be one of: motor, health, life, fire, marine, liability, travel, engineering, car_ear, workmen_compensation, surety_bond.
      6. Payment Frequency: annual, semi-annual, quarterly, monthly, single.
      
      RAW TEXT:
      ${rawText.substring(0, 30000)}
      
      Return a JSON object matching this schema:
      {
        "policyDetails": {
          "policyNumber": string | null,
          "policyType": string | null,
          "insurerName": string | null,
          "premium": number | null,
          "sumInsured": number | null,
          "startDate": string | null,
          "endDate": string | null,
          "paymentFrequency": string | null
        },
        "customerDetails": {
          "customerName": string | null,
          "customerPhone": string | null,
          "customerEmail": string | null,
          "customerAddress": string | null,
          "customerCity": string | null,
          "customerState": string | null,
          "customerPincode": string | null
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text) as StructuredPolicyData;
  } catch (error) {
    console.error("[Gemini] Extraction failed:", error);
    return null;
  }
}
