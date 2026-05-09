# Issue Policy Flow - Complete Documentation

## Overview
This document explains the complete flow when a user clicks "Issue Policy" from a Business Case detail page.

## Flow Steps

### Step 1: Business Case Detail Page
**File**: `app/dashboard/business-cases/[id]/page.tsx`

User is viewing a business case and clicks the "Issue Policy" button.

**What happens:**
1. Button click triggers `handleIssuePolicy()` function
2. Function extracts data from the business case:
   - `category` (from `bc.lob`) - e.g., 'motor', 'health', 'life', 'commercial'
   - `action` - set to 'fresh' (new policy)
   - `customer_id` - the customer associated with this case
   - `case_id` - the business case ID
   - `insurer` - insurer name from business case payload
   - `premium` - estimated premium from business case payload
3. Constructs URL with query parameters:
   ```
   /dashboard/intake?category=motor&action=fresh&customer_id=xxx&case_id=xxx&insurer=Bajaj&premium=5000
   ```
4. Navigates to intake page with pre-filled data

### Step 2: Intake Page - Auto-Load Pre-filled Data
**File**: `app/dashboard/intake/page.tsx`

The intake page loads and reads URL parameters.

**What happens:**
1. `useSearchParams()` hook reads URL parameters
2. `useEffect` runs on mount and:
   - Sets `selection.category` from URL param
   - Sets `selection.action` from URL param
   - Pre-fills `productData.insurer` and `productData.premium`
   - Fetches customer data using `customer_id` and sets:
     - `customer` state
     - `productData.name` and `productData.phone`
3. **Automatically skips to Step 3 (Upload)** - bypasses category and action selection
4. Console logs show: `[Intake] URL params:` and `[Intake] Skipping to upload step (step 3)`

### Step 3: Upload PDF Document
**Component**: `OCRUpload`

User uploads a policy document (PDF/image).

**What happens:**
1. User drags/drops or selects a PDF file
2. File is uploaded to PDF extractor API
3. Extraction process runs (Gemini AI + Regex fallback)
4. Extracted data is merged with pre-filled data from business case
5. Automatically advances to Step 4 (Review)

### Step 4: Side-by-Side Review
**Component**: `SideBySideReview`

User reviews and edits extracted data.

**What happens:**
1. Left pane shows the uploaded PDF document
2. Right pane shows extracted fields with confidence indicators:
   - ✅ **Green** - Field extracted successfully
   - ⚠️ **Amber** - Low confidence extraction
   - ❌ **Red** - Field not found (empty)
3. User can edit any field:
   - Customer name, phone, email
   - Policy number, sum insured, premium
   - Start/end dates, insurer name
   - Category-specific fields (motor: reg number, chassis, etc.)
4. **Pre-filled data from business case is already populated**:
   - Customer name and phone (from customer_id)
   - Insurer name (from business case)
   - Premium (from business case)
5. User clicks "Confirm & Continue" to proceed

### Step 5: Product-Specific Form
**Component**: `ProductForm`

User fills in additional product-specific details.

**What happens:**
1. Form shows fields specific to the policy category:
   - **Motor**: Vehicle details, addons, NCB, IDV
   - **Life**: Plan details, nominee, payment terms
   - **Health**: Plan type, coverage details
   - **Commercial**: Risk details, occupancy, project info
2. Fields are pre-filled from PDF extraction (if available)
3. User completes any missing fields
4. Clicks "Next" to proceed

### Step 6: Final Summary
**Component**: `FinalSummary`

User reviews complete policy details before creation.

**What happens:**
1. Shows summary of all entered data:
   - Category and action
   - Customer details
   - Policy details
   - Product-specific details
2. User clicks "Create Policy" button
3. `handleFinalExecution()` function runs:
   - Creates/updates customer record (if needed)
   - **Uploads the PDF document to Supabase Storage** (new!)
     - Path: `policies/{customer_id}/{policy_number}_{filename}.pdf`
     - Bucket: `policy-documents`
     - Returns signed download URL
   - Creates policy record in database with document URL
   - Updates business case with policy information
   - Redirects to business case detail page

### Step 7: Policy Created
User is redirected back to the business case detail page with the newly created policy linked.

**Policy record includes:**
- All policy details (number, dates, premium, sum insured)
- Customer information
- Product-specific data
- **PDF document URL** (stored in `document_url` field)

## Data Flow Diagram

```
Business Case Detail
       ↓ (Issue Policy button)
       ↓ URL params: category, action, customer_id, case_id, insurer, premium
       ↓
Intake Page (Step 0-2 SKIPPED)
       ↓ Pre-filled: category, action, customer, insurer, premium
       ↓
Upload PDF (Step 3)
       ↓ Extract data from PDF
       ↓ Merge with pre-filled data
       ↓ STORE PDF FILE in state
       ↓
Side-by-Side Review (Step 4)
       ↓ User verifies/edits all fields
       ↓ Pre-filled data + Extracted data
       ↓ PDF file preview shown
       ↓
Product Form (Step 5)
       ↓ User completes product-specific fields
       ↓
Final Summary (Step 6)
       ↓ User confirms and creates policy
       ↓ UPLOAD PDF to Supabase Storage
       ↓ Create policy with document URL
       ↓
Policy Created → PDF Stored → Business Case Updated
```

## Key Features

### 1. Smart Pre-filling
- Customer data loaded from database using `customer_id`
- Insurer and premium pre-filled from business case
- Category and action pre-selected
- Steps 0-2 automatically skipped

### 2. PDF Extraction Enhancement
- Gemini AI extraction (when quota available)
- Regex fallback extraction (always runs)
- Merged results (best of both)
- Confidence indicators for each field

### 3. User Verification
- Side-by-side PDF preview and field editor
- Visual confidence indicators (green/amber/red)
- Editable fields for corrections
- Validation before proceeding
- **PDF file retained throughout the flow**

### 4. Category-Specific Forms
- Motor: Vehicle details, addons, NCB
- Life: Nominee, payment terms, plan details
- Health: Plan type, coverage
- Commercial: Risk details, project info

### 5. Document Storage
- **PDF uploaded to Supabase Storage**
- Stored in `policy-documents` bucket
- Path: `policies/{customer_id}/{policy_number}_{filename}.pdf`
- Signed download URL stored in policy record
- Accessible for future reference and verification

## Console Logs for Debugging

### Business Case Page
```
[BusinessCase] Component render { caseId: '...', isLoading: false, ... }
[BusinessCase] Business case data: { found: true, status: 'open', ... }
[BusinessCase] Issue Policy clicked { bc: '...', status: 'open' }
[BusinessCase] Navigating to: /dashboard/intake?category=...
```

### Intake Page
```
[Intake] URL params: { category: 'motor', action: 'fresh', customerId: '...', ... }
[Intake] Loaded customer from URL: John Doe
[Intake] Skipping to upload step (step 3)
[Intake] Extract PDF success: { hasText: true, policyNumber: '...', ... }
[Intake] Regex extraction result: { policyNumber: '...', customerName: '...', ... }
```

### Side-by-Side Review
```
[SideBySideReview] extractedData updated: { name: 'John Doe', policy_no: '...', ... }
```

## Files Modified

1. **app/dashboard/business-cases/[id]/page.tsx**
   - Added console logging for debugging
   - Added pointer-events fix for button clicks
   - Enhanced error handling in `handleIssuePolicy`

2. **app/dashboard/intake/page.tsx**
   - Added `useSearchParams` hook
   - Added `useEffect` to read URL parameters
   - Pre-fills selection, customer, and product data
   - Auto-skips to upload step when coming from business case
   - Fetches customer data from database

3. **lib/helpers/pdf-extractor.ts**
   - Improved regex patterns for better extraction
   - Added sanitization for customer names
   - Added support for large commercial values
   - Added quotation number patterns

## Testing the Flow

1. **Create a Business Case**:
   - Go to Business Cases page
   - Create a new case with customer, insurer, and premium

2. **Click "Issue Policy"**:
   - Open the business case detail page
   - Click "Issue Policy" button
   - Verify redirect to intake page

3. **Check Pre-filled Data**:
   - Open browser console (F12)
   - Look for `[Intake] URL params:` log
   - Verify customer name appears in the form

4. **Upload PDF**:
   - Upload one of the sample PDFs from `public/pdf/`
   - Wait for extraction to complete
   - Check console for extraction logs

5. **Review Extracted Data**:
   - Verify PDF preview shows on left
   - Verify fields show on right with confidence indicators
   - Verify pre-filled data (customer, insurer, premium) is present
   - Edit any incorrect fields

6. **Complete Flow**:
   - Click "Confirm & Continue"
   - Fill product-specific form
   - Review final summary
   - Click "Create Policy"
   - Verify redirect to business case page

## Common Issues

### Issue 1: URL Parameters Not Read
**Symptom**: Intake page starts at step 0 instead of step 3
**Solution**: Check console for `[Intake] URL params:` log - should show category, action, customer_id

### Issue 2: Customer Data Not Loading
**Symptom**: Customer name/phone not pre-filled
**Solution**: Check console for `[Intake] Loaded customer from URL:` log - verify customer_id is valid

### Issue 3: PDF Extraction Overwrites Pre-filled Data
**Symptom**: Insurer or premium from business case gets replaced by PDF extraction
**Solution**: This is expected - PDF data takes precedence. User can edit in review step.

### Issue 4: Steps Not Skipping
**Symptom**: User has to manually select category and action
**Solution**: Verify URL has all required params: category, action, customer_id
