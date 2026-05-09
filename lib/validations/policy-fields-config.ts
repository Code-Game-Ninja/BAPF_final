/**
 * Policy-type-specific field definitions.
 *
 * Based on the "Dropdowns and inputs" specification:
 * Each policy type has common mandatory fields (handled in the base form)
 * plus extra fields / dropdowns specific to that type.
 */

export type FieldType = "select" | "text";

export interface PolicySpecificField {
  /** Form field name (must match the key in PolicyFormData / Policy) */
  name: string;
  /** Label shown in the UI */
  label: string;
  /** "select" renders a dropdown, "text" renders a text input */
  type: FieldType;
  /** Dropdown options — only used when type === "select" */
  options?: { value: string; label: string }[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required for this policy type */
  required?: boolean;
}

/**
 * Map of policy type → extra fields that should appear in the form.
 */
export const POLICY_SPECIFIC_FIELDS: Record<string, PolicySpecificField[]> = {
  motor: [
    {
      name: "motor_category",
      label: "Motor Category *",
      type: "select",
      required: true,
      options: [
        { value: "retail", label: "Retail" },
        { value: "fleet", label: "Fleet" },
      ],
      placeholder: "Select Retail or Fleet",
    },
    {
      name: "vehicle_number",
      label: "Vehicle Number *",
      type: "text",
      required: true,
      placeholder: "e.g. MH-01-AB-1234",
    },
    {
      name: "vehicle_type",
      label: "Vehicle Type *",
      type: "text",
      required: true,
      placeholder: "e.g. Two Wheeler, Car, Bus",
    },
  ],

  health: [
    {
      name: "health_policy_type",
      label: "Health Policy Type *",
      type: "select",
      required: true,
      options: [
        { value: "single", label: "Individual" },
        { value: "floater", label: "Family Floater" },
      ],
      placeholder: "Select Single or Floater",
    },
    {
      name: "plan_name",
      label: "Plan Name",
      type: "text",
      placeholder: "e.g. Star Comprehensive",
    },
  ],

  life: [
    {
      name: "life_plan_type",
      label: "Type of Plan *",
      type: "select",
      required: true,
      options: [
        { value: "endowment", label: "Endowment" },
        { value: "term_plan", label: "Term Plan" },
        { value: "ulip", label: "ULIP" },
        { value: "moneyback", label: "Money Back" },
      ],
      placeholder: "Select plan type",
    },
    {
      name: "plan_name",
      label: "Plan Name",
      type: "text",
      placeholder: "e.g. LIC Jeevan Anand",
    },
  ],

  fire: [
    {
      name: "risk_location",
      label: "Risk Location *",
      type: "text",
      required: true,
      placeholder: "Address of the insured property",
    },
  ],

  marine: [
    {
      name: "marine_policy_type",
      label: "Marine Policy Type *",
      type: "select",
      required: true,
      options: [
        { value: "single_transit", label: "Single Transit" },
        { value: "open_import", label: "Open Import" },
        { value: "open_export", label: "Open Export" },
        { value: "stop", label: "STOP (Specific Transit Open Policy)" },
      ],
      placeholder: "Select marine policy type",
    },
  ],

  burglary: [
    {
      name: "risk_location",
      label: "Risk Location *",
      type: "text",
      required: true,
      placeholder: "Address of the insured premises",
    },
  ],

  liability: [
    {
      name: "liability_type",
      label: "Liability Type *",
      type: "select",
      required: true,
      options: [
        { value: "public", label: "Public Liability" },
        { value: "product", label: "Product Liability" },
      ],
      placeholder: "Select liability type",
    },
  ],

  workmen_compensation: [
    {
      name: "policy_tenure",
      label: "Policy Tenure / Period",
      type: "text",
      placeholder: "e.g. 6 months, 9 months (if less than a year)",
    },
  ],

  car_ear: [
    {
      name: "project_name",
      label: "Project Name *",
      type: "text",
      required: true,
      placeholder: "Name of the construction / erection project",
    },
    {
      name: "project_location",
      label: "Project Location *",
      type: "text",
      required: true,
      placeholder: "Location of the project",
    },
    {
      name: "principal",
      label: "Principal",
      type: "text",
      placeholder: "Name of the principal / employer",
    },
  ],

  surety_bond: [
    {
      name: "surety_bond_type",
      label: "Bond Type *",
      type: "select",
      required: true,
      options: [
        { value: "bid_bond", label: "Bid Bond" },
        { value: "performance_bond", label: "Performance Bond" },
        { value: "mobilisation_bond", label: "Mobilisation Bond" },
        { value: "retention_bond", label: "Retention Bond" },
      ],
      placeholder: "Select bond type",
    },
    {
      name: "project_name",
      label: "Project Name *",
      type: "text",
      required: true,
      placeholder: "Name of the project",
    },
    {
      name: "project_location",
      label: "Project Location *",
      type: "text",
      required: true,
      placeholder: "Location of the project",
    },
    {
      name: "principal",
      label: "Principal",
      type: "text",
      placeholder: "Name of the principal",
    },
    {
      name: "policy_tenure",
      label: "Policy Tenure / Period",
      type: "text",
      placeholder: "e.g. 6 months (if less than a year)",
    },
  ],
};

/**
 * Get the extra fields for a given policy type.
 * Returns an empty array if the type has no extra fields.
 */
export function getPolicySpecificFields(policyType: string | undefined): PolicySpecificField[] {
  if (!policyType) return [];
  return POLICY_SPECIFIC_FIELDS[policyType] ?? [];
}
