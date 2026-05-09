/**
 * POST /api/email
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side email dispatch via nodemailer.
 * Admin / manager / system usage only.
 *
 * Body:
 * {
 *   to: string | string[]
 *   template: "welcome" | "password_reset" | "policy_expiry" | "renewal_reminder" | "custom"
 *
 *   // For `custom` template or subject override:
 *   subject?: string
 *   html?: string
 *   text?: string
 *
 *   // Template variables (merged into template):
 *   vars?: Record<string, string>
 * }
 *
 * Env vars required:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { protect } from "@/lib/api/protect";
import nodemailer from "nodemailer";

// ── Template library ─────────────────────────────────────────────────────────

type TemplateVars = Record<string, string>;

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function renderTemplate(name: string, vars: TemplateVars): EmailTemplate | null {
  /** HTML-escape a template variable to prevent XSS/injection */
  const esc = (k: string): string => {
    const raw = vars[k] ?? `{${k}}`;
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  switch (name) {
    case "welcome":
      return {
        subject: `Welcome to BPAF Insurance, ${esc("name")}!`,
        html: `<p>Dear ${esc("name")},</p><p>Welcome to BPAF Insurance. Your account has been created successfully.</p><p>Email: <strong>${esc("email")}</strong><br>Temporary password: <strong>${esc("password")}</strong></p><p>Please change your password upon first login.</p>`,
        text: `Welcome ${esc("name")}. Your BPAF Insurance account is ready.\nEmail: ${esc("email")}\nTemporary password: ${esc("password")}`,
      };

    case "password_reset":
      return {
        subject: "BPAF Insurance – Password Reset",
        html: `<p>Dear ${esc("name")},</p><p>A password reset was requested for your account.</p><p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="${esc("reset_link")}">${esc("reset_link")}</a></p><p>If you didn't request this, please ignore this email.</p>`,
        text: `Password reset link (valid 1 hour):\n${esc("reset_link")}`,
      };

    case "policy_expiry":
      return {
        subject: `BPAF – Policy ${esc("policy_number")} Expiring Soon`,
        html: `<p>Dear ${esc("customer_name")},</p><p>Your insurance policy <strong>${esc("policy_number")}</strong> (${esc("policy_type")}) is expiring on <strong>${esc("expiry_date")}</strong>.</p><p>Please contact us to renew before the expiry date to avoid a lapse in coverage.</p>`,
        text: `Your policy ${esc("policy_number")} expires on ${esc("expiry_date")}. Please contact us to renew.`,
      };

    case "renewal_reminder":
      return {
        subject: `BPAF – Renewal Reminder for Policy ${esc("policy_number")}`,
        html: `<p>Dear ${esc("customer_name")},</p><p>This is a reminder that your policy <strong>${esc("policy_number")}</strong> is due for renewal.</p><p>Next due date: <strong>${esc("due_date")}</strong></p><p>Amount due: <strong>₹${esc("amount")}</strong></p><p>Please arrange payment at your earliest convenience.</p>`,
        text: `Renewal reminder: Policy ${esc("policy_number")} is due on ${esc("due_date")} for ₹${esc("amount")}.`,
      };

    default:
      return null;
  }
}

// ── Lazy transporter ─────────────────────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ error: "SMTP not configured." }, { status: 503 });
  }

  let body: {
    to: string | string[];
    template?: string;
    subject?: string;
    html?: string;
    text?: string;
    vars?: TemplateVars;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.to) {
    return NextResponse.json({ error: "Missing `to` field" }, { status: 422 });
  }

  let subject = body.subject ?? "(no subject)";
  let html    = body.html   ?? "";
  let text    = body.text   ?? "";

  if (body.template && body.template !== "custom") {
    const tmpl = renderTemplate(body.template, body.vars ?? {});
    if (!tmpl) {
      return NextResponse.json({ error: `Unknown template: ${body.template}` }, { status: 400 });
    }
    subject = body.subject ?? tmpl.subject;
    html    = tmpl.html;
    text    = tmpl.text;
  }

  if (!html && !text) {
    return NextResponse.json(
      { error: "Provide either `template`, `html`, or `text` in the body." },
      { status: 422 }
    );
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: Array.isArray(body.to) ? body.to.join(", ") : body.to,
      subject,
      html: html || undefined,
      text: text || undefined,
    });

    return NextResponse.json({ messageId: info.messageId, accepted: info.accepted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
