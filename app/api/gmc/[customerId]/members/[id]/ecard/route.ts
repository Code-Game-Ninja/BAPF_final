/**
 * POST /api/gmc/[customerId]/members/[id]/ecard — generate e-card PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Cast to any to support Phase 3 tables not yet in database.types.ts
const db = supabaseAdmin as any;

type Params = { params: Promise<{ customerId: string; id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId, id: memberId } = await params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* optional body */ }

  // Fetch member, policy, and template in parallel
  const [memberRes, templateRes] = await Promise.all([
    db.from("gmc_members").select("*, policies(*)").eq("id", memberId).single(),
    db.from("gmc_ecard_templates").select("*").eq("customer_id", customerId).maybeSingle(),
  ]);

  if (memberRes.error || !memberRes.data) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const member = memberRes.data;
  const template = templateRes.data;
  const policy = member.policies;

  // Generate PDF using pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]); // A5 landscape
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.97, 0.97, 1) });

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.1, 0.3, 0.7) });

  // Company name
  const companyName = template?.company_name || "Insurance Company";
  page.drawText(companyName, {
    x: 20, y: height - 50, size: 20, font: boldFont, color: rgb(1, 1, 1),
  });

  // E-Card label
  page.drawText("GROUP MEDICLAIM INSURANCE CARD", {
    x: 20, y: height - 70, size: 9, font, color: rgb(0.8, 0.9, 1),
  });

  // Member details section
  const leftX = 20;
  let y = height - 110;
  const lineH = 22;

  const drawField = (label: string, value: string) => {
    page.drawText(label + ":", { x: leftX, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(value || "—", { x: leftX + 120, y, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    y -= lineH;
  };

  drawField("Member Name", member.name);
  drawField("Employee ID", member.employee_id);
  drawField("Date of Birth", member.dob || "—");
  drawField("Gender", member.gender || "—");
  drawField("Member Type", member.member_type === "employee" ? "Employee" : "Dependent");

  // Policy details (right column)
  let ry = height - 110;
  const rightX = width / 2 + 20;

  const drawRightField = (label: string, value: string) => {
    page.drawText(label + ":", { x: rightX, y: ry, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(value || "—", { x: rightX + 120, y: ry, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    ry -= lineH;
  };

  drawRightField("Policy Number", policy?.policy_number || "—");
  drawRightField("Sum Insured", policy?.sum_insured ? `Rs.${policy.sum_insured.toLocaleString("en-IN")}` : "—");
  drawRightField("Valid From", policy?.start_date ? policy.start_date.split("T")[0] : "—");
  drawRightField("Valid To", policy?.end_date ? policy.end_date.split("T")[0] : "—");

  // TPA details
  if (template?.tpa_name) {
    drawRightField("TPA", template.tpa_name);
    if (template.tpa_contact) drawRightField("TPA Contact", template.tpa_contact);
  }

  // Emergency contact
  if (template?.emergency_contact) {
    page.drawText("Emergency: " + template.emergency_contact, {
      x: 20, y: 20, size: 9, font, color: rgb(0.8, 0.1, 0.1),
    });
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: rgb(0.1, 0.3, 0.7) });
  page.drawText("This card is for identification purposes only. Subject to policy terms and conditions.", {
    x: 20, y: 12, size: 7, font, color: rgb(0.8, 0.9, 1),
  });

  const pdfBytes = await pdfDoc.save();

  // Upload to Supabase Storage
  const filePath = `ecards/${customerId}/${memberId}/${Date.now()}.pdf`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from("documents")
    .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from("documents").getPublicUrl(filePath);
  const fileUrl = urlData.publicUrl;

  // Record generation
  const now = new Date().toISOString();
  await db.from("gmc_ecard_generations").insert({
    member_id: memberId,
    policy_id: member.policy_id,
    file_url: fileUrl,
    file_path: filePath,
    generated_by: caller.uid,
    generated_by_name: caller.name ?? caller.email,
    emailed_to: (body.email_to as string) || null,
    created_at: now,
  });

  // Audit log
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: "create", module: "gmc_ecard",
      details: `Generated e-card for member: ${member.name}`,
      user_id: caller.uid, user_name: caller.name ?? caller.email,
      user_role: caller.role, created_at: now,
    } as any);
  } catch { /* non-critical */ }

  return NextResponse.json({ file_url: fileUrl, file_path: filePath });
}
