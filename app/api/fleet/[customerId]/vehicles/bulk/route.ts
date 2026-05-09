/**
 * POST /api/fleet/[customerId]/vehicles/bulk — bulk upload fleet vehicles from CSV/Excel
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

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  const required = ["Registration Number", "Make", "Model", "MFG Year"];
  for (const col of required) {
    if (!(col in rows[0])) {
      return NextResponse.json({ error: `Missing required column: ${col}` }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const errors: { row: number; field: string; message: string }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  // Get existing registration numbers
  const { data: existingVehicles } = await supabaseAdmin
    .from("fleet_vehicles")
    .select("registration_number")
    .neq("status", "Deleted");

  const existingRegs = new Set((existingVehicles ?? []).map((v: any) => v.registration_number.toUpperCase()));
  const seenInFile = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const regNum = String(row["Registration Number"] || "").trim().toUpperCase();
    const make = String(row["Make"] || "").trim();
    const model = String(row["Model"] || "").trim();
    const mfgYear = Number(row["MFG Year"]);
    const idv = row["IDV"] ? Number(row["IDV"]) : null;
    const seatingCapacity = row["Seating Capacity"] ? Number(row["Seating Capacity"]) : null;
    const gvw = row["GVW"] ? Number(row["GVW"]) : null;

    if (!regNum) { errors.push({ row: rowNum, field: "Registration Number", message: "Required" }); continue; }
    if (!make) { errors.push({ row: rowNum, field: "Make", message: "Required" }); continue; }
    if (!model) { errors.push({ row: rowNum, field: "Model", message: "Required" }); continue; }
    if (!mfgYear || mfgYear < 1900 || mfgYear > currentYear) {
      errors.push({ row: rowNum, field: "MFG Year", message: `Must be between 1900 and ${currentYear}` }); continue;
    }
    if (idv !== null && idv <= 0) { errors.push({ row: rowNum, field: "IDV", message: "Must be positive" }); continue; }
    if (seatingCapacity !== null && seatingCapacity <= 0) { errors.push({ row: rowNum, field: "Seating Capacity", message: "Must be positive" }); continue; }

    if (existingRegs.has(regNum) || seenInFile.has(regNum)) {
      errors.push({ row: rowNum, field: "Registration Number", message: `Duplicate: ${regNum}` }); continue;
    }

    seenInFile.add(regNum);
    toInsert.push({
      customer_id: customerId,
      policy_id: policyId,
      registration_number: regNum,
      make,
      model,
      variant: String(row["Variant"] || "").trim() || null,
      fuel_type: String(row["Fuel Type"] || "").trim() || null,
      chassis_number: String(row["Chassis Number"] || "").trim() || null,
      engine_number: String(row["Engine Number"] || "").trim() || null,
      mfg_year: mfgYear,
      seating_capacity: seatingCapacity,
      gvw,
      idv,
      vehicle_category: String(row["Vehicle Category"] || "").trim() || null,
      status: "Active",
      created_by: caller.uid,
      created_at: now,
      updated_at: now,
    });
  }

  let successCount = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error: batchErr } = await supabaseAdmin.from("fleet_vehicles").insert(batch as any);
    if (batchErr) {
      errors.push({ row: i + 2, field: "batch", message: batchErr.message });
    } else {
      successCount += batch.length;
    }
  }

  // Notify uploader
  await supabaseAdmin.from("notifications").insert({
    user_id: caller.uid,
    title: "Fleet Bulk Upload Complete",
    message: `Vehicle upload: ${successCount} added, ${errors.length} failed`,
    type: "system",
    read: false,
    created_at: now,
    updated_at: now,
  } as any);

  return NextResponse.json({
    total_rows: rows.length,
    successful_rows: successCount,
    failed_rows: errors.length,
    errors: errors.slice(0, 50),
  });
}
