"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  Calendar,
  IndianRupee,
  Building2,
  User,
  FileText,
  Lock,
  Unlock,
  Edit,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Car,
  Heart,
  Flame,
  Ship,
  HardHat,
  Briefcase,
  Archive,
  XCircle,
  Upload,
  FileCheck,
  LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { PolicyForm } from "@/components/policies/policy-form";
import { usePolicy } from "@/lib/hooks/use-policies";
import { usePolicyDocuments } from "@/lib/hooks/use-documents";
import { useCustomer } from "@/lib/hooks/use-customers";
import { policyService } from "@/lib/services/policy.service";
import { documentService } from "@/lib/services/document.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { PolicyMetadataView } from "@/components/policies/PolicyMetadataView";

import { invalidateArchives } from "@/lib/hooks/use-campaigns";
import { useStorageUrl } from "@/lib/hooks/use-storage-url";
import { friendlyError } from "@/lib/helpers/friendly-error";
import { formatCurrency, formatCurrencyLabel } from "@/lib/utils";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import type { Policy } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  archived: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
};

export default function PolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const policyId = params.id as string;

  const { data: policy, isLoading, error, mutate } = usePolicy(policyId);
  const { data: customer } = useCustomer(policy?.customer_id || "");
  const { data: documents, isLoading: documentsLoading } = usePolicyDocuments(policyId);
  const { url: pdfSignedUrl } = useStorageUrl(policy?.pdf_url ?? null);

  const [showEdit, setShowEdit] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isEmployee = user?.role === "employee";
  const isAssigned = policy?.assigned_to === user?.uid;

  function formatDate(timestamp: string | Date | null | undefined): string {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  function getDaysUntilExpiry(policy: Policy): number | null {
    if (!policy.end_date) return null;
    try {
      const endMs = new Date(policy.end_date as string).getTime();
      return Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleSaveRemark() {
    if (!policy?.id || !user || !remark.trim()) return;
    setIsSavingRemark(true);
    try {
      await policyService.updateRemark(policy.id, remark.trim(), user.uid);
      toast.success("Remark saved");
      mutate();
      setRemark("");
      auditLogService.logAction(
        user.uid, user.name || "", "update", "policies",
        `Added remark on policy ${policy.id}`
      ).catch(() => {});
    } catch (err: unknown) {
      toast.error(friendlyError(err instanceof Error ? err : new Error(String(err)), "Failed to save remark"));
    } finally {
      setIsSavingRemark(false);
    }
  }

  async function handleToggleLock() {
    if (!policy?.id || !user) return;
    setIsLocking(true);
    try {
      if (policy.lockedForEmployee) {
        await policyService.unlockForEmployee(policy.id);
        toast.success("Policy unlocked for employee");
      } else {
        await policyService.lockForEmployee(policy.id);
        toast.success("Policy locked for employee editing");
      }
      mutate();
      auditLogService.logAction(
        user.uid, user.name || "", "update", "policies",
        `${policy.lockedForEmployee ? "Unlocked" : "Locked"} policy ${policy.id}`
      ).catch(() => {});
    } catch (err: unknown) {
      toast.error(friendlyError(err instanceof Error ? err : new Error(String(err)), "Failed to toggle lock"));
    } finally {
      setIsLocking(false);
    }
  }

  async function handleStatusChange(newStatus: "archived" | "cancelled") {
    if (!policy?.id || !user) return;
    setIsChangingStatus(true);
    try {
      await policyService.update(policy.id, { status: newStatus });
      toast.success(
        newStatus === "archived"
          ? "Policy archived successfully"
          : "Policy cancelled successfully"
      );
      mutate();
      invalidateArchives();
      auditLogService
        .logAction(
          user.uid,
          user.name || "",
          "update",
          "policies",
          `Changed policy ${policy.policy_number} status to ${newStatus}`
        )
        .catch(() => {});
    } catch (err: unknown) {
      toast.error(friendlyError(err instanceof Error ? err : new Error(String(err)), `Failed to ${newStatus === "archived" ? "archive" : "cancel"} policy`));
    } finally {
      setIsChangingStatus(false);
      setArchiveDialog(false);
      setCancelDialog(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  // Not found
  if (error || !policy) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-bold">Policy not found</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard/policies")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
        </Button>
      </div>
    );
  }

  const daysLeft = getDaysUntilExpiry(policy);

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/policies")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-foreground">
                {policy.policy_number}
              </h1>
              <button
                onClick={() => copyToClipboard(policy.policy_number, "pn")}
                className="rounded p-1 transition-colors hover:bg-muted-foreground/20"
              >
                {copiedField === "pn" ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs capitalize">
                {policy.policy_type}
              </Badge>
              <Badge
                className={`text-xs capitalize ${
                  STATUS_COLORS[policy.status] || ""
                }`}
              >
                {policy.status}
              </Badge>
              {daysLeft !== null && policy.status === "active" && (
                <span
                  className={`text-xs ${
                    daysLeft <= 0
                      ? "text-red-400"
                      : daysLeft <= settings.policy_expiry_warning_days
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {daysLeft <= 0
                    ? "Expired"
                    : `${daysLeft} days left`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Lock/Unlock — Admin only */}
          {isAdminOrManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              disabled={isLocking}
              className="flex items-center gap-1.5"
            >
              {policy.lockedForEmployee ? (
                <><Unlock className="h-4 w-4" /> Unlock</>
              ) : (
                <><Lock className="h-4 w-4" /> Lock</>
              )}
            </Button>
          )}

          {/* Edit — Admin/Manager only */}
          {isAdminOrManager && (
            <Button
              size="sm"
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Edit className="h-4 w-4" /> Edit
            </Button>
          )}

          {/* More Actions — Archive / Cancel (Admin/Manager, active policies only) */}
          {isAdminOrManager && policy.status === "active" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setArchiveDialog(true)}
                  className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Archive Policy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelDialog(true)}
                  className="flex items-center gap-2 text-red-400 focus:text-red-400 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Policy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4 pt-4">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Policy Details Card */}
            <motion.div variants={staggerItem} className="sm:col-span-2 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-primary" />
                    Policy Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={Shield} label="Policy Number" value={policy.policy_number} />
                    <InfoRow icon={Shield} label="Policy Type" value={policy.policy_type} capitalize />
                    <InfoRow icon={Calendar} label="Start Date" value={formatDate(policy.start_date)} />
                    <InfoRow icon={Calendar} label="End Date" value={formatDate(policy.end_date)} />
                    <InfoRow icon={IndianRupee} label="Premium" value={formatCurrency(policy.premium_amount)} ariaLabel={formatCurrencyLabel(policy.premium_amount)} />
                    <InfoRow icon={IndianRupee} label="Sum Insured" value={policy.sum_insured ? formatCurrency(policy.sum_insured) : "—"} ariaLabel={policy.sum_insured ? formatCurrencyLabel(policy.sum_insured) : undefined} />
                    <InfoRow icon={Building2} label="Insurer" value={policy.insurer_name || "—"} />
                    <InfoRow icon={Clock} label="Payment Frequency" value={policy.payment_frequency || "—"} capitalize />
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Operational Depth */}
              <PolicyMetadataView policy={policy} />
            </motion.div>

            {/* Assigned Employee Card */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-primary" />
                    Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="font-medium">
                      {policy.assigned_to_name || policy.assigned_to}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lock Status</p>
                    <div className="flex items-center gap-1.5">
                      {policy.lockedForEmployee ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Unlock className="h-3 w-3" /> Unlocked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Verified</p>
                    <p className="text-sm">
                      {policy.verification_confirmed ? "Yes ✓" : "No"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Remark Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Remarks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {policy.remark && (
                <div className="rounded-md border border-muted-foreground/20 bg-card p-3">
                  <p className="text-sm">{policy.remark}</p>
                  {policy.remark_updated_by && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated by {policy.remark_updated_by} •{" "}
                      {formatDate(policy.remark_updated_at)}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Add a remark..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleSaveRemark}
                  disabled={!remark.trim() || isSavingRemark}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSavingRemark ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={User} label="Name" value={customer.name} />
                  <InfoRow icon={Shield} label="Customer UID" value={customer.uid} />
                  <InfoRow icon={Phone} label="Phone" value={customer.phone || "—"} />
                  <InfoRow icon={Mail} label="Email" value={customer.email || "—"} />
                  <InfoRow icon={MapPin} label="City" value={customer.city || "—"} />
                  <InfoRow icon={MapPin} label="State" value={customer.state || "—"} />
                  {customer.address && (
                    <div className="sm:col-span-2">
                      <InfoRow icon={MapPin} label="Address" value={customer.address} />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/dashboard/customers/${customer.id}`)
                      }
                    >
                      View Full Profile →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <p className="font-medium">{policy.customer_name}</p>
                  <p className="mt-1">Customer ID: {policy.customer_id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Policy Assets
              </CardTitle>
              <Button size="sm" variant="outline" className="h-8 gap-2 text-xs" onClick={() => toast.info("Deep-field document upload coming in Phase 4")}>
                <Upload className="h-3 w-3" /> Upload New
              </Button>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                           <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[200px]">{doc.file_name}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">{doc.document_type || "General Asset"}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/10">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          Open File
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : policy.pdf_url ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                   <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-bold">Policy Copy (Main)</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase">Source: OCR Intake Desk</p>
                      </div>
                   </div>
                   <Button size="sm" asChild className="h-8 text-xs font-bold uppercase">
                     <a href={policy.pdf_url} target="_blank" rel="noopener noreferrer">
                       View PDF
                     </a>
                   </Button>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/60 rounded-xl">
                  <Upload className="h-8 w-8 text-muted-foreground opacity-20" />
                  <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    No documents indexed for this policy
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  title="Policy Created"
                  date={formatDate(policy.createdAt)}
                  description={`Created by ${policy.created_by}`}
                />
                {policy.verification_confirmed && (
                  <TimelineItem
                    title="Verification Confirmed"
                    date="—"
                    description="Employee verified all policy details"
                  />
                )}
                {policy.remark && (
                  <TimelineItem
                    title="Remark Added"
                    date={formatDate(policy.remark_updated_at)}
                    description={policy.remark}
                  />
                )}
                {policy.status !== "active" && (
                  <TimelineItem
                    title={`Status: ${policy.status}`}
                    date={formatDate(policy.updatedAt)}
                    description={`Policy marked as ${policy.status}`}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <PolicyForm
        open={showEdit}
        onOpenChange={setShowEdit}
        editPolicy={policy}
        onSuccess={() => mutate()}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialog} onOpenChange={setArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive policy{" "}
              <strong>{policy.policy_number}</strong>? The policy will be moved
              to Archives and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleStatusChange("archived")}
              disabled={isChangingStatus}
            >
              {isChangingStatus ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel policy{" "}
              <strong>{policy.policy_number}</strong>? This will also cancel any
              pending commissions linked to this policy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleStatusChange("cancelled")}
              disabled={isChangingStatus}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isChangingStatus ? "Cancelling..." : "Cancel Policy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ---- Sub-components ----

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize,
  ariaLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  capitalize?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${capitalize ? "capitalize" : ""}`} aria-label={ariaLabel}>
          {value}
        </p>
      </div>
    </div>
  );
}

function TimelineItem({
  title,
  date,
  description,
}: {
  title: string;
  date: string;
  description: string;
}) {
  return (
    <div className="relative flex gap-3 pl-4">
      <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
      <div className="absolute left-[3px] top-4 h-full w-0.5 bg-muted-foreground/20" />
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{title}</p>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
