# API Documentation
## BP & AF Insurance Broker Portal

**Base URL**: `https://your-domain.com/api`  
**Version**: 1.0.0  
**Authentication**: JWT Bearer Token

---

## Table of Contents

- [Authentication](#authentication)
- [Customers](#customers)
- [Policies](#policies)
- [Claims](#claims)
- [Business Cases](#business-cases)
- [File Upload](#file-upload)
- [PDF Extraction](#pdf-extraction)
- [Users](#users)
- [Attendance](#attendance)
- [Payments](#payments)
- [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication via JWT Bearer token in the Authorization header.

### Headers
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Get Token
Tokens are obtained via Supabase Auth. Use the Supabase client to sign in:

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session?.access_token;
```

### Token Expiry
- Tokens expire after 1 hour
- Refresh tokens are valid for 30 days
- Use `supabase.auth.refreshSession()` to refresh

---

## Customers

### List Customers
```http
GET /api/customers
```

**Query Parameters**:
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20, max: 100)
- `search` (string, optional) - Search by name, phone, or email
- `status` (string, optional) - Filter by status: `active` | `inactive`
- `type` (string, optional) - Filter by type: `individual` | `corporate`

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "type": "individual",
      "status": "active",
      "address": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "pan": "ABCDE1234F",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Create Customer
```http
POST /api/customers
```

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "type": "individual",
  "status": "active",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "pan": "ABCDE1234F"
}
```

**Validation Rules**:
- `name`: Required, 2-100 characters, letters/spaces/dots/hyphens only
- `email`: Optional, valid email format
- `phone`: Required, 10 digits, starts with 6-9
- `type`: Required, `individual` or `corporate`
- `status`: Optional, `active` or `inactive` (default: `active`)
- `pan`: Optional, format: ABCDE1234F
- `pincode`: Optional, 6 digits

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "type": "individual",
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Get Customer
```http
GET /api/customers/:id
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "type": "individual",
  "status": "active",
  "policies": [
    {
      "id": "uuid",
      "policy_number": "POL123",
      "policy_type": "motor",
      "status": "active"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Update Customer
```http
PUT /api/customers/:id
```

**Request Body**: Same as Create Customer (all fields optional)

**Response** (200 OK): Updated customer object

### Delete Customer
```http
DELETE /api/customers/:id
```

**Response** (204 No Content)

---

## Policies

### List Policies
```http
GET /api/policies
```

**Query Parameters**:
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page
- `customer_id` (uuid, optional) - Filter by customer
- `policy_type` (string, optional) - Filter by type
- `status` (string, optional) - Filter by status
- `expiring_in_days` (number, optional) - Filter policies expiring in X days

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "customer_name": "John Doe",
      "policy_number": "POL123",
      "policy_type": "motor",
      "insurer_name": "ICICI Lombard",
      "premium_amount": 5000,
      "sum_insured": 100000,
      "start_date": "2025-01-01",
      "end_date": "2026-01-01",
      "status": "active",
      "document_url": "https://storage.url/policy.pdf",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### Create Policy
```http
POST /api/policies
```

**Request Body**:
```json
{
  "customer_id": "uuid",
  "customer_name": "John Doe",
  "policy_number": "POL123",
  "policy_type": "motor",
  "insurer_name": "ICICI Lombard",
  "premium_amount": 5000,
  "sum_insured": 100000,
  "start_date": "2025-01-01",
  "end_date": "2026-01-01",
  "status": "active",
  "payment_frequency": "yearly",
  "vehicle_number": "MH01AB1234",
  "document_url": "https://storage.url/policy.pdf",
  "assigned_to": "uuid",
  "created_by": "uuid"
}
```

**Validation Rules**:
- `customer_id`: Required, valid UUID
- `policy_number`: Required, 5-50 characters, alphanumeric/hyphens/slashes
- `policy_type`: Required, one of: `motor`, `health`, `life`, `fire`, `marine`, `liability`, `travel`, `car_ear`, `workmen_compensation`, `burglary`, `surety_bond`, `other`
- `premium_amount`: Required, positive number, max 10 billion
- `sum_insured`: Required, positive number, max 10 billion
- `start_date`: Required, format: YYYY-MM-DD
- `end_date`: Required, format: YYYY-MM-DD, must be after start_date
- `vehicle_number`: Optional, format: MH01AB1234

**Response** (201 Created): Created policy object

### Get Policy
```http
GET /api/policies/:id
```

**Response** (200 OK): Policy object with customer details

### Update Policy
```http
PUT /api/policies/:id
```

**Request Body**: Same as Create Policy (all fields optional except created_by)

**Response** (200 OK): Updated policy object

### Delete Policy
```http
DELETE /api/policies/:id
```

**Response** (204 No Content)

---

## Claims

### List Claims
```http
GET /api/claims
```

**Query Parameters**:
- `page`, `limit` - Pagination
- `policy_id` (uuid, optional) - Filter by policy
- `status` (string, optional) - Filter by status

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "policy_id": "uuid",
      "claim_number": "CLM123",
      "claim_type": "Accident",
      "claim_amount": 50000,
      "incident_date": "2025-01-15",
      "claim_date": "2025-01-16",
      "status": "submitted",
      "description": "Vehicle accident on highway",
      "documents": ["https://storage.url/doc1.pdf"],
      "created_at": "2025-01-16T00:00:00Z"
    }
  ]
}
```

### Create Claim
```http
POST /api/claims
```

**Request Body**:
```json
{
  "policy_id": "uuid",
  "claim_number": "CLM123",
  "claim_type": "Accident",
  "claim_amount": 50000,
  "incident_date": "2025-01-15",
  "claim_date": "2025-01-16",
  "status": "submitted",
  "description": "Vehicle accident on highway",
  "documents": ["https://storage.url/doc1.pdf"],
  "created_by": "uuid"
}
```

**Validation Rules**:
- `claim_amount`: Required, positive, max 10 billion
- `incident_date`: Required, format: YYYY-MM-DD
- `claim_date`: Required, format: YYYY-MM-DD, must be >= incident_date
- `description`: Required, 10-2000 characters
- `status`: Optional, one of: `submitted`, `under_review`, `approved`, `rejected`, `settled`, `closed`

**Response** (201 Created): Created claim object

### Update Claim Status
```http
PATCH /api/claims/:id/status
```

**Request Body**:
```json
{
  "status": "approved",
  "notes": "Claim approved after review"
}
```

**Response** (200 OK): Updated claim object

---

## Business Cases

### List Business Cases
```http
GET /api/business-cases
```

**Query Parameters**:
- `page`, `limit` - Pagination
- `status` (string, optional) - Filter by status
- `lob` (string, optional) - Filter by line of business
- `priority` (string, optional) - Filter by priority

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "case_number": "BCS-ABC123",
      "customer_id": "uuid",
      "case_type": "policy",
      "lob": "motor",
      "status": "open",
      "priority": "medium",
      "payload": {
        "estimated_value": 5000,
        "insurer_name": "ICICI Lombard"
      },
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Create Business Case
```http
POST /api/business-cases
```

**Request Body**:
```json
{
  "case_number": "BCS-ABC123",
  "customer_id": "uuid",
  "case_type": "policy",
  "lob": "motor",
  "status": "open",
  "priority": "medium",
  "payload": {
    "estimated_value": 5000,
    "insurer_name": "ICICI Lombard",
    "product_data": {}
  },
  "created_by": "uuid"
}
```

**Validation Rules**:
- `case_type`: Required, one of: `policy`, `renewal`, `endorsement`, `claim`, `quote`, `servicing`
- `lob`: Required, one of: `motor`, `health`, `life`, `fire`, `marine`, `liability`, `travel`, `car_ear`, `workmen_compensation`, `burglary`, `surety_bond`, `other`
- `status`: Optional, one of: `open`, `processing`, `pending_customer`, `pending_insurer`, `won`, `lost`, `done`, `rejected`
- `priority`: Optional, one of: `low`, `medium`, `high`, `urgent`

**Response** (201 Created): Created business case object

---

## File Upload

### Get Signed Upload URL
```http
POST /api/upload
```

**Request Body**:
```json
{
  "path": "policies/customer-id/policy.pdf",
  "mimeType": "application/pdf",
  "size": 1048576
}
```

**Validation Rules**:
- `path`: Required, must start with: `policies/`, `documents/`, `customers/`, `profiles/`, `leads/`, or `temp/`
- `path`: No path traversal (`..`), no absolute paths (`/`)
- `mimeType`: Required, one of: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `image/bmp`, `image/tiff`
- `size`: Required, max 10MB (10485760 bytes)

**Response** (200 OK):
```json
{
  "uploadUrl": "https://storage.supabase.co/upload/signed-url",
  "downloadUrl": "https://storage.supabase.co/download/file.pdf",
  "token": "signed-token-123",
  "storagePath": "policies/customer-id/policy.pdf",
  "bucket": "policy-documents",
  "expiresAt": "2025-01-01T02:00:00Z"
}
```

**Usage**:
1. Call this endpoint to get signed URLs
2. Upload file directly to `uploadUrl` using PUT request
3. Use `downloadUrl` to access the file

**Example Upload**:
```typescript
// 1. Get signed URL
const { uploadUrl, downloadUrl } = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path, mimeType, size })
}).then(r => r.json());

// 2. Upload file
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': mimeType },
  body: file
});

// 3. Use downloadUrl in your records
```

---

## PDF Extraction

### Extract Data from PDF
```http
POST /api/extract-pdf
```

**Request**: `multipart/form-data`

**Form Fields**:
- `file` (file, required) - PDF file to extract

**Response** (200 OK):
```json
{
  "text": "Raw extracted text from PDF...",
  "structuredData": {
    "policyDetails": {
      "policyNumber": "POL123",
      "policyType": "motor",
      "insurerName": "ICICI Lombard",
      "premium": 5000,
      "sumInsured": 100000,
      "startDate": "2025-01-01",
      "endDate": "2026-01-01",
      "paymentFrequency": "yearly"
    },
    "customerDetails": {
      "customerName": "John Doe",
      "customerPhone": "9876543210",
      "customerEmail": "john@example.com",
      "customerAddress": "123 Main St",
      "customerCity": "Mumbai",
      "customerState": "Maharashtra",
      "customerPincode": "400001"
    },
    "motorDetails": {
      "regNumber": "MH01AB1234",
      "make": "Maruti",
      "model": "Swift",
      "chassisNumber": "ABC123",
      "engineNumber": "XYZ789"
    }
  }
}
```

**Features**:
- AI-powered extraction using Gemini
- Regex fallback for missing fields
- Supports multiple insurers
- Extracts policy, customer, and product-specific details

**Limitations**:
- Max file size: 10MB
- Processing time: 10-15 seconds
- Supported formats: PDF only

---

## Users

### List Users
```http
GET /api/users
```

**Permissions**: Admin only

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "9876543210",
      "role": "employee",
      "branch_id": "uuid",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Create User
```http
POST /api/users
```

**Permissions**: Admin only

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "9876543210",
  "role": "employee",
  "branch_id": "uuid",
  "is_active": true
}
```

**Validation Rules**:
- `email`: Required, valid email format
- `name`: Required, 2-100 characters
- `phone`: Optional, 10 digits, starts with 6-9
- `role`: Required, one of: `admin`, `manager`, `employee`

**Response** (201 Created): Created user object

---

## Attendance

### Check In
```http
POST /api/attendance/check-in
```

**Request Body**:
```json
{
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777
  }
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "date": "2025-01-01",
  "check_in_time": "09:00:00",
  "status": "present",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777
  }
}
```

### Check Out
```http
POST /api/attendance/check-out
```

**Request Body**:
```json
{
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777
  }
}
```

**Response** (200 OK): Updated attendance record with check_out_time

---

## Payments

### Record Payment
```http
POST /api/payments
```

**Request Body**:
```json
{
  "policy_id": "uuid",
  "amount": 5000,
  "payment_date": "2025-01-01",
  "payment_method": "upi",
  "status": "completed",
  "transaction_id": "TXN123",
  "reference_number": "REF456",
  "notes": "Premium payment",
  "created_by": "uuid"
}
```

**Validation Rules**:
- `amount`: Required, positive, max 10 billion
- `payment_method`: Required, one of: `cash`, `cheque`, `bank_transfer`, `upi`, `card`, `online`
- `status`: Optional, one of: `pending`, `completed`, `failed`, `refunded`

**Response** (201 Created): Created payment record

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "detail": "Detailed error description",
  "code": "ERROR_CODE",
  "field": "fieldName"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Resource deleted successfully |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | File size exceeds limit |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | External service error |

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `FILE_TOO_LARGE` - File exceeds size limit
- `INVALID_FILE_TYPE` - Unsupported file type
- `EXTERNAL_API_ERROR` - External service error

### Validation Errors

Validation errors return 422 status with detailed field errors:

```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "phone",
      "message": "Phone number must be 10 digits"
    }
  ]
}
```

---

## Rate Limiting

- **Default**: 30 requests per minute per IP
- **File Upload**: 5 uploads per minute per user
- **PDF Extraction**: 10 extractions per minute per user

Rate limit headers:
```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1640995200
```

---

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhooks

Coming soon: Webhook support for real-time notifications.

---

## SDK & Client Libraries

Coming soon: Official SDKs for JavaScript/TypeScript, Python, and PHP.

---

## Support

For API support:
- **Email**: api-support@bpaf.in
- **Documentation**: https://docs.bpaf.in
- **Status Page**: https://status.bpaf.in

---

**Last Updated**: January 2025  
**API Version**: 1.0.0
