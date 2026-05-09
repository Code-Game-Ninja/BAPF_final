/**
 * Supabase Pending Data Service — Dashboard for missing/incomplete data
 */
import { supabase } from "@/lib/supabase/client";

export interface PendingDataSummary {
  policiesWithoutPdf: number;
  customersWithMissingFields: number;
  pendingKycVerifications: number;
  incompleteClaimDocuments: number;
  unsignedProposals: number;
  overdueInvoices: number;
  pendingEndorsements: number;
  items: PendingDataItem[];
}

export interface PendingDataItem {
  type: string;
  title: string;
  description: string;
  link: string;
  severity: "high" | "medium" | "low";
}

async function getPendingDataSummary(): Promise<PendingDataSummary> {
  const items: PendingDataItem[] = [];

  // Policies without PDF
  const { count: noPdfCount } = await supabase
    .from("policies")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .or("pdf_url.is.null,pdf_url.eq.");
  const policiesWithoutPdf = noPdfCount ?? 0;
  if (policiesWithoutPdf > 0) {
    items.push({
      type: "policy",
      title: `${policiesWithoutPdf} policies without PDF`,
      description: "Active policies missing uploaded PDF documents",
      link: "/dashboard/policies?filter=no_pdf",
      severity: "high",
    });
  }

  // Customers with missing phone/email
  const { data: incompleteCusts } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .or("email.is.null,email.eq.,phone.is.null,phone.eq.")
    .eq("status", "active");
  const customersWithMissingFields = (incompleteCusts ?? []).length;
  if (customersWithMissingFields > 0) {
    items.push({
      type: "customer",
      title: `${customersWithMissingFields} customers with incomplete data`,
      description: "Customers missing email or phone number",
      link: "/dashboard/customers",
      severity: "medium",
    });
  }

  // Pending KYC verifications
  const { count: pendingKyc } = await supabase.from("kyc_documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const pendingKycVerifications = pendingKyc ?? 0;
  if (pendingKycVerifications > 0) {
    items.push({
      type: "kyc",
      title: `${pendingKycVerifications} KYC documents pending verification`,
      description: "KYC documents uploaded but not yet verified",
      link: "/dashboard/kyc",
      severity: "high",
    });
  }

  // Incomplete claim documents (registered claims without documents)
  const { data: openClaims } = await supabase.from("claims")
    .select("id")
    .in("status", ["registered", "documents_pending"]);
  const incompleteClaimDocuments = (openClaims ?? []).length;
  if (incompleteClaimDocuments > 0) {
    items.push({
      type: "claim",
      title: `${incompleteClaimDocuments} claims pending documents`,
      description: "Claims that need documentation for processing",
      link: "/dashboard/claims?status=documents_pending",
      severity: "high",
    });
  }

  // Unsigned proposals (draft or submitted)
  const { count: draftProposals } = await supabase.from("proposals")
    .select("*", { count: "exact", head: true })
    .in("status", ["draft", "submitted"]);
  const unsignedProposals = draftProposals ?? 0;
  if (unsignedProposals > 0) {
    items.push({
      type: "proposal",
      title: `${unsignedProposals} proposals pending review`,
      description: "Proposals in draft or submitted status",
      link: "/dashboard/proposals",
      severity: "medium",
    });
  }

  // Overdue invoices
  const today = new Date().toISOString().split("T")[0];
  const { count: overdueInv } = await supabase.from("invoices")
    .select("*", { count: "exact", head: true })
    .in("status", ["sent", "overdue"])
    .lt("due_date", today);
  const overdueInvoices = overdueInv ?? 0;
  if (overdueInvoices > 0) {
    items.push({
      type: "invoice",
      title: `${overdueInvoices} overdue invoices`,
      description: "Invoices past their due date",
      link: "/dashboard/invoices?status=overdue",
      severity: "high",
    });
  }

  // Pending endorsements
  const { count: pendingEnd } = await supabase.from("endorsements")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const pendingEndorsements = pendingEnd ?? 0;
  if (pendingEndorsements > 0) {
    items.push({
      type: "endorsement",
      title: `${pendingEndorsements} endorsements pending approval`,
      description: "Endorsement requests awaiting review",
      link: "/dashboard/endorsements",
      severity: "medium",
    });
  }

  return {
    policiesWithoutPdf,
    customersWithMissingFields,
    pendingKycVerifications,
    incompleteClaimDocuments,
    unsignedProposals,
    overdueInvoices,
    pendingEndorsements,
    items: items.sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 };
      return sev[a.severity] - sev[b.severity];
    }),
  };
}

export const pendingDataService = { getPendingDataSummary };
