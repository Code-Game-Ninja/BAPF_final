"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pencil, Trash2, Phone, Mail, MapPin, Copy, Check,
  Calendar, FileText, User as UserIcon, Loader2, Shield, Upload,
  Plus, Building2, Users, CreditCard, TrendingUp, AlertTriangle,
  MessageSquare, BarChart3, Zap, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useCustomer, invalidateCustomers } from "@/lib/hooks/use-customers";
import { usePoliciesByCustomer } from "@/lib/hooks/use-policies";
import { useKYCDocuments } from "@/lib/hooks/use-kyc";
import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { kycService } from "@/lib/services/kyc.service";
import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { Customer, ClientType } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerForm } from "@/components/customers/customer-form";
import { KYCUploadDialog } from "@/components/kyc/kyc-upload-dialog";
import { CustomerMetadataView } from "@/components/customers/CustomerMetadataView";

// Tab imports
import { ContactsTab } from "./tabs/ContactsTab";
import { PoliciesTab } from "./tabs/PoliciesTab";
import { CasesTab } from "./tabs/CasesTab";
import { ClaimsTab } from "./tabs/ClaimsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { CommunicationTab } from "./tabs/CommunicationTab";
import { FinancialTab } from "./tabs/FinancialTab";
import { RenewalRiskTab } from "./tabs/RenewalRiskTab";
import { ServiceIssuesTab } from "./tabs/ServiceIssuesTab";
import { InsurerRelationsTab } from "./tabs/InsurerRelationsTab";
import { QuickActionsTab } from "./tabs/QuickActionsTab";

const TYPE_COLORS: Record<string, string> = {
  individual: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  corporate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sme: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  government: "bg-green-500/10 text-green-400 border-green-500/20",
  other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const KYC_COLORS: Record<string, string> = {
  verified: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

type TabKey =
  | "overview" | "contacts" | "policies" | "cases" | "claims"
  | "documents" | "communication" | "financial"
  | "renewal" | "service" | "insurer" | "actions";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: UserIcon },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "policies", label: "Policies", icon: FileText },
  { key: "cases", label: "Cases", icon: Briefcase },
  { key: "claims", label: "Claims", icon: Shield },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "communication", label: "Communications", icon: MessageSquare },
  { key: "financial", label: "Financial", icon: CreditCard },
  { key: "renewal", label: "Renewal Risk", icon: TrendingUp },
  { key: "service", label: "Service Issues", icon: AlertTriangle },
  { key: "insurer", label: "Insurers", icon: Building2 },
  { key: "actions", label: "Quick Actions", icon: Zap },
];

interface Client360ViewProps {
  customerId: string;
}

export function Client360View({ customerId }: Client360ViewProps) {
  const router = useRouter();
  const { user, role, session } = useAuth();
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: linkedPolicies } = usePoliciesByCustomer(customerId);
  const { data: kycDocs, mutate: mutateKYC } = useKYCDocuments(customerId);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kycUploadOpen, setKycUploadOpen] = useState(false);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  const handleCopyUID = async () => {
    if (!customer) return;
    await navigator.clipboard.writeText(customer.uid);
    setCopied(true);
    toast.success("UID copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!customer || !user) return;
    setDeleting(true);
    try {
      try {
        const token = session?.access_token;
        if (token) {
          await fetch(`/api/customers/${customer.id}/deactivate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          });
        }
      } catch { /* non-critical */ }

      const cascade = await customerService.deleteWithCascade(customer.id, user.id);
      const parts = [
        cascade.cancelledPolicies && `${cascade.cancelledPolicies} policy(ies)`,
        cascade.cancelledPremiums && `${cascade.cancelledPremiums} premium(s)`,
        cascade.rejectedCommissions && `${cascade.rejectedCommissions} commission(s)`,
        cascade.lostRenewals && `${cascade.lostRenewals} renewal(s)`,
      ].filter(Boolean);
      const msg = parts.length ? ` — also affected ${parts.join(", ")}` : "";
      await auditLogService.logAction(user.id, user.name, "deactivate", "customer",
        `Deactivated customer: ${customer.name} (${customer.uid})${msg}`);
      toast.success(`Customer deactivated${msg}`);
      invalidateCustomers();
      router.push("/dashboard/customers");
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <UserIcon className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/customers")}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const createdDate = customer.createdAt
    ? format(new Date(customer.createdAt), "dd MMM yyyy")
    : "—";

  const pendingKYC = (kycDocs ?? []).filter(d => d.status === "pending").length;
  const verifiedKYC = (kycDocs ?? []).filter(d => d.status === "verified").length;
  const policyCount = linkedPolicies?.length ?? 0;
  const activePolicies = linkedPolicies?.filter(p => p.status === "active").length ?? 0;

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Back + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/customers")} className="gap-2 self-start">
          <ArrowLeft className="w-4 h-4" /> All Entities
        </Button>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setFormOpen(true)} className="gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/customers/new`)} className="gap-2">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}
              className="gap-2 text-red-400 hover:text-red-400 border-red-400/30">
              <Trash2 className="w-4 h-4" /> Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-heading font-bold text-primary">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-heading font-bold text-foreground uppercase tracking-wider">
                {customer.name}
              </h1>
              <Badge variant="outline" className={`text-xs ${TYPE_COLORS[customer.type] || TYPE_COLORS.other}`}>
                {customer.type || "individual"}
              </Badge>
              <Badge variant="outline" className={`text-xs ${
                customer.status === "inactive"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-green-500/10 text-green-400 border-green-500/20"
              }`}>
                {customer.status || "active"}
              </Badge>
            </div>

            {/* UID */}
            <button onClick={handleCopyUID} className="flex items-center gap-1.5 mb-3">
              <Badge variant="secondary" className="text-primary bg-primary/10 font-mono text-xs">
                {customer.uid}
              </Badge>
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-400" />
                : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>

            {/* Contact row */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </span>
              )}
              {customer.email && customer.email !== "N/A" && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </span>
              )}
              {(customer.city || customer.state) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {[customer.city, customer.state].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Since {createdDate}
              </span>
            </div>
          </div>

          {/* KYC badge */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={`text-xs ${KYC_COLORS[customer.kyc_status || "pending"]}`}>
              <Shield className="w-3 h-3 mr-1" />
              KYC: {customer.kyc_status || "pending"}
            </Badge>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Policies", value: policyCount, sub: `${activePolicies} active` },
            { label: "KYC Docs", value: kycDocs?.length ?? 0, sub: `${verifiedKYC} verified` },
            { label: "KYC Pending", value: pendingKYC, sub: pendingKYC > 0 ? "Action needed" : "All clear" },
            { label: "Type", value: customer.type || "individual", sub: "Entity type", isText: true },
          ].map(({ label, value, sub, isText }) => (
            <div key={label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">{label}</p>
              <p className={`font-bold mt-0.5 ${isText ? "text-sm capitalize" : "text-xl"}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="overflow-x-auto">
        <div className="flex gap-0.5 border-b border-border min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <CustomerMetadataView customer={customer} />
          </div>
        )}
        {activeTab === "contacts" && <ContactsTab customer={customer} />}
        {activeTab === "policies" && <PoliciesTab customerId={customerId} />}
        {activeTab === "cases" && <CasesTab customerId={customerId} />}
        {activeTab === "claims" && <ClaimsTab customerId={customerId} />}
        {activeTab === "documents" && (
          <DocumentsTab
            customerId={customerId}
            kycDocs={kycDocs ?? []}
            onMutate={mutateKYC}
            kycUploadOpen={kycUploadOpen}
            setKycUploadOpen={setKycUploadOpen}
            customerName={customer.name}
          />
        )}
        {activeTab === "communication" && <CommunicationTab customerId={customerId} />}
        {activeTab === "financial" && <FinancialTab customerId={customerId} policies={linkedPolicies ?? []} />}
        {activeTab === "renewal" && <RenewalRiskTab customerId={customerId} policies={linkedPolicies ?? []} />}
        {activeTab === "service" && <ServiceIssuesTab customerId={customerId} />}
        {activeTab === "insurer" && <InsurerRelationsTab policies={linkedPolicies ?? []} />}
        {activeTab === "actions" && (
          <QuickActionsTab
            customer={customer}
            onCreatePolicy={() => router.push(`/dashboard/intake?customer=${customerId}`)}
            onCreateTicket={() => router.push(`/dashboard/service-desk/new?customer=${customerId}`)}
            onUploadDoc={() => setKycUploadOpen(true)}
            onEdit={() => setFormOpen(true)}
          />
        )}
      </div>

      {/* KYC Upload Dialog */}
      <KYCUploadDialog
        open={kycUploadOpen}
        onOpenChange={setKycUploadOpen}
        customerId={customerId}
        customerName={customer.name}
        onSuccess={() => mutateKYC()}
      />

      {/* Edit dialog */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={customer}
        onSuccess={() => setFormOpen(false)}
      />

      {/* Deactivate confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">Deactivate Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate <strong>{customer.name}</strong> ({customer.uid})?
              This will cancel active policies, pending premiums, commissions, and renewals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
