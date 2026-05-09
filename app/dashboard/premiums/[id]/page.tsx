"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  Hash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
  PremiumStatusBadge,
} from "@/components/premiums/premium-actions";
import { usePremium, invalidatePremiums } from "@/lib/hooks/use-premiums";
import { premiumService } from "@/lib/services/premium.service";
import { policyService } from "@/lib/services/policy.service";
import { auditLogService } from "@/lib/services/audit-log.service";


import { useAuth } from "@/lib/context/auth-context";
import { friendlyError } from "@/lib/helpers/friendly-error";
import { PREMIUM_STATUSES } from "@/lib/validations/premium";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import type { Policy, PremiumStatus } from "@/lib/types";

export default function PremiumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, role } = useAuth();

  // All hooks must be before any conditional return (Rules of Hooks)
  const { data: premium, isLoading } = usePremium(id);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [status, setStatus] = useState<PremiumStatus>("pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load linked policy
  useEffect(() => {
    if (premium?.policy_id) {
      policyService.getById(premium.policy_id).then(setPolicy).catch(() => {});
      setStatus(premium.status);
      setNotes(premium.notes || "");
    }
  }, [premium]);

  // Role guard — after all hooks
  if (role === "employee") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin or Manager access required</p>
        <Button
          variant="outline"
          className="mt-4 border-border/80 bg-background/80 text-foreground"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!premium) return;
    setSaving(true);
    try {
      await premiumService.updateStatus(premium.id, status, notes || undefined);
      toast.success(`Premium updated to ${status}`);
      invalidatePremiums();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "update", "premiums",
          `Updated premium ${premium.id} status to ${status}`
        ).catch(() => {});
      }
    } catch (err) {
      console.error("Premium update failed:", err);
      toast.error(friendlyError(err, "Failed to update premium"));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-8 w-48 bg-secondary" />
        <Skeleton className="h-64 w-full bg-secondary" />
      </div>
    );
  }

  if (!premium) {
    return (
      <div className="text-center py-20">
        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Premium record not found</p>
        <Button
          variant="outline"
          className="mt-4 border-border/80 bg-background/80 text-foreground"
          onClick={() => router.push("/dashboard/premiums")}
        >
          Back to Premiums
        </Button>
      </div>
    );
  }

  const isTerminal = premium.status === "collected";
  const collectedLabel = premium.collected_date
    ? new Date(premium.collected_date).toLocaleDateString("en-IN")
    : "-";
  const policyLabel = policy?.policy_number || premium.policy_number || premium.policy_id || "-";
  const statusLabel = PREMIUM_STATUSES.find((s) => s.value === premium.status)?.label || premium.status;

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/premiums")}
              className="border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/60"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Premiums
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Collection record
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Premium Detail
            </h1>
            <p className="text-sm text-muted-foreground">{premium.period}</p>
          </div>
          <PremiumStatusBadge status={premium.status} />
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            icon: Hash,
            label: "Record ID",
            value: premium.id.slice(0, 8),
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: DollarSign,
            label: "Amount",
            value: formatCurrency(premium.amount ?? 0),
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: FileText,
            label: "Policy",
            value: policyLabel,
            panel: "border-indigo-500/30 bg-indigo-500/10",
            text: "text-indigo-700 dark:text-indigo-300",
          },
          {
            icon: Clock,
            label: "Collected",
            value: premium.status === "collected" ? collectedLabel : statusLabel,
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <Card className={item.panel}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`mt-1 truncate text-sm font-semibold tracking-tight sm:text-base ${item.text}`}>
                      {item.value}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                    <item.icon className={`h-4 w-4 ${item.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Premium Details */}
        <motion.div variants={staggerItem} className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
            <CardHeader>
              <CardTitle className="text-foreground text-base font-heading">
                Premium Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-foreground font-medium">
                    {premium.period}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-primary font-bold text-lg">
                    {formatCurrency(premium.amount ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <PremiumStatusBadge status={premium.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collected Date</p>
                  <p className="text-foreground">
                    {collectedLabel}
                  </p>
                </div>
                {premium.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-foreground text-sm">{premium.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linked Policy */}
          {policy && (
            <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
              <CardHeader>
                <CardTitle className="text-foreground text-base flex items-center gap-2 font-heading">
                  <FileText className="h-4 w-4 text-primary" />
                  Linked Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Policy Number</p>
                    <p className="text-foreground font-mono text-sm">
                      {policy.policy_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-foreground">{policy.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-foreground capitalize">
                      {policy.policy_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Premium</p>
                    <p className="text-foreground">
                      {formatCurrency(policy.premium_amount ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Insurer</p>
                    <p className="text-foreground">
                      {policy.insurer_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="text-foreground capitalize">
                      {policy.payment_frequency || "Annual"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-border/80 bg-background/80 text-primary"
                  onClick={() =>
                    router.push(`/dashboard/policies/${policy.id}`)
                  }
                >
                  View Full Policy
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Right: Status Update */}
        <motion.div variants={staggerItem}>
          {!isTerminal ? (
            <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
              <CardHeader>
                <CardTitle className="text-foreground text-base font-heading">
                  Update Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as PremiumStatus)}
                  >
                    <SelectTrigger className="border-border/80 bg-background/80 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover">
                      {PREMIUM_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span style={{ color: s.color }}>{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="min-h-25 border-border/80 bg-background/80 text-foreground"
                    maxLength={500}
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-700 dark:text-emerald-300 mx-auto mb-3" />
                <p className="text-foreground font-medium">
                  Premium Collected
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {premium.collected_date
                    ? `On ${new Date(premium.collected_date).toLocaleDateString("en-IN")}`
                    : "Date not recorded"}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
