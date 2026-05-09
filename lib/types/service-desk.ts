import { BaseDocument, Customer, Policy } from "./index";

export type TicketStatus = "open" | "in_progress" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketVisibility = "internal" | "customer";

export interface Ticket extends BaseDocument {
  ticket_number: string;
  customer_id: string;
  policy_id?: string;
  category: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to?: string;
  sla_deadline?: string;
  resolved_at?: string;
  resolution_time_minutes?: number;
  is_breached: boolean;
  escalation_level: number;
  created_at: string;
  
  // Joins
  customers?: Partial<Customer>;
  policies?: Partial<Policy>;
}

export interface TicketNote extends BaseDocument {
  ticket_id: string;
  content: string;
  visibility: TicketVisibility;
  author_id: string;
  author_name?: string;
  created_at: string;
}

export interface TicketActivity extends BaseDocument {
  ticket_id: string;
  action: string;
  description: string;
  performed_by: string;
  performed_by_name?: string;
  created_at: string;
}

export interface TicketDocument extends BaseDocument {
  ticket_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface TicketDetailResponse {
  ticket: Ticket;
  notes: TicketNote[];
  activity: TicketActivity[];
  documents: TicketDocument[];
}

export interface TicketMetrics {
  total_count: number;
  open_count: number;
  breach_count: number;
  status_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  avg_resolution_minutes: number;
  sla_on_time_rate: number;
}
