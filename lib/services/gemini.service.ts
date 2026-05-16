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
  commercialDetails?: {
    riskDetails: string | null;
    occupancy: string | null;
    fireSi: number | null;
  };
  motorDetails?: {
    regNumber: string | null;
    chassisNumber: string | null;
    engineNumber: string | null;
    make: string | null;
    model: string | null;
  };
  members?: Array<{
    name: string;
    dob?: string | null;
    age?: string | null;
    relation?: string | null;
  }>;
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
      RAW TEXT:
      ${rawText.substring(0, 30000)}
      
      Extract the following fields with high precision:
      - policyNumber: The unique identification number of the policy.
      - policyType: Exactly one of [motor, health, life, fire, marine, liability, travel, engineering, car_ear, workmen_compensation, surety_bond].
      - insurerName: The name of the insurance company (e.g., HDFC Ergo, ICICI Lombard, Star Health).
      - premium: The total premium amount (numeric only).
      - sumInsured: The total coverage amount (numeric only).
      - startDate: Policy inception date (YYYY-MM-DD).
      - endDate: Policy expiry date (YYYY-MM-DD).
      
      CUSTOMER DETAILS:
      - customerName: The primary insured person or entity name. Look for "Proposer Name", "Name of the Insured", or "Customer Name".
      - customerPhone: Contact number (often 10 digits starting with 6-9).
      - customerEmail: Email address.
      - customerAddress: Full communication address.

      COMMERCIAL/RISK DETAILS (If applicable):
      - riskDetails: A concise description of the risk/property (e.g., "Chemical Factory", "Warehouse with Electronics").
      - occupancy: The type of use for the building/premises.
      - fireSi: Sum Insured specific to Fire/Terrorism.

      MOTOR DETAILS (If applicable):
      - regNumber: Registration number of the vehicle.
      - make/model: Manufacturer and model of the vehicle.

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
        },
        "commercialDetails": {
          "riskDetails": string | null,
          "occupancy": string | null,
          "fireSi": number | null
        },
        "motorDetails": {
          "regNumber": string | null,
          "make": string | null,
          "model": string | null
        },
        "members": Array<{
          "name": string,
          "dob": string | null,
          "age": string | null,
          "relation": string | null
        }>
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
