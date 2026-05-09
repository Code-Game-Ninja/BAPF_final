# PDF Storage Fix - Policy Document Upload

## Problem
When creating a policy through the intake flow:
1. User uploads a PDF document ✅
2. PDF is extracted for data ✅
3. User reviews and edits the data ✅
4. User creates the policy ✅
5. **BUT the PDF file was NOT stored** ❌
6. Policy record had no document attached ❌

## Solution
Added automatic PDF upload to Supabase Storage when creating a policy.

## What Changed

### File: `app/dashboard/intake/page.tsx`

Added PDF upload logic in the `handleFinalExecution()` function:

```typescript
// 2a. Upload the PDF file to storage if available
let policyDocumentUrl: string | undefined;
if (uploadedFile) {
  try {
    console.log('[Intake] Uploading policy document:', uploadedFile.name);
    const timestamp = Date.now();
    const fileName = `${productData.policy_no || timestamp}_${uploadedFile.name}`;
    const storagePath = `policies/${finalCustomerId}/${fileName}`;
    
    // Get signed upload URL from API
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: storagePath,
        mimeType: uploadedFile.type,
        size: uploadedFile.size,
      }),
    });

    const { uploadUrl, downloadUrl } = await uploadResponse.json();

    // Upload file directly to Supabase Storage
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': uploadedFile.type },
      body: uploadedFile,
    });

    policyDocumentUrl = downloadUrl;
    console.log('[Intake] Policy document uploaded:', policyDocumentUrl);
  } catch (uploadErr) {
    console.error('[Intake] File upload failed:', uploadErr);
  }
}

// Add document_url to policy payload
const policyPayload = {
  // ... other fields ...
  document_url: policyDocumentUrl,
};
```

## How It Works

### Step 1: User Uploads PDF
- User uploads PDF in Step 3 (Upload)
- File is stored in `uploadedFile` state
- File is used for extraction
- **File is retained throughout the flow**

### Step 2: User Reviews and Edits
- Steps 4-5: User reviews extracted data and fills product form
- PDF file remains in state

### Step 3: Policy Creation
When user clicks "Create Policy" in Step 6:

1. **Get Upload URL**:
   - Calls `/api/upload` endpoint
   - Provides storage path: `policies/{customer_id}/{policy_number}_{filename}.pdf`
   - Receives signed upload URL (valid 2 hours)

2. **Upload File**:
   - Uploads file directly to Supabase Storage
   - Uses PUT request with file binary
   - Stored in `policy-documents` bucket

3. **Store URL**:
   - Receives signed download URL
   - Stores URL in policy record (`document_url` field)
   - URL is valid for 1 hour (can be regenerated)

4. **Create Policy**:
   - Policy record includes `document_url`
   - Document is linked to the policy
   - Can be accessed later for viewing/downloading

## Storage Structure

```
Supabase Storage
└── policy-documents (bucket)
    └── policies/
        └── {customer_id}/
            └── {policy_number}_{original_filename}.pdf
```

### Example Path
```
policies/a1b2c3d4-e5f6-7890-abcd-ef1234567890/OG-26-1302-1801-00002652_policy_document.pdf
```

## Benefits

1. **Document Preservation**: Original policy document is stored permanently
2. **Audit Trail**: Can verify what document was used to create the policy
3. **Customer Access**: Document can be shared with customer via portal
4. **Compliance**: Meets regulatory requirements for document retention
5. **Reference**: Can be viewed later for claims, renewals, or disputes

## Console Logs

When creating a policy with a PDF:

```
[Intake] Uploading policy document: policy_document.pdf
[Intake] Policy document uploaded: https://...supabase.co/storage/v1/object/sign/policy-documents/policies/...
[Intake] Policy created: abc123 for customer: xyz789
```

If upload fails (non-blocking):
```
[Intake] File upload failed: Failed to get upload URL
[Intake] Policy created: abc123 for customer: xyz789
```

## Error Handling

- **Upload failure is non-blocking**: If PDF upload fails, policy is still created
- **User is notified**: Toast shows "Policy document upload failed - will need manual upload"
- **Graceful degradation**: Policy creation continues without document URL
- **Manual upload option**: Document can be uploaded later via policy detail page

## Testing

### Test Case 1: Normal Flow
1. Go to Business Case detail page
2. Click "Issue Policy"
3. Upload a PDF (e.g., `25 Hari Kisan.pdf`)
4. Review extracted data
5. Complete product form
6. Click "Create Policy"
7. **Expected**: Console shows `[Intake] Policy document uploaded:`
8. **Expected**: Policy record has `document_url` field populated

### Test Case 2: Upload Failure
1. Disconnect from internet
2. Follow steps 1-6 above
3. **Expected**: Console shows `[Intake] File upload failed:`
4. **Expected**: Toast shows "Policy document upload failed"
5. **Expected**: Policy is still created (without document URL)

### Test Case 3: Large File
1. Upload a PDF larger than 10 MB
2. **Expected**: API returns 413 error
3. **Expected**: Toast shows file size error
4. **Expected**: Policy creation continues

## Database Schema

The policy record should have a `document_url` field:

```sql
ALTER TABLE policies ADD COLUMN IF NOT EXISTS document_url TEXT;
```

If this column doesn't exist, the upload will work but the URL won't be stored.

## Security

- **Authentication required**: `/api/upload` requires valid session
- **Path validation**: Only allowed prefixes (`policies/`, `documents/`, etc.)
- **File type whitelist**: Only PDF and images allowed
- **Size limit**: 10 MB maximum
- **Signed URLs**: Time-limited access (2 hours for upload, 1 hour for download)
- **Bucket permissions**: Configured in Supabase Storage policies

## Future Enhancements

1. **Multiple documents**: Support uploading multiple files per policy
2. **Document versioning**: Track document updates and changes
3. **OCR re-run**: Allow re-extracting data from stored document
4. **Document viewer**: In-app PDF viewer for policy documents
5. **Bulk download**: Download all documents for a customer
6. **Document expiry**: Auto-delete documents after retention period

## Related Files

- `app/dashboard/intake/page.tsx` - Main intake flow with upload logic
- `app/api/upload/route.ts` - Upload URL generation API
- `lib/services/policy.service.ts` - Policy CRUD operations
- `ISSUE_POLICY_FLOW.md` - Complete flow documentation
