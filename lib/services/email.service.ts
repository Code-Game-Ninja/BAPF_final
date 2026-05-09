/**
 * Email Sender Service
 *
 * Uses Nodemailer to send transactional emails.
 * Configure SMTP via environment variables in .env.local:
 *
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM="BP & AF Insurance <noreply@bpaf.in>"
 *
 * For Gmail: enable 2FA and create an App Password.
 * For production: use SendGrid, AWS SES, or similar.
 */

import nodemailer from "nodemailer";

// ---- Company info (overridden at runtime by API routes reading Supabase) ----

let _companyName = "BP & AF Insurance";
let _companyFullName = "BP & AF Insurance Broker Pvt. Ltd.";
let _companyEmail = "";
let _companyPhone = "";

/** Set company name from Supabase settings (called by API routes) */
export function setEmailCompanyName(name: string) {
  _companyName = name;
  _companyFullName = name;
}

/** Set company email for reply-to / footer (called by API routes) */
export function setEmailCompanyEmail(email: string) { _companyEmail = email; }

/** Set company phone for email footer (called by API routes) */
export function setEmailCompanyPhone(phone: string) { _companyPhone = phone; }

function co() { return _companyName; }
function coFull() { return _companyFullName; }
function coEmail() { return _companyEmail; }
function coPhone() { return _companyPhone; }

// ---- Types ----

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export type EmailTemplateData = Record<string, string | number | undefined>;

// ---- HTML Escaping ----

/** Escape a string for safe HTML interpolation (prevents XSS in email templates). */
function esc(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Reusable email footer with dynamic company info (phone + email). */
function emailFooter(suffix?: string): string {
  const contactParts: string[] = [];
  if (coPhone()) contactParts.push(`Phone: ${esc(coPhone())}`);
  if (coEmail()) contactParts.push(`Email: ${esc(coEmail())}`);
  const contactLine = contactParts.length > 0
    ? `<br/>${contactParts.join(" | ")}`
    : "";
  const suffixLine = suffix ? ` | ${suffix}` : "";
  return `
    <div style="background: #f9f9f9; padding: 16px 32px; border-top: 1px solid #e5e5e5;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} ${coFull()}${suffixLine}${contactLine}
      </p>
    </div>`;
}
// ---- Email Templates ----

// ---- Custom email templates (overridden from settings) ----

let _policyEmailTemplate = "";
let _renewalEmailTemplate = "";

/** Set custom policy issuance email template from settings */
export function setPolicyEmailTemplate(tpl: string) { _policyEmailTemplate = tpl; }

/** Set custom renewal reminder email template from settings */
export function setRenewalEmailTemplate(tpl: string) { _renewalEmailTemplate = tpl; }

/**
 * Process a custom email template by replacing placeholders like {customer_name}
 * with actual values. Wraps result in styled email container.
 */
function processCustomTemplate(
  template: string,
  data: Record<string, string | number | undefined>
): string {
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), esc(val));
  }
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
      <div style="background: #161616; padding: 24px 32px;">
        <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
      </div>
      <div style="padding: 32px;">
        <div style="color: #5D5D5D; line-height: 1.6; white-space: pre-line;">${result}</div>
      </div>
      ${emailFooter()}
    </div>`;
}

const TEMPLATES = {
  /**
   * Welcome email for new user accounts
   */
  welcome: (data: { name: string; email: string; role: string; loginUrl: string }) => ({
    subject: `Welcome to ${co()} Portal`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #161616; margin: 0 0 16px;">Welcome, ${esc(data.name)}!</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your account has been created on the ${co()} Portal as <strong>${esc(data.role)}</strong>.
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            You can log in using your email: <strong>${esc(data.email)}</strong>
          </p>
          <div style="margin: 24px 0;">
            <a href="${esc(data.loginUrl)}" style="background: #EEAE9D; color: #161616; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Log In to Portal
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">
            If you did not request this account, please contact your administrator.
          </p>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Policy expiry reminder email
   */
  policyExpiryReminder: (data: {
    customerName: string;
    policyNumber: string;
    policyType: string;
    expiryDate: string;
    daysRemaining: number;
    agentName: string;
    agentPhone?: string;
  }) => ({
    subject: `Policy Expiry Reminder — ${esc(data.policyNumber)} expires in ${esc(data.daysRemaining)} days`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #161616; margin: 0 0 16px;">Policy Expiry Reminder</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.customerName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your <strong>${esc(data.policyType)}</strong> policy is expiring soon. Please find the details below:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5; width: 40%;">Policy Number</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">${esc(data.policyNumber)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Policy Type</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${esc(data.policyType)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Expiry Date</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: #ef4444; font-weight: 600;">${esc(data.expiryDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Days Remaining</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: ${data.daysRemaining <= 7 ? "#ef4444" : "#f59e0b"}; font-weight: 600;">${esc(data.daysRemaining)} days</td>
            </tr>
          </table>
          <p style="color: #5D5D5D; line-height: 1.6;">
            To ensure uninterrupted coverage, please contact your agent for renewal:
          </p>
          <p style="color: #161616; font-weight: 600;">
            ${esc(data.agentName)}${data.agentPhone ? ` — ${esc(data.agentPhone)}` : ""}
          </p>
        </div>
        ${emailFooter("This is an automated reminder.")}
      </div>
    `,
  }),

  /**
   * Payment due / renewal reminder email
   */
  paymentReminder: (data: {
    customerName: string;
    policyNumber: string;
    policyType: string;
    premiumAmount: string;
    dueDate: string;
    daysOverdue: number;
    agentName: string;
    agentPhone?: string;
  }) => ({
    subject: `Payment Reminder — Policy ${esc(data.policyNumber)}${data.daysOverdue > 0 ? " (Overdue)" : ""}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: ${data.daysOverdue > 0 ? "#ef4444" : "#f59e0b"}; margin: 0 0 16px;">
            ${data.daysOverdue > 0 ? "&#9888; Payment Overdue" : "&#128276; Payment Reminder"}
          </h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.customerName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            ${data.daysOverdue > 0
              ? `Your payment for policy <strong>${esc(data.policyNumber)}</strong> is <strong style="color:#ef4444;">${esc(data.daysOverdue)} days overdue</strong>. Please make the payment immediately to avoid a lapse in coverage.`
              : `This is a friendly reminder that your payment for policy <strong>${esc(data.policyNumber)}</strong> is due soon. Please arrange payment to ensure uninterrupted coverage.`
            }
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5; width: 40%;">Policy Number</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">${esc(data.policyNumber)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Policy Type</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${esc(data.policyType)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Amount Due</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600; color: #161616;">&#8377;${esc(data.premiumAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Due Date</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: ${data.daysOverdue > 0 ? "#ef4444" : "#f59e0b"}; font-weight: 600;">${esc(data.dueDate)}</td>
            </tr>
          </table>
          <p style="color: #5D5D5D; line-height: 1.6;">
            For any queries or to make a payment, please contact your agent:
          </p>
          <p style="color: #161616; font-weight: 600;">
            ${esc(data.agentName)}${data.agentPhone ? ` &#8212; ${esc(data.agentPhone)}` : ""}
          </p>
          ${data.daysOverdue > 0 ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-top: 16px;">
            <p style="color: #991b1b; margin: 0; font-size: 13px;">
              <strong>Important:</strong> Failure to pay on time may result in policy cancellation and loss of coverage. Please act immediately.
            </p>
          </div>` : ""}
        </div>
        ${emailFooter("This is an automated payment reminder.")}
      </div>
    `,
  }),

  /**
   * Renewal confirmation email
   */
  renewalConfirmation: (data: {
    customerName: string;
    policyNumber: string;
    newPolicyNumber?: string;
    policyType: string;
    newExpiryDate: string;
    premiumAmount: number;
  }) => ({
    subject: `Renewal Confirmed — ${esc(data.policyNumber)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #22c55e; margin: 0 0 16px;">Renewal Confirmed &#10003;</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.customerName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your ${esc(data.policyType)} policy has been successfully renewed.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5; width: 40%;">Previous Policy</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${esc(data.policyNumber)}</td>
            </tr>
            ${data.newPolicyNumber ? `
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">New Policy</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">${esc(data.newPolicyNumber)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Valid Until</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: #22c55e; font-weight: 600;">${esc(data.newExpiryDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Premium</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">&#8377;${data.premiumAmount.toLocaleString("en-IN")}</td>
            </tr>
          </table>
          <p style="color: #9ca3af; font-size: 13px;">
            Thank you for choosing ${co()}.
          </p>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Commission payout notification email
   */
  commissionPayout: (data: {
    agentName: string;
    amount: number;
    policyCount: number;
    period: string;
  }) => ({
    subject: `Commission Payout — ₹${data.amount.toLocaleString("en-IN")}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #161616; margin: 0 0 16px;">Commission Payout</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.agentName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your commission payout for <strong>${esc(data.period)}</strong> has been processed.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #5D5D5D; margin: 0 0 8px; font-size: 14px;">Total Payout</p>
            <p style="color: #22c55e; margin: 0; font-size: 32px; font-weight: 700;">&#8377;${data.amount.toLocaleString("en-IN")}</p>
            <p style="color: #5D5D5D; margin: 8px 0 0; font-size: 14px;">
              across ${data.policyCount} ${data.policyCount === 1 ? "policy" : "policies"}
            </p>
          </div>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Password reset notification (post-reset confirmation)
   */
  passwordReset: (data: { name: string }) => ({
    subject: `Password Reset — ${co()} Portal`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #161616; margin: 0 0 16px;">Password Reset</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.name)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your password has been successfully reset. If you did not initiate this change, please contact your administrator immediately.
          </p>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Late check-in notification email (sent to the employee)
   */
  lateCheckIn: (data: {
    employeeName: string;
    date: string;
    checkInTime: string;
    officeStartTime: string;
    lateByMinutes: number;
  }) => ({
    subject: `Late Check-In Notice — ${esc(data.date)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #f59e0b; margin: 0 0 16px;">&#9200; Late Check-In Notice</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.employeeName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            This is to inform you that your check-in today was recorded as <strong style="color: #f59e0b;">late</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5; width: 40%;">Date</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">${esc(data.date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Office Start Time</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${esc(data.officeStartTime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Your Check-In</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: #f59e0b; font-weight: 600;">${esc(data.checkInTime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Late By</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: #ef4444; font-weight: 600;">${esc(data.lateByMinutes)} minutes</td>
            </tr>
          </table>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Please ensure you arrive on time. Repeated late arrivals may be flagged in your attendance record.
          </p>
        </div>
        ${emailFooter("Automated attendance notification.")}
      </div>
    `,
  }),

  /**
   * Absent employee reminder email (sent by admin/manager to absent employee)
   */
  absentReminder: (data: {
    employeeName: string;
    date: string;
    senderName: string;
    message?: string;
  }) => ({
    subject: `Attendance Reminder — ${esc(data.date)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #ef4444; margin: 0 0 16px;">&#128276; Attendance Reminder</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.employeeName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            We noticed that you have <strong style="color: #ef4444;">not checked in</strong> today (<strong>${esc(data.date)}</strong>).
          </p>
          ${data.message ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 13px;">
              <strong>Message from ${esc(data.senderName)}:</strong> ${esc(data.message)}
            </p>
          </div>` : ""}
          <p style="color: #5D5D5D; line-height: 1.6;">
            If you are on leave, please inform your manager. Otherwise, please check in as soon as possible.
          </p>
          <p style="color: #161616; font-weight: 600; margin-top: 20px;">
            — ${esc(data.senderName)}
          </p>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Early checkout notification email (sent to employee when approved)
   */
  earlyCheckoutNotice: (data: {
    employeeName: string;
    date: string;
    checkOutTime: string;
    approvedBy: string;
    reason: string;
  }) => ({
    subject: `Early Checkout Approved — ${esc(data.date)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #22c55e; margin: 0 0 16px;">&#10003; Early Checkout Approved</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.employeeName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your early checkout request has been <strong style="color: #22c55e;">approved</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5; width: 40%;">Date</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">${esc(data.date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Checkout Time</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${esc(data.checkOutTime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Reason</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5;">${esc(data.reason)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">Approved By</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; font-weight: 600;">${esc(data.approvedBy)}</td>
            </tr>
          </table>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Generic notification email
   */
  generic: (data: { recipientName: string; title: string; body: string; ctaText?: string; ctaUrl?: string }) => ({
    subject: data.title,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.recipientName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            ${esc(data.body)}
          </p>
          ${data.ctaText && data.ctaUrl ? `
          <div style="margin: 24px 0;">
            <a href="${esc(data.ctaUrl)}" style="background: #EEAE9D; color: #161616; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              ${esc(data.ctaText)}
            </a>
          </div>` : ""}
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * KYC Document Request email
   */
  kycReminder: (data: {
    customerName: string;
    portalUrl: string;
    senderName: string;
  }) => ({
    subject: `Action Required: Please Upload Your KYC Documents`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #f59e0b; margin: 0 0 16px;">&#9888; KYC Documents Required</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.customerName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            We noticed that your latest KYC (Know Your Customer) documents are missing or require an update.
            Ensuring your KYC is up to date is essential for uninterrupted service and compliance.
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Please log in to your Customer Portal to upload your documents securely.
          </p>
          <div style="margin: 24px 0;">
            <a href="${esc(data.portalUrl)}" style="background: #EEAE9D; color: #161616; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Upload KYC Now
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
            If you have any questions, please contact our support team or reach out directly to <strong>${esc(data.senderName)}</strong>.
          </p>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Alert sent to original email when Customer login gets modified
   */
  emailChangedOld: (data: {
    customerName: string;
    oldEmail: string;
    newEmail: string;
  }) => ({
    subject: `Security Alert: Your Login ID has been Changed`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #ef4444; margin: 0 0 16px;">&#128274; Login Email Changed</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.customerName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            The email address associated with your Customer Portal login has just been updated by an administrator.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5; width: 40%;">Previous Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: #ef4444; font-weight: 600; text-decoration: line-through;">${esc(data.oldEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f9f9f9; color: #5D5D5D; border: 1px solid #e5e5e5;">New Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e5e5; color: #10b981; font-weight: 600;">${esc(data.newEmail)}</td>
            </tr>
          </table>
          <p style="color: #5D5D5D; line-height: 1.6;">
            If you requested this change, no further action is needed. However, if you did not request or authorize this change, please contact our support team immediately.
          </p>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),

  /**
   * Alert sent to new email when Customer login gets modified
   */
  emailChangedNew: (data: {
    customerName: string;
    newEmail: string;
    portalUrl: string;
  }) => ({
    subject: `Your Login Credentials have been Updated`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background: #161616; padding: 24px 32px;">
          <h1 style="color: #EEAE9D; margin: 0; font-size: 24px;">${co()}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #161616; margin: 0 0 16px;">Login Email Updated</h2>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Dear <strong>${esc(data.customerName)}</strong>,
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            Your portal login details have been updated by an administrator. This email address (<strong>${esc(data.newEmail)}</strong>) will now be used as your Login ID for the Customer Portal.
          </p>
          <p style="color: #5D5D5D; line-height: 1.6;">
            If you do not know your password, please use the <strong>Forgot Password</strong> option on the login screen, or contact your agent or administrator for your new credentials.
          </p>
          <div style="margin: 24px 0;">
            <a href="${esc(data.portalUrl)}" style="background: #EEAE9D; color: #161616; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Go to Customer Portal
            </a>
          </div>
        </div>
        ${emailFooter()}
      </div>
    `,
  }),
};

// ---- Email Service ----

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the SMTP transporter from environment variables.
   */
  private init() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn(
        "[EmailService] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local. Emails will be logged to console."
      );
      this.isConfigured = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.isConfigured = true;
    // Server-side only — safe to keep as debug info
    if (process.env.NODE_ENV !== "production") {
      console.info(`[EmailService] Configured — ${host}:${port}`);
    }
  }

  /** Maximum retry attempts for transient SMTP failures. */
  private static MAX_RETRIES = 3;

  /**
   * Send an email with automatic retry (exponential backoff).
   * Falls back to console logging if SMTP is not configured.
   */
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@bpaf.in";
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    // Fallback: log to console if SMTP not configured
    if (!this.isConfigured || !this.transporter) {
      console.warn("[EmailService] (no SMTP) Would send:", { to, subject: options.subject });
      return { success: true, messageId: "console-fallback" };
    }

    let lastError = "";

    for (let attempt = 1; attempt <= EmailService.MAX_RETRIES; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo || coEmail() || undefined,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
          attachments: options.attachments,
        });

        return { success: true, messageId: info.messageId };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.warn(
          `[EmailService] Attempt ${attempt}/${EmailService.MAX_RETRIES} failed → ${to} | ${options.subject} | ${lastError}`
        );

        // Don't retry on the last attempt
        if (attempt < EmailService.MAX_RETRIES) {
          // Exponential backoff: 1s, 2s
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    console.error(`[EmailService] All ${EmailService.MAX_RETRIES} attempts failed → ${to} | ${options.subject}`);
    return { success: false, error: lastError };
  }

  /**
   * Verify the SMTP connection is working.
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  // ---- Template Methods ----

  async sendWelcome(to: string, data: Parameters<typeof TEMPLATES.welcome>[0]) {
    const { subject, html } = TEMPLATES.welcome(data);
    return this.send({ to, subject, html });
  }

  async sendPolicyExpiryReminder(to: string, data: Parameters<typeof TEMPLATES.policyExpiryReminder>[0]) {
    // Use custom template from settings if available
    if (_renewalEmailTemplate) {
      const html = processCustomTemplate(_renewalEmailTemplate, {
        customer_name: data.customerName,
        policy_number: data.policyNumber,
        expiry_date: data.expiryDate,
        policy_type: data.policyType,
        days_remaining: data.daysRemaining,
        agent_name: data.agentName,
      });
      return this.send({ to, subject: `Policy Expiry Reminder — ${data.policyNumber}`, html });
    }
    const { subject, html } = TEMPLATES.policyExpiryReminder(data);
    return this.send({ to, subject, html });
  }

  async sendPaymentReminder(to: string, data: Parameters<typeof TEMPLATES.paymentReminder>[0]) {
    const { subject, html } = TEMPLATES.paymentReminder(data);
    return this.send({ to, subject, html });
  }

  async sendRenewalConfirmation(to: string, data: Parameters<typeof TEMPLATES.renewalConfirmation>[0]) {
    // Use custom policy issuance template from settings if available
    if (_policyEmailTemplate) {
      const html = processCustomTemplate(_policyEmailTemplate, {
        customer_name: data.customerName,
        policy_number: data.newPolicyNumber || data.policyNumber,
        policy_type: data.policyType,
        expiry_date: data.newExpiryDate,
      });
      return this.send({ to, subject: `Renewal Confirmed — ${data.policyNumber}`, html });
    }
    const { subject, html } = TEMPLATES.renewalConfirmation(data);
    return this.send({ to, subject, html });
  }

  async sendCommissionPayout(to: string, data: Parameters<typeof TEMPLATES.commissionPayout>[0]) {
    const { subject, html } = TEMPLATES.commissionPayout(data);
    return this.send({ to, subject, html });
  }

  async sendPasswordReset(to: string, data: Parameters<typeof TEMPLATES.passwordReset>[0]) {
    const { subject, html } = TEMPLATES.passwordReset(data);
    return this.send({ to, subject, html });
  }

  async sendGeneric(to: string | string[], data: Parameters<typeof TEMPLATES.generic>[0]) {
    const { subject, html } = TEMPLATES.generic(data);
    return this.send({ to, subject, html });
  }

  async sendLateCheckIn(to: string, data: Parameters<typeof TEMPLATES.lateCheckIn>[0]) {
    const { subject, html } = TEMPLATES.lateCheckIn(data);
    return this.send({ to, subject, html });
  }

  async sendAbsentReminder(to: string, data: Parameters<typeof TEMPLATES.absentReminder>[0]) {
    const { subject, html } = TEMPLATES.absentReminder(data);
    return this.send({ to, subject, html });
  }

  async sendEarlyCheckoutNotice(to: string, data: Parameters<typeof TEMPLATES.earlyCheckoutNotice>[0]) {
    const { subject, html } = TEMPLATES.earlyCheckoutNotice(data);
    return this.send({ to, subject, html });
  }

  async sendKycReminder(to: string, data: Parameters<typeof TEMPLATES.kycReminder>[0]) {
    const { subject, html } = TEMPLATES.kycReminder(data);
    return this.send({ to, subject, html });
  }

  async sendEmailChangedOld(to: string, data: Parameters<typeof TEMPLATES.emailChangedOld>[0]) {
    const { subject, html } = TEMPLATES.emailChangedOld(data);
    return this.send({ to, subject, html });
  }

  async sendEmailChangedNew(to: string, data: Parameters<typeof TEMPLATES.emailChangedNew>[0]) {
    const { subject, html } = TEMPLATES.emailChangedNew(data);
    return this.send({ to, subject, html });
  }

  /**
   * Send email to multiple recipients (bulk).
   * Sends individually to avoid exposing recipient list.
   */
  async sendBulk(
    recipients: Array<{ email: string; name: string }>,
    templateFn: (name: string) => { subject: string; html: string }
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      const { subject, html } = templateFn(r.name);
      const result = await this.send({ to: r.email, subject, html });
      if (result.success) sent++;
      else failed++;
    }

    return { sent, failed };
  }
}

// Singleton export
export const emailService = new EmailService();

// Re-export templates for custom usage
export { TEMPLATES as emailTemplates };
