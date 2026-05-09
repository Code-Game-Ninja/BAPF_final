/**
 * Input Validation Schemas
 * Using Zod for type-safe validation across the application
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const emailSchema = z.string().email('Invalid email address').toLowerCase();

export const phoneSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (must be 10 digits starting with 6-9)')
  .length(10, 'Phone number must be exactly 10 digits');

export const panSchema = z.string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)')
  .length(10, 'PAN must be exactly 10 characters');

export const gstSchema = z.string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format')
  .length(15, 'GST number must be exactly 15 characters');

export const aadhaarSchema = z.string()
  .regex(/^\d{12}$/, 'Invalid Aadhaar number (must be 12 digits)')
  .length(12, 'Aadhaar must be exactly 12 digits');

export const pincodeSchema = z.string()
  .regex(/^\d{6}$/, 'Invalid pincode (must be 6 digits)')
  .length(6, 'Pincode must be exactly 6 digits');

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date');

export const currencySchema = z.number()
  .positive('Amount must be positive')
  .max(10000000000, 'Amount exceeds maximum limit (10 billion)');

export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

export const createCustomerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, dots, hyphens, and apostrophes'),
  
  email: emailSchema.optional(),
  
  phone: phoneSchema,
  
  type: z.enum(['individual', 'corporate']),
  
  status: z.enum(['active', 'inactive']).default('active'),
  
  address: z.string().max(500, 'Address must not exceed 500 characters').optional(),
  
  city: z.string().max(100, 'City must not exceed 100 characters').optional(),
  
  state: z.string().max(100, 'State must not exceed 100 characters').optional(),
  
  pincode: pincodeSchema.optional(),
  
  pan: panSchema.optional(),
  
  gstin: gstSchema.optional(),
  
  aadhaar: aadhaarSchema.optional(),
  
  date_of_birth: dateSchema.optional(),
  
  entity_meta: z.record(z.string(), z.unknown()).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ============================================================================
// POLICY SCHEMAS
// ============================================================================

export const policyTypeSchema = z.enum([
  'motor',
  'health',
  'life',
  'fire',
  'marine',
  'liability',
  'travel',
  'car_ear',
  'workmen_compensation',
  'burglary',
  'surety_bond',
  'other'
]);

export const policyStatusSchema = z.enum([
  'active',
  'expired',
  'cancelled',
  'pending',
  'lapsed'
]);

export const policyBaseSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  
  customer_name: z.string()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name must not exceed 100 characters'),
  
  policy_number: z.string()
    .min(5, 'Policy number must be at least 5 characters')
    .max(50, 'Policy number must not exceed 50 characters')
    .regex(/^[A-Z0-9\-\/]+$/i, 'Policy number can only contain letters, numbers, hyphens, and slashes'),
  
  policy_type: policyTypeSchema,
  
  insurer_name: z.string()
    .min(2, 'Insurer name must be at least 2 characters')
    .max(100, 'Insurer name must not exceed 100 characters'),
  
  premium_amount: currencySchema,
  
  sum_insured: currencySchema,
  
  start_date: dateSchema,
  
  end_date: dateSchema,
  
  status: policyStatusSchema.default('active'),
  
  payment_frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly', 'single']).optional(),
  
  vehicle_number: z.string()
    .regex(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/i, 'Invalid vehicle number format')
    .optional(),
  
  pdf_url: z.string().url('Invalid PDF URL').optional(),
  
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  
  created_by: z.string().uuid('Invalid user ID'),
  
  lockedForEmployee: z.boolean().default(false),
  
  verification_confirmed: z.boolean().default(false),
});

export const createPolicySchema = policyBaseSchema.refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
);

export const updatePolicySchema = policyBaseSchema.partial().omit({ created_by: true });

// ============================================================================
// CLAIM SCHEMAS
// ============================================================================

export const claimStatusSchema = z.enum([
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'settled',
  'closed'
]);

export const claimBaseSchema = z.object({
  policy_id: z.string().uuid('Invalid policy ID'),
  
  claim_number: z.string()
    .min(5, 'Claim number must be at least 5 characters')
    .max(50, 'Claim number must not exceed 50 characters'),
  
  claim_type: z.string()
    .min(2, 'Claim type must be at least 2 characters')
    .max(100, 'Claim type must not exceed 100 characters'),
  
  claim_amount: currencySchema,
  
  incident_date: dateSchema,
  
  claim_date: dateSchema,
  
  status: claimStatusSchema.default('submitted'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  
  documents: z.array(z.string().url('Invalid document URL')).optional(),
  
  created_by: z.string().uuid('Invalid user ID'),
});

export const createClaimSchema = claimBaseSchema.refine(
  (data) => new Date(data.claim_date) >= new Date(data.incident_date),
  {
    message: 'Claim date cannot be before incident date',
    path: ['claim_date'],
  }
);

export const updateClaimSchema = claimBaseSchema.partial().omit({ created_by: true });

// ============================================================================
// BUSINESS CASE SCHEMAS
// ============================================================================

export const caseTypeSchema = z.enum([
  'policy',
  'renewal',
  'endorsement',
  'claim',
  'quote',
  'servicing'
]);

export const caseStatusSchema = z.enum([
  'open',
  'processing',
  'pending_customer',
  'pending_insurer',
  'won',
  'lost',
  'done',
  'rejected'
]);

export const lobSchema = z.enum([
  'motor',
  'health',
  'life',
  'fire',
  'marine',
  'liability',
  'travel',
  'car_ear',
  'workmen_compensation',
  'burglary',
  'surety_bond',
  'other'
]);

export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const createBusinessCaseSchema = z.object({
  case_number: z.string()
    .min(5, 'Case number must be at least 5 characters')
    .max(50, 'Case number must not exceed 50 characters'),
  
  customer_id: z.string().uuid('Invalid customer ID'),
  
  case_type: caseTypeSchema,
  
  lob: lobSchema,
  
  status: caseStatusSchema.default('open'),
  
  priority: prioritySchema.default('medium'),
  
  payload: z.record(z.string(), z.unknown()).optional(),
  
  created_by: z.string().uuid('Invalid user ID'),
});

export const updateBusinessCaseSchema = createBusinessCaseSchema.partial().omit({ created_by: true });

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const fileUploadSchema = z.object({
  path: z.string()
    .min(1, 'Path is required')
    .regex(/^(policies|documents|customers|profiles|leads|temp)\//, 'Invalid path prefix')
    .refine((path) => !path.includes('..'), 'Path traversal not allowed')
    .refine((path) => !path.startsWith('/'), 'Absolute paths not allowed'),
  
  mimeType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ]),
  
  size: z.number()
    .positive('File size must be positive')
    .max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userRoleSchema = z.enum(['admin', 'manager', 'employee']);

export const createUserSchema = z.object({
  email: emailSchema,
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  
  phone: phoneSchema.optional(),
  
  role: userRoleSchema,
  
  branch_id: z.string().uuid('Invalid branch ID').optional(),
  
  is_active: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial();

// ============================================================================
// ATTENDANCE SCHEMAS
// ============================================================================

export const attendanceStatusSchema = z.enum([
  'present',
  'absent',
  'half_day',
  'leave',
  'holiday'
]);

export const createAttendanceSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  
  date: dateSchema,
  
  check_in_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format (use HH:MM:SS)'),
  
  check_out_time: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format (use HH:MM:SS)')
    .optional(),
  
  status: attendanceStatusSchema.default('present'),
  
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
});

export const updateAttendanceSchema = createAttendanceSchema.partial().omit({ user_id: true, date: true });

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const paymentMethodSchema = z.enum([
  'cash',
  'cheque',
  'bank_transfer',
  'upi',
  'card',
  'online'
]);

export const paymentStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded'
]);

export const createPaymentSchema = z.object({
  policy_id: z.string().uuid('Invalid policy ID'),
  
  amount: currencySchema,
  
  payment_date: dateSchema,
  
  payment_method: paymentMethodSchema,
  
  status: paymentStatusSchema.default('pending'),
  
  transaction_id: z.string().max(100, 'Transaction ID must not exceed 100 characters').optional(),
  
  reference_number: z.string().max(100, 'Reference number must not exceed 100 characters').optional(),
  
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
  
  created_by: z.string().uuid('Invalid user ID'),
});

export const updatePaymentSchema = createPaymentSchema.partial().omit({ created_by: true });

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const schemas = {
  // Common
  email: emailSchema,
  phone: phoneSchema,
  pan: panSchema,
  gst: gstSchema,
  aadhaar: aadhaarSchema,
  pincode: pincodeSchema,
  date: dateSchema,
  currency: currencySchema,
  percentage: percentageSchema,
  
  // Customer
  createCustomer: createCustomerSchema,
  updateCustomer: updateCustomerSchema,
  
  // Policy
  createPolicy: createPolicySchema,
  updatePolicy: updatePolicySchema,
  policyType: policyTypeSchema,
  policyStatus: policyStatusSchema,
  
  // Claim
  createClaim: createClaimSchema,
  updateClaim: updateClaimSchema,
  claimStatus: claimStatusSchema,
  
  // Business Case
  createBusinessCase: createBusinessCaseSchema,
  updateBusinessCase: updateBusinessCaseSchema,
  caseType: caseTypeSchema,
  caseStatus: caseStatusSchema,
  lob: lobSchema,
  priority: prioritySchema,
  
  // File Upload
  fileUpload: fileUploadSchema,
  
  // User
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  userRole: userRoleSchema,
  
  // Attendance
  createAttendance: createAttendanceSchema,
  updateAttendance: updateAttendanceSchema,
  attendanceStatus: attendanceStatusSchema,
  
  // Payment
  createPayment: createPaymentSchema,
  updatePayment: updatePaymentSchema,
  paymentMethod: paymentMethodSchema,
  paymentStatus: paymentStatusSchema,
};

export default schemas;
