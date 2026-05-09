import { supabase } from "@/lib/supabase/client";
import { BusinessCase, ServiceTicket, CreateInput } from "@/lib/types";

const CASES_TABLE = "business_cases";
const TICKETS_TABLE = "service_tickets";

export const businessCaseService = {
  /**
   * Create a new Business Case (Lead, Proposal, Claim, etc.)
   */
  async createCase(data: CreateInput<BusinessCase>): Promise<BusinessCase> {
    const { data: created, error } = await supabase.from(CASES_TABLE)
      .insert({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      ...(created as any),
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    } as BusinessCase;
  },

  /**
   * Create a new Service Ticket
   */
  async createTicket(data: CreateInput<ServiceTicket>): Promise<ServiceTicket> {
    const { data: created, error } = await supabase.from(TICKETS_TABLE)
      .insert({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      ...(created as any),
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    } as ServiceTicket;
  },

  /**
   * List all business cases (global)
   */
  async listCases(): Promise<BusinessCase[]> {
    const { data, error } = await supabase.from(CASES_TABLE)
      .select("*, customers(*)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Map snake_case DB fields to camelCase type fields
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...row,
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
    })) as BusinessCase[];
  },

  /**
   * List all service tickets (global)
   */
  async listTickets(): Promise<ServiceTicket[]> {
    const { data, error } = await supabase.from(TICKETS_TABLE)
      .select("*, customers(*)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Map snake_case DB fields to camelCase type fields
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...row,
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
    })) as ServiceTicket[];
  },

  /**
   * Get all business cases for a customer
   */
  async getCasesByCustomer(customerId: string): Promise<BusinessCase[]> {
    const { data, error } = await supabase.from(CASES_TABLE)
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...row,
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
    })) as BusinessCase[];
  },

  /**
   * Get all service tickets for a customer
   */
  async getTicketsByCustomer(customerId: string): Promise<ServiceTicket[]> {
    const { data, error } = await supabase.from(TICKETS_TABLE)
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...row,
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
    })) as ServiceTicket[];
  },

  /**
   * Update a business case (including status and payload metadata)
   */
  async updateCase(id: string, data: Partial<BusinessCase>): Promise<void> {
    const { error } = await supabase.from(CASES_TABLE)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  /**
   * Update status of a service ticket
   */
  async updateTicketStatus(id: string, status: ServiceTicket["status"]): Promise<void> {
    const { error } = await supabase.from(TICKETS_TABLE)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);
  }
};
