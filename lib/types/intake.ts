import { PolicyType } from "./index";

export interface IntakeProductData {
  // Base Identity
  name?: string;
  phone?: string;
  email?: string;
  pan?: string;

  // Base Policy
  policy_no?: string;
  policy_type?: PolicyType | string;
  insurer?: string;
  premium?: string;
  sum_assured?: string;
  start_date?: string;
  end_date?: string;
  payment_frequency?: string;

  // Motor Specifics
  reg_number?: string;
  registration_type?: string;
  financed_by?: string;
  make?: string;
  model?: string;
  variant?: string;
  fuel_type?: string;
  chassis_number?: string;
  engine_number?: string;
  seating_capacity?: string;
  tyre_count?: string;
  mfg_year?: string;
  cc?: string;
  rc_expiry?: string;
  fitness_expiry?: string;
  puc_expiry?: string;
  permit_expiry?: string;
  idv_vehicle?: string;
  idv_cng?: string;
  ncb_percent?: string;
  net_premium?: string;
  addons?: {
    zero_dep?: boolean;
    rti?: boolean;
    rsa?: boolean;
    engine_protector?: boolean;
    key_replacement?: boolean;
    consumables?: boolean;
    pa_owner_driver?: boolean;
    paid_driver?: boolean;
    [key: string]: boolean | undefined;
  };

  // Life Specifics
  plan_name?: string;
  policy_term?: string;
  premium_payment_term?: string;
  risk_start_date?: string;
  policy_date?: string;
  next_due_date?: string;
  bank_name?: string;
  acc_number?: string;
  ifsc_code?: string;
  nominee_name?: string;
  nominee_relation?: string;

  // Health Specifics
  health_policy_type?: string;

  // Commercial Specifics
  risk_details?: string;
  occupancy?: string;
  fire_si?: string;

  // Family / Group Members
  members?: Array<{
    name: string;
    dob?: string;
    age?: string;
    relation?: string;
  }>;

  // Catch-all for any other extracted fields
  [key: string]: any;
}
