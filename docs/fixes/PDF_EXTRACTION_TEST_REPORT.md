# PDF Extraction Test Report

**Test Date:** April 30, 2026  
**BAPF URL:** http://localhost:3000  
**PDF Extractor URL:** https://pdf-extractor-pi-eight.vercel.app  
**Status:** Diagnostic Mode

---

## 1. PDF Extractor Service Health Check

### Deployed Extractor Status
```bash
GET https://pdf-extractor-pi-eight.vercel.app/api/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.3",
  "timestamp": "2026-04-30T08:25:13.322Z",
  "visionApiKeyConfigured": true,
  "geminiApiKeyConfigured": true,
  "maxFileSize": "20MB"
}
```

✅ **Status:** Service is running and API keys are configured

---

## 2. Error Analysis

### Error Location
```
File: app/dashboard/intake/page.tsx:120
Function: handleUpload
Error: "Failed to extract PDF text"
```

### Possible Causes

Based on the error flow, the failure can occur at these points:

1. **Rate Limiting (Status 429)**
   - The `protect()` middleware limits to 10 requests/minute
   - If user uploads multiple PDFs quickly, this could trigger

2. **Authentication Failure (Status 401)**
   - `requireAuth()` checks for valid Bearer token
   - Session might have expired
   - User role not in ["admin", "manager", "employee"]

3. **External API Failure (Status 502)**
   - PDF extractor service timeout (90s limit)
   - PDF too large (>20MB)
   - Gemini API quota exceeded
   - Google Vision API key invalid

4. **File Upload Issues (Status 400)**
   - No file provided
   - File not a valid Blob
   - File type not supported

---

## 3. Diagnostic Steps

### Step 1: Check Browser Console
Look for these log messages when uploading:
```
[Intake] Extract PDF error: {status: XXX, error: "...", detail: "..."}
```

### Step 2: Check Server Logs
Look for these log messages in BAPF server:
```
[extract-pdf] Using PDF extractor: https://pdf-extractor-pi-eight.vercel.app/api/upload
[extract-pdf] Forwarding to: https://pdf-extractor-pi-eight.vercel.app/api/upload
[extract-pdf] External API response: SUCCESS / FAILED
[extract-pdf] Error: <error message>
```

### Step 3: Test Direct API Call
```bash
curl -X POST https://pdf-extractor-pi-eight.vercel.app/api/upload \
  -F "pdf=@/path/to/test.pdf" \
  -v
```

---

## 4. Test Plan

### Test Case 1: Motor Policy PDF (Private Car)
**Expected Data:**
- Customer Name: TAROON GUPTA
- Policy Number: POL-UP78GS1006
- Policy Type: motor
- Registration: UP78GS1006
- Premium: ~₹12,500
- Sum Insured: ~₹450,000

**Test Steps:**
1. Go to Intake Desk
2. Click "Auto-Detect"
3. Select "New Onboarding"
4. Upload motor policy PDF
5. Verify extraction results

**Expected Flow:**
```
Upload PDF → Extract Text → Gemini AI Parse → 
Detect 'motor' type → Set category='motor' → 
Fill form with extracted data → Show SideBySideReview
```

### Test Case 2: Health Policy PDF (Star Health)
**Expected Data:**
- Customer Name: TAROON GUPTA
- Policy Type: health
- Insurer: Star Health

**Test Steps:**
1. Select Health category
2. Select New Policy action
3. Search for existing customer
4. Upload health policy PDF
5. Verify category auto-detection overrides manual selection

### Test Case 3: Renewal with Smart Suggestions
**Test Steps:**
1. Select Motor category
2. Select Renewal action
3. Verify "Urgent Renewals [motor]" section appears
4. Click on suggested customer with overdue renewal
5. Upload PDF (should skip to review)

---

## 5. Data Flow Verification

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│  BAPF Frontend (Intake Desk)                                     │
│  - User uploads PDF                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST /api/extract-pdf
                       │ FormData: file
                       │ Headers: Authorization: Bearer <token>
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  BAPF API Route (/api/extract-pdf)                               │
│  - Rate limit check (10 req/min)                                 │
│  - Auth check (admin/manager/employee)                           │
│  - Forward file to external API                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST https://pdf-extractor-pi-eight...
                       │ FormData: pdf
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  PDF Extractor Service (Vercel)                                  │
│  1. Receive PDF via multer                                       │
│  2. Extract text (pdf-parse + Google Vision OCR)                 │
│  3. Send to Gemini AI for structured extraction                │
│  4. Return: {success, data: {combinedText, structuredData}}    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ JSON Response
                       │ {success: true, data: {...}}
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  BAPF API Route                                                  │
│  - Extract text from data.data.combinedText                      │
│  - Extract structuredData from data.data.structuredData          │
│  - Return: {text, structuredData}                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ JSON Response
                       │ {text: "...", structuredData: {...}}
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  BAPF Frontend                                                   │
│  - Check if structuredData exists                                │
│  - Extract policyDetails & customerDetails                       │
│  - Map policyType to category (motor/health/life/commercial)   │
│  - Set selection.category = detectedCategory                     │
│  - Fill productData with extracted values                        │
│  - Navigate to SideBySideReview                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Mapping Verification

### Extracted Data Structure
```typescript
// From Gemini AI (structuredData)
{
  policyDetails: {
    policyNumber: string | null;
    policyType: "motor" | "health" | "life" | "fire" | "marine" | null;
    insurerName: string | null;
    premium: number | null;
    sumInsured: number | null;
    startDate: string | null; // YYYY-MM-DD
    endDate: string | null;     // YYYY-MM-DD
    paymentFrequency: string | null;
  },
  customerDetails: {
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    customerAddress: string | null;
    customerCity: string | null;
    customerState: string | null;
    customerPincode: string | null;
  }
}
```

### Mapped to Form Fields
```typescript
setProductData({
  policy_no:    pd.policyNumber    || "",
  premium:      pd.premium?.toString() || "",
  sum_assured:  pd.sumInsured?.toString() || "",
  name:         cd.customerName    || "",
  phone:        cd.customerPhone   || "",
  email:        cd.customerEmail   || "",
  pan:          "", // Not extracted by Gemini
  
  // Motor specific (from regex fallback)
  reg_number:   "",
  make:         "",
  model:        "",
});
```

---

## 7. Known Limitations

### Current Implementation
1. **Gemini AI only extracts basic fields** - No vehicle details (make, model, reg number)
2. **Motor-specific fields use regex fallback** - Only if text contains patterns like "UP78GS1006"
3. **No PAN extraction** - Customer needs to enter manually
4. **No address parsing** - Address, city, state, pincode extraction not implemented

### PDF Quality Issues
1. **Scanned PDFs** - OCR accuracy depends on scan quality
2. **Image-based PDFs** - Require Google Vision API (working)
3. **Multi-page PDFs** - Should work but not thoroughly tested
4. **Large PDFs** - >20MB rejected by extractor

---

## 8. Recommendations

### Immediate Fixes Needed
1. ✅ Add better error logging (DONE)
2. 🔧 Test with actual PDF to identify specific failure point
3. 🔧 Verify token/session is valid during upload
4. 🔧 Add retry logic for transient failures

### Future Enhancements
1. Add motor vehicle detail extraction (regex improvements)
2. Cache extraction results to avoid re-processing
3. Add extraction confidence scores
4. Manual correction tracking for AI training

---

## 9. Next Steps

### To Fix Current Error:
1. **Check browser console** for detailed error message
2. **Check BAPF server logs** for `[extract-pdf]` messages
3. **Verify user session** is valid (not expired)
4. **Test direct API call** with same PDF
5. **Check file size** is under 20MB

### To Test Full Flow:
1. Use sample PDF from `pdf-text-extractor/pdf/` folder
2. Upload via Intake Desk
3. Monitor console logs at each step
4. Verify data appears in SideBySideReview
5. Confirm customer auto-creation works

---

**Report Generated:** April 30, 2026  
**Next Update:** After diagnostic testing
