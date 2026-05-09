/**
 * GET /api/fleet/[customerId]/validity — validity dashboard data
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ customerId: string }> };

interface FleetVehicle {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  vehicle_category: string | null;
  status: string | null;
}

interface ValidityDocument {
  id: string;
  vehicle_id: string;
  document_type: string;
  expiry_date: string;
  document_url: string | null;
  [key: string]: unknown;
}

interface EnrichedValidity extends ValidityDocument {
  vehicle: FleetVehicle | undefined;
  days_remaining: number;
  expiry_bucket: "expired" | "7_days" | "15_days" | "30_days";
}

export async function GET(req: NextRequest, { params }: Params) {
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  const { customerId } = await params;
  const { searchParams } = new URL(req.url);
  const docType = searchParams.get("document_type") ?? "";
  const category = searchParams.get("vehicle_category") ?? "";

  // Get all vehicles for this customer
  let vehicleQuery = supabaseAdmin
    .from("fleet_vehicles")
    .select("id, registration_number, make, model, vehicle_category, status")
    .eq("customer_id", customerId)
    .eq("status", "Active");

  if (category) vehicleQuery = vehicleQuery.eq("vehicle_category", category);

  const { data: vehicles } = await vehicleQuery as { data: FleetVehicle[] | null };
  if (!vehicles || vehicles.length === 0) {
    return NextResponse.json({ data: [], summary: { expired: 0, expiring_7: 0, expiring_15: 0, expiring_30: 0 } });
  }

  const vehicleIds = vehicles.map(v => v.id);

  // Get validity documents
  let validityQuery = supabaseAdmin
    .from("fleet_validity_documents")
    .select("*")
    .in("vehicle_id", vehicleIds)
    .lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  if (docType) validityQuery = validityQuery.eq("document_type", docType);

  const { data: validityDocs } = await validityQuery as { data: ValidityDocument[] | null };

  const vehicleMap = new Map<string, FleetVehicle>(vehicles.map(v => [v.id, v]));
  const today = new Date();

  const enriched: EnrichedValidity[] = (validityDocs ?? []).map(doc => {
    const vehicle = vehicleMap.get(doc.vehicle_id);
    const expiryDate = new Date(doc.expiry_date);
    const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...doc,
      vehicle,
      days_remaining: daysLeft,
      expiry_bucket: daysLeft < 0 ? "expired" : daysLeft <= 7 ? "7_days" : daysLeft <= 15 ? "15_days" : "30_days",
    } as EnrichedValidity;
  }).sort((a, b) => a.days_remaining - b.days_remaining);

  const summary = {
    expired: enriched.filter(d => d.days_remaining < 0).length,
    expiring_7: enriched.filter(d => d.days_remaining >= 0 && d.days_remaining <= 7).length,
    expiring_15: enriched.filter(d => d.days_remaining > 7 && d.days_remaining <= 15).length,
    expiring_30: enriched.filter(d => d.days_remaining > 15 && d.days_remaining <= 30).length,
  };

  return NextResponse.json({ data: enriched, summary });
}
