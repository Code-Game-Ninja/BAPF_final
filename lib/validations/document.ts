import { z } from "zod";

// ---- Document Type Config ----

export const DOCUMENT_TYPES = [
  { value: "policy_pdf", label: "Policy Document", icon: "file-text" },
  { value: "id_proof", label: "ID Proof", icon: "id-card" },
  { value: "address_proof", label: "Address Proof", icon: "map-pin" },
  { value: "claim", label: "Claim Document", icon: "file-check" },
  { value: "receipt", label: "Receipt", icon: "receipt" },
  { value: "photo", label: "Photo", icon: "image" },
  { value: "other", label: "Other", icon: "file" },
] as const;

export const DOCUMENT_TYPE_VALUES = DOCUMENT_TYPES.map((d) => d.value);

/**
 * Schema for uploading a document
 */
export const documentUploadSchema = z.object({
  document_type: z.string().min(1, "Document type is required"),
  policy_id: z.string().optional().or(z.literal("")),
  customer_id: z.string().optional().or(z.literal("")),
});

export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
