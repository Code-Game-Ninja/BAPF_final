/**
 * Supabase Communication Service — Templates + Logs + Email sending
 */
import { supabase } from "@/lib/supabase/client";
import type { CommunicationTemplate, CommunicationLog } from "@/lib/types";

// ══════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════

async function listTemplates(filters?: { channel?: string; trigger_type?: string }) {
  let query = supabase.from("communication_templates").select("*").order("created_at", { ascending: false });
  if (filters?.channel) query = query.eq("channel", filters.channel);
  if (filters?.trigger_type) query = query.eq("trigger_type", filters.trigger_type);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CommunicationTemplate[];
}

async function getTemplateById(id: string) {
  const { data, error } = await supabase.from("communication_templates").select("*").eq("id", id).single();
  if (error) throw error;
  return data as CommunicationTemplate;
}

async function createTemplate(template: Partial<CommunicationTemplate>) {
  const { data, error } = await supabase.from("communication_templates").insert(template).select().single();
  if (error) throw error;
  return data as CommunicationTemplate;
}

async function updateTemplate(id: string, updates: Partial<CommunicationTemplate>) {
  const { data, error } = await supabase.from("communication_templates").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as CommunicationTemplate;
}

async function deleteTemplate(id: string) {
  const { error } = await supabase.from("communication_templates").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════
// LOGS
// ══════════════════════════════════════════

async function listLogs(filters?: { channel?: string; status?: string; customer_id?: string; limit?: number }) {
  let query = supabase.from("communication_logs").select("*").order("created_at", { ascending: false });
  if (filters?.channel) query = query.eq("channel", filters.channel);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CommunicationLog[];
}

async function createLog(log: Partial<CommunicationLog>) {
  const { data, error } = await supabase.from("communication_logs").insert(log).select().single();
  if (error) throw error;
  return data as CommunicationLog;
}

// ══════════════════════════════════════════
// TEMPLATE RENDERING
// ══════════════════════════════════════════

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  Object.entries(variables).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  });
  return rendered;
}

// ══════════════════════════════════════════
// SEND COMMUNICATION (via API)
// ══════════════════════════════════════════

async function sendEmail(
  templateId: string,
  customerId: string,
  customerName: string,
  recipient: string,
  variables: Record<string, string>,
  userId: string
) {
  const template = await getTemplateById(templateId);
  const subject = renderTemplate(template.subject || "", variables);
  const body = renderTemplate(template.body_template, variables);

  // Call the API route to send the email
  const response = await fetch("/api/communications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "email", recipient, subject, body, customerId, customerName, templateId }),
  });

  const result = await response.json();

  // Log the communication
  await createLog({
    template_id: templateId,
    customer_id: customerId,
    customer_name: customerName,
    channel: "email",
    recipient,
    subject,
    body,
    status: result.success ? "sent" : "failed",
    sent_at: result.success ? new Date().toISOString() : undefined,
    error_message: result.error,
    created_by: userId,
  });

  return result;
}

// ══════════════════════════════════════════
// BULK SEND (Renewal Reminders)
// ══════════════════════════════════════════

async function sendRenewalReminders(userId: string) {
  const response = await fetch("/api/communications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "renewal_reminders", userId }),
  });
  return response.json();
}

async function sendTemplateToCustomer(params: {
  templateId: string;
  customerId: string;
  customerName: string;
  recipient: string;
  variables?: Record<string, string>;
  userId: string;
}) {
  const template = await getTemplateById(params.templateId);
  const variables = params.variables ?? {};
  const subject = renderTemplate(template.subject || "", variables);
  const body = renderTemplate(template.body_template, variables);

  const response = await fetch("/api/communications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: template.channel,
      recipient: params.recipient,
      subject,
      body,
      customerId: params.customerId,
      customerName: params.customerName,
      templateId: params.templateId,
      userId: params.userId,
    }),
  });

  return response.json();
}

// ══════════════════════════════════════════
// STATS
// ══════════════════════════════════════════

async function getStats() {
  const { data, error } = await supabase.from("communication_logs").select("channel, status");
  if (error) throw error;
  const logs = data ?? [];
  const total = logs.length;
  const sent = logs.filter(( l: { status: string; channel: string } ) => l.status === "sent" || l.status === "delivered").length;
  const failed = logs.filter(( l: { status: string; channel: string } ) => l.status === "failed" || l.status === "bounced").length;
  const byChannel: Record<string, number> = {};
  logs.forEach(( l: { status: string; channel: string } ) => { byChannel[l.channel] = (byChannel[l.channel] || 0) + 1; });
  return { total, sent, failed, deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 0, byChannel };
}

export const communicationService = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listLogs,
  createLog,
  renderTemplate,
  sendEmail,
  sendTemplateToCustomer,
  sendRenewalReminders,
  getStats,
};
