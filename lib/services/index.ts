/**
 * lib/services/index.ts
 * Barrel re-export for all Supabase service wrappers.
 *
 * Drop-in replacement for "@/lib/services":
 *   Change:  import { ... } from "@/lib/services"
 *   To:      import { ... } from "@/lib/services"
 */

// ── Auth ──────────────────────────────────────────────────────────
export { authService } from "./auth.service";

// ── Users ─────────────────────────────────────────────────────────
export { userService } from "./user.service";

// ── Customers ─────────────────────────────────────────────────────
export { customerService, createCustomerFromExtraction } from "./customer.service";

// ── Policies ──────────────────────────────────────────────────────
export { policyService } from "./policy.service";

// ── Renewals ──────────────────────────────────────────────────────
export { renewalService } from "./renewal.service";

// ── Premiums ──────────────────────────────────────────────────────
export { premiumService } from "./premium.service";

// ── Commissions ───────────────────────────────────────────────────
export { commissionService, commissionRuleService } from "./commission.service";

// ── Attendance ────────────────────────────────────────────────────
export { attendanceService, holidayService, earlyCheckoutService } from "./attendance.service";

// ── Documents ─────────────────────────────────────────────────────
export { documentService } from "./document.service";

// ── Notifications ─────────────────────────────────────────────────
export { notificationService } from "./notification.service";

// ── Campaigns & Archives ──────────────────────────────────────────
export { campaignService, archiveService } from "./campaign.service";

// ── Audit Logs ────────────────────────────────────────────────────
export { auditLogService } from "./audit-log.service";

// ── Settings ──────────────────────────────────────────────────────
export { settingsService } from "./settings.service";

// ── Dashboard ─────────────────────────────────────────────────────
export { dashboardService } from "./dashboard.service";

// ── Reports ───────────────────────────────────────────────────────
export { reportsService } from "./reports.service";

// ── Sales Leads ──────────────────────────────────────────────────
export { leadService } from "./lead.service";

// ── Proposals ────────────────────────────────────────────────────
export { proposalService } from "./proposal.service";

// ── Claims ───────────────────────────────────────────────────────
export { claimService } from "./claim.service";

// ── Invoices & Ledger ────────────────────────────────────────────
export { invoiceService, ledgerService } from "./invoice.service";

// ── KYC Documents ────────────────────────────────────────────────
export { kycService } from "./kyc.service";

// ── Endorsements ─────────────────────────────────────────────────
export { endorsementService } from "./endorsement.service";

// ── SOPs ─────────────────────────────────────────────────────────
export { sopService } from "./sop.service";

// ── Communications ───────────────────────────────────────────────
export { communicationService } from "./communication.service";

// ── Performance & Analytics ──────────────────────────────────────
export { performanceService } from "./performance.service";

// ── IRDA Reports ─────────────────────────────────────────────────
export { irdaService } from "./irda.service";

// ── Pending Data ─────────────────────────────────────────────────
export { pendingDataService } from "./pending-data.service";

// ── Business Cases & Service Desk ────────────────────────────────
export { businessCaseService } from "./business-case.service";
