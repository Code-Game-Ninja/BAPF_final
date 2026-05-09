/**
 * POST /api/gmc/[customerId]/members/bulk — bulk upload GMC members from CSV/Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

type Params = { params: Promise<{ customerId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const policyId = formData.get("policy_id") as string | null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!policyId) return NextResponse.json({ error: "policy_id is required" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });

  // Parse file
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  // Validate required columns
  const firstRow = rows[0];
  const required = ["Employee ID", "Name", "DOB", "Gender"];
  for (const col of required) {
    if (!(col in firstRow)) {
      return NextResponse.json({ error: `Missing required column: ${col}` }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const errors: { row: number; field: string; message: string }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  // Get existing employee IDs for this customer
  const { data: existingMembers } = await supabaseAdmin
    .from("gmc_members")
    .select("employee_id")
    .eq("customer_id", customerId)
    .neq("status", "Deleted");

  const existingIds = new Set((existingMembers ?? []).map((m: any) => m.employee_id));
  const seenInFile = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const employeeId = String(row["Employee ID"] || "").trim();
    const name = String(row["Name"] || "").trim();
    const dob = String(row["DOB"] || "").trim();
    const gender = String(row["Gender"] || "").trim();
    const mobile = String(row["Mobile"] || "").trim();
    const email = String(row["Email"] || "").trim();
    const department = String(row["Department"] || "").trim();
    const designation = String(row["Designation"] || "").trim();

    // Validate required fields
    if (!employeeId) { errors.push({ row: rowNum, field: "Employee ID", message: "Required" }); continue; }
    if (!name) { errors.push({ row: rowNum, field: "Name", message: "Required" }); continue; }
    if (!dob) { errors.push({ row: rowNum, field: "DOB", message: "Required" }); continue; }
    if (!gender) { errors.push({ row: rowNum, field: "Gender", message: "Required" }); continue; }

    // Validate gender
    if (!["Male", "Female", "Other"].includes(gender)) {
      errors.push({ row: rowNum, field: "Gender", message: "Must be Male, Female, or Other" }); continue;
    }

    // Validate DOB is in the past
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
      errors.push({ row: rowNum, field: "DOB", message: "Must be a valid past date" }); continue;
    }

    // Validate mobile format
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
      errors.push({ row: rowNum, field: "Mobile", message: "Must be a valid 10-digit mobile number" }); continue;
    }

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, field: "Email", message: "Invalid email format" }); continue;
    }

    // Check uniqueness
    if (existingIds.has(employeeId) || seenInFile.has(employeeId)) {
      errors.push({ row: rowNum, field: "Employee ID", message: `Duplicate: ${employeeId}` }); continue;
    }

    seenInFile.add(employeeId);
    toInsert.push({
      customer_id: customerId,
      policy_id: policyId,
      employee_id: employeeId,
      name,
      member_type: "employee",
      dob: dobDate.toISOString().split("T")[0],
      gender,
      mobile: mobile || null,
      email: email || null,
      department: department || null,
      designation: designation || null,
      status: "Active",
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    });
  }

  // Insert in batches of 100
  let successCount = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error: batchErr } = await supabaseAdmin.from("gmc_members").insert(batch as any);
    if (batchErr) {
      errors.push({ row: i + 2, field: "batch", message: batchErr.message });
    } else {
      successCount += batch.length;
    }
  }

  // Generate error report CSV if needed
  let errorReportUrl: string | null = null;
  if (errors.length > 0) {
    const csvRows = [["Row", "Field", "Error"], ...errors.map(e => [e.row, e.field, e.message])];
    const csv = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const path = `bulk-upload-errors/${customerId}/${Date.now()}.csv`;
    const { data: uploadData } = await supabaseAdmin.storage
      .from("documents")
      .upload(path, blob, { contentType: "text/csv" });
    if (uploadData) {
      const { data: urlData } = supabaseAdmin.storage.from("documents").getPublicUrl(path);
      errorReportUrl = urlData.publicUrl;
    }
  }

  // Notify uploader
  await supabaseAdmin.from("notifications").insert({
    user_id: caller.uid,
    title: "Bulk Upload Complete",
    message: `GMC member upload: ${successCount} added, ${errors.length} failed`,
    type: "system",
    read: false,
    created_at: now,
    updated_at: now,
  } as any);

  return NextResponse.json({
    total_rows: rows.length,
    successful_rows: successCount,
    failed_rows: errors.length,
    errors: errors.slice(0, 50), // Return first 50 errors
    error_report_url: errorReportUrl,
  });
}
