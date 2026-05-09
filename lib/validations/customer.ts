import { z } from "zod";

/**
 * Zod schema for Customer creation/editing
 */
export const customerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(200, "Email must be under 200 characters")
    .or(z.literal("").or(z.literal("N/A"))) // Allow N/A or empty
    .transform((v) => v.toLowerCase().trim()),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Phone must be a valid 10-digit Indian mobile number")
    .or(z.literal("N/A")), // Allow N/A
  address: z
    .string()
    .max(300, "Address must be under 300 characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "City must be under 100 characters")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100, "State must be under 100 characters")
    .optional()
    .or(z.literal("")),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ---- Manual Customer Schema (Phase 2) ----

const documentSchema = z.object({
  type: z.string().min(1, "Document type is required"),
  file: z.any().optional(), // File object in browser
  url: z.string().optional(),
  name: z.string().optional(),
});

const corporateMemberSchema = z.object({
  name: z.string().min(2, "Name is required"),
  designation: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
  role: z.string().optional(),
  branch_location: z.string().optional(),
  notes: z.string().optional(),
});

const familyMemberSchema = z.object({
  name: z.string().min(2, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  dob: z.string().optional().or(z.literal("")),
  gender: z.string().optional(),
  mobile: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
  create_profile: z.boolean().default(false),
});

export const manualCustomerValidationSchema = z.discriminatedUnion("type", [
  // Individual
  z.object({
    type: z.literal("individual"),
    name: z.string().min(2, "Full Name is required").max(100),
    email: z.string().email().or(z.literal("")),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
    assigned_to: z.string().min(1, "Please assign an RM/Sub Agent"),
    profile_image_url: z.string().optional(),
    
    // Metadata
    dob: z.string().min(1, "Date of Birth is required"),
    gender: z.enum(["male", "female", "other"]),
    birth_place: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    education: z.string().optional(),
    marital_status: z.string().optional(),
    business_job_type: z.string().optional(),
    business_name: z.string().optional(),
    occupation_nature: z.string().optional(), // Type of Duty
    annual_income: z.string().optional(),
    pan_number: z.string().optional(),
    gst_number: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),

    // Nested
    family_members: z.array(familyMemberSchema).default([]),
    documents: z.array(documentSchema).default([]),
  }),
  
  // Corporate
  z.object({
    type: z.literal("corporate"),
    name: z.string().min(2, "Company Name is required").max(100),
    email: z.string().email().or(z.literal("")),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid contact number"),
    assigned_to: z.string().min(1, "Please assign an RM/Sub Agent"),
    profile_image_url: z.string().optional(),

    // Metadata
    turnover: z.string().optional(),
    pan_number: z.string().optional(),
    gst_number: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),

    // Nested
    corporate_members: z.array(corporateMemberSchema).default([]),
    documents: z.array(documentSchema).default([]),
  }),
]);

export type ManualCustomerFormData = z.infer<typeof manualCustomerValidationSchema>;

/**
 * Indian states for dropdown
 */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];
