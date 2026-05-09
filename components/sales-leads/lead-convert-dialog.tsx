"use client";

import { useState } from "react";
import { Loader2, UserPlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { convertLead } from "@/lib/services/lead.service";
import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { useAuth } from "@/lib/context/auth-context";
import { invalidateLeads } from "@/lib/hooks/use-leads";
import { invalidateCustomers } from "@/lib/hooks/use-customers";
import { SalesLead } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LeadConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: SalesLead;
  onSuccess?: () => void;
}

export function LeadConvertDialog({ open, onOpenChange, lead, onSuccess }: LeadConvertDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ customerId: string; customerUid: string } | null>(null);

  const handleConvert = async () => {
    if (!user) return;
    setConverting(true);

    try {
      // 1. Create customer from lead data
      const customer = await customerService.create(
        {
          name: lead.customer_name,
          email: lead.email || "N/A",
          phone: lead.mobile,
          type: lead.client_type || "individual",
          created_by: user.id,
        },
        user.id
      );

      // 2. Mark lead as converted
      await convertLead(lead.id, customer.id, user.id, user.name);

      // 3. Audit log
      await auditLogService.logAction(
        user.id,
        user.name,
        "update",
        "sales-leads",
        `Converted lead ${lead.lead_number} to customer ${customer.uid}`
      );

      setResult({ customerId: customer.id, customerUid: customer.uid });
      toast.success(`Lead converted to customer ${customer.uid}`);
      invalidateLeads();
      invalidateCustomers();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to convert lead";
      toast.error(msg);
    } finally {
      setConverting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-cabin uppercase tracking-wider">
            Convert Lead to Customer
          </DialogTitle>
          <DialogDescription>
            This will create a new customer record from the lead data.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* Success state */
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
              <p className="text-emerald-500 font-medium">Customer Created</p>
              <p className="text-2xl font-mono font-bold text-emerald-500 mt-1">
                {result.customerUid}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Done</Button>
              <Button
                onClick={() => {
                  handleClose();
                  router.push(`/dashboard/customers/${result.customerId}`);
                }}
                className="gap-2"
              >
                View Customer <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation state */
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-cabin">
                Data to transfer
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="text-foreground font-medium">{lead.customer_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mobile:</span>{" "}
                  <span className="text-foreground">{lead.mobile}</span>
                </div>
                {lead.email && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="text-foreground">{lead.email}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              The lead status will be changed to &ldquo;Converted&rdquo; and a link to the
              customer record will be saved.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={handleClose} disabled={converting}>
                Cancel
              </Button>
              <Button onClick={handleConvert} disabled={converting} className="gap-2">
                {converting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {converting ? "Converting..." : "Convert to Customer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
