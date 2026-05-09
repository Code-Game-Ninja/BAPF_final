import { formatCurrency } from "@/lib/utils";

// ---- Company name (overridden at runtime by AppSettingsProvider) ----
let _waCompanyName = "BP & AF Insurance";
export function setWhatsAppCompanyName(name: string) { _waCompanyName = name; }

/**
 * WhatsApp Reminder Utility
 *
 * Generates WhatsApp deep-links for sending renewal reminders.
 * Uses the wa.me API for click-to-chat.
 *
 * Supports:
 * - Pre-formatted renewal reminder messages
 * - Indian phone number formatting (+91)
 * - Custom message templates
 */

export interface WhatsAppReminderData {
  customerName: string;
  customerPhone: string;
  policyNumber: string;
  dueDate: string; // Display-ready date string
  premiumAmount?: number;
  insurerName?: string;
  customMessage?: string;
}

/**
 * Format Indian phone number for WhatsApp (add +91 prefix)
 */
function formatIndianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Remove leading 0
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // Add country code if missing
  if (!cleaned.startsWith("91") && !cleaned.startsWith("+91")) {
    cleaned = "91" + cleaned;
  }

  // Remove + if present
  cleaned = cleaned.replace(/\+/g, "");

  return cleaned;
}

/**
 * Format currency for display using admin-configured currency
 */
function formatCurrencyLocal(amount: number): string {
  return formatCurrency(amount);
}

/**
 * Generate default renewal reminder message
 */
export function generateRenewalMessage(data: WhatsAppReminderData): string {
  if (data.customMessage) {
    return data.customMessage;
  }

  const lines = [
    `Dear ${data.customerName},`,
    ``,
    `This is a friendly reminder that your insurance policy is due for renewal.`,
    ``,
    `Policy Number: ${data.policyNumber}`,
    data.insurerName ? `Insurer: ${data.insurerName}` : null,
    `Renewal Date: ${data.dueDate}`,
    data.premiumAmount
      ? `Premium Amount: ${formatCurrencyLocal(data.premiumAmount)}`
      : null,
    ``,
    `Please contact us to ensure continuous coverage. We're happy to assist with the renewal process.`,
    ``,
    `Thank you,`,
    _waCompanyName,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

/**
 * Generate WhatsApp deep-link URL
 * Opens WhatsApp with pre-filled message for the given phone number.
 */
export function generateWhatsAppLink(data: WhatsAppReminderData): string {
  const phone = formatIndianPhone(data.customerPhone);
  const message = generateRenewalMessage(data);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
}

/**
 * Open WhatsApp with a renewal reminder for the given data.
 * Opens in a new tab/window.
 */
export function sendWhatsAppReminder(data: WhatsAppReminderData): void {
  const url = generateWhatsAppLink(data);
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Generate a batch of WhatsApp links for multiple renewals.
 * Returns array of { renewalId, url, customerName, phone }
 */
export function generateBatchLinks(
  renewals: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    policyNumber: string;
    dueDate: string;
    premiumAmount?: number;
    insurerName?: string;
  }>
): Array<{
  renewalId: string;
  url: string;
  customerName: string;
  phone: string;
}> {
  return renewals.map((r) => ({
    renewalId: r.id,
    url: generateWhatsAppLink({
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      policyNumber: r.policyNumber,
      dueDate: r.dueDate,
    }),
    customerName: r.customerName,
    phone: r.customerPhone,
  }));
}

// ── Lead-specific WhatsApp helpers ──────────────────────────────

export type LeadMessageType = "thank_you" | "follow_up" | "meeting_invite" | "proposal";

export interface LeadWhatsAppData {
  customerName: string;
  customerPhone: string;
  salespersonName?: string;
  messageType?: LeadMessageType;
  customMessage?: string;
}

const LEAD_TEMPLATES: Record<LeadMessageType, (data: LeadWhatsAppData) => string> = {
  thank_you: (d) =>
    [
      `Dear ${d.customerName},`,
      ``,
      `Thank you for your time and interest in our insurance services.`,
      d.salespersonName
        ? `I'm ${d.salespersonName} from ${_waCompanyName}, and I'll be assisting you.`
        : `We at ${_waCompanyName} look forward to serving you.`,
      ``,
      `Please feel free to reach out if you have any questions. We're here to help you find the best coverage for your needs.`,
      ``,
      `Warm regards,`,
      d.salespersonName || _waCompanyName,
      _waCompanyName,
    ].join("\n"),

  follow_up: (d) =>
    [
      `Dear ${d.customerName},`,
      ``,
      `This is a friendly follow-up regarding our recent conversation about insurance solutions.`,
      ``,
      `I wanted to check if you had any questions or if there's anything else I can help you with.`,
      ``,
      `Looking forward to hearing from you.`,
      ``,
      `Best regards,`,
      d.salespersonName || _waCompanyName,
      _waCompanyName,
    ].join("\n"),

  meeting_invite: (d) =>
    [
      `Dear ${d.customerName},`,
      ``,
      `Thank you for showing interest in our insurance services.`,
      ``,
      `I'd like to schedule a meeting to discuss your requirements in detail and present the best options for you.`,
      ``,
      `Could you please share a convenient date and time?`,
      ``,
      `Best regards,`,
      d.salespersonName || _waCompanyName,
      _waCompanyName,
    ].join("\n"),

  proposal: (d) =>
    [
      `Dear ${d.customerName},`,
      ``,
      `Thank you for considering ${_waCompanyName} for your insurance needs.`,
      ``,
      `I've prepared a proposal based on our discussion. I'll share the details shortly.`,
      ``,
      `Please review and let me know if you'd like any modifications or have questions.`,
      ``,
      `Best regards,`,
      d.salespersonName || _waCompanyName,
      _waCompanyName,
    ].join("\n"),
};

/**
 * Generate a lead-specific WhatsApp message
 */
export function generateLeadMessage(data: LeadWhatsAppData): string {
  if (data.customMessage) return data.customMessage;
  const type = data.messageType || "thank_you";
  return LEAD_TEMPLATES[type](data);
}

/**
 * Generate a WhatsApp deep-link for a lead
 */
export function generateLeadWhatsAppLink(data: LeadWhatsAppData): string {
  const phone = formatIndianPhone(data.customerPhone);
  const message = generateLeadMessage(data);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp for a lead in a new tab
 */
export function sendLeadWhatsApp(data: LeadWhatsAppData): void {
  const url = generateLeadWhatsAppLink(data);
  window.open(url, "_blank", "noopener,noreferrer");
}
